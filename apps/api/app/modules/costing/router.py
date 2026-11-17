"""Costing routes — deterministic cost calculation."""

from fastapi import APIRouter, status
from app.core.dependencies import SupabaseClient, CurrentToken, success_response
from app.core.errors import AshaAPIError
from app.modules.shg.router import _get_user_shg_id, _require_role
from app.modules.orders.service import get_order_or_404, _record_audit
from app.rules.costing import calculate_cost_sheet, CostComponentInput
from pydantic import BaseModel, field_validator
from typing import Literal


router = APIRouter(tags=["costing"])


class CostComponentRequest(BaseModel):
    component_type: Literal["MATERIAL", "LABOUR", "PACKAGING", "TRANSPORT", "UTILITIES", "OTHER_OVERHEAD"]
    label: str
    calculation_basis: Literal["PER_UNIT", "PER_BATCH", "PER_HOUR", "PERCENTAGE", "FIXED"]
    rate: float
    quantity: float = 1.0

    @field_validator("rate")
    @classmethod
    def rate_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Rate cannot be negative")
        return v


class CreateCostSheetRequest(BaseModel):
    order_item_id: str | None = None
    quantity: int
    components: list[CostComponentRequest]
    margin_type: Literal["PERCENTAGE", "FIXED_PER_UNIT", "MANUAL"] = "PERCENTAGE"
    margin_value: float = 20.0

    @field_validator("quantity")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be greater than zero")
        return v

    @field_validator("margin_value")
    @classmethod
    def margin_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Margin value cannot be negative")
        return v


@router.get("/orders/{order_id}/cost-sheet")
async def get_cost_sheet(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Get the current cost sheet for an order."""
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    result = db.table("cost_sheets").select("*, cost_components(*)") \
        .eq("order_id", order_id).is_("deleted_at", "null") \
        .order("version", desc=True).limit(1).execute()

    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="No cost sheet found", status_code=404)
    return success_response(result.data[0])


@router.post("/orders/{order_id}/cost-sheet", status_code=status.HTTP_201_CREATED)
async def create_cost_sheet(order_id: str, body: CreateCostSheetRequest, token: CurrentToken, db: SupabaseClient):
    """Leader creates a cost sheet and calculates costs deterministically."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    # Get SHG minimum margin
    shg = db.table("shgs").select("minimum_margin_percent").eq("id", shg_id).single().execute()
    min_margin = float(shg.data.get("minimum_margin_percent") or 0)

    # Run deterministic calculation
    comp_inputs = [
        CostComponentInput(
            component_type=c.component_type,
            label=c.label,
            calculation_basis=c.calculation_basis,
            rate=c.rate,
            quantity=c.quantity,
        )
        for c in body.components
    ]
    result = calculate_cost_sheet(
        quantity=body.quantity,
        components=comp_inputs,
        margin_type=body.margin_type,
        margin_value=body.margin_value,
        minimum_margin_percent=min_margin,
    )

    # Get current max version
    existing = db.table("cost_sheets").select("version").eq("order_id", order_id).is_("deleted_at", "null") \
        .order("version", desc=True).limit(1).execute()
    version = (existing.data[0]["version"] + 1) if existing.data else 1

    # Save cost sheet
    sheet = db.table("cost_sheets").insert({
        "order_id": order_id,
        "order_item_id": body.order_item_id,
        "version": version,
        "quantity": result.quantity,
        "material_cost": result.material_cost,
        "labour_cost": result.labour_cost,
        "overhead_cost": result.overhead_cost,
        "total_cost": result.total_cost,
        "unit_cost": result.unit_cost,
        "margin_type": result.margin_type,
        "margin_value": result.margin_value,
        "margin_amount": result.margin_amount,
        "selling_price_per_unit": result.selling_price_per_unit,
        "total_selling_price": result.total_selling_price,
        "pricing_warning": result.pricing_warning,
        "created_by": token.sub,
    }).execute()
    sheet_id = sheet.data[0]["id"]

    # Save components
    comp_data = [
        {
            "cost_sheet_id": sheet_id,
            "component_type": c.component_type,
            "label": c.label,
            "calculation_basis": c.calculation_basis,
            "rate": c.rate,
            "quantity": c.quantity,
            "amount": c.amount,
        }
        for c in result.components
    ]
    if comp_data:
        db.table("cost_components").insert(comp_data).execute()

    _record_audit(
        db=db, shg_id=shg_id, order_id=order_id, actor_id=token.sub,
        event_type="COST_SHEET_CREATED", entity_type="cost_sheet", entity_id=sheet_id,
        new_values={"total_cost": result.total_cost, "selling_price": result.selling_price_per_unit},
    )

    full_sheet = db.table("cost_sheets").select("*, cost_components(*)").eq("id", sheet_id).single().execute()
    return success_response(full_sheet.data)


@router.patch("/orders/{order_id}/cost-sheet/{cost_sheet_id}/recalculate")
async def recalculate_cost_sheet(
    order_id: str, cost_sheet_id: str,
    body: CreateCostSheetRequest,
    token: CurrentToken, db: SupabaseClient
):
    """Leader updates cost inputs and recalculates."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    shg = db.table("shgs").select("minimum_margin_percent").eq("id", shg_id).single().execute()
    min_margin = float(shg.data.get("minimum_margin_percent") or 0)

    comp_inputs = [
        CostComponentInput(
            component_type=c.component_type, label=c.label,
            calculation_basis=c.calculation_basis, rate=c.rate, quantity=c.quantity,
        )
        for c in body.components
    ]
    result = calculate_cost_sheet(
        quantity=body.quantity, components=comp_inputs,
        margin_type=body.margin_type, margin_value=body.margin_value,
        minimum_margin_percent=min_margin,
    )

    db.table("cost_sheets").update({
        "quantity": result.quantity,
        "material_cost": result.material_cost,
        "labour_cost": result.labour_cost,
        "overhead_cost": result.overhead_cost,
        "total_cost": result.total_cost,
        "unit_cost": result.unit_cost,
        "margin_type": result.margin_type,
        "margin_value": result.margin_value,
        "margin_amount": result.margin_amount,
        "selling_price_per_unit": result.selling_price_per_unit,
        "total_selling_price": result.total_selling_price,
        "pricing_warning": result.pricing_warning,
    }).eq("id", cost_sheet_id).execute()

    # Rebuild components
    db.table("cost_components").delete().eq("cost_sheet_id", cost_sheet_id).execute()
    comp_data = [
        {"cost_sheet_id": cost_sheet_id, "component_type": c.component_type,
         "label": c.label, "calculation_basis": c.calculation_basis,
         "rate": c.rate, "quantity": c.quantity, "amount": c.amount}
        for c in result.components
    ]
    if comp_data:
        db.table("cost_components").insert(comp_data).execute()

    full_sheet = db.table("cost_sheets").select("*, cost_components(*)").eq("id", cost_sheet_id).single().execute()
    return success_response(full_sheet.data)


@router.get("/orders/{order_id}/cost-sheet/{cost_sheet_id}/warnings")
async def get_pricing_warnings(order_id: str, cost_sheet_id: str, token: CurrentToken, db: SupabaseClient):
    """Get pricing warnings for a cost sheet."""
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)
    result = db.table("cost_sheets").select("pricing_warning, unit_cost, selling_price_per_unit") \
        .eq("id", cost_sheet_id).single().execute()
    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Cost sheet not found", status_code=404)
    return success_response(result.data)
