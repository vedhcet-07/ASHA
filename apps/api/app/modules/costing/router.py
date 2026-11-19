from fastapi import APIRouter, Depends
from app.core.security import verify_token, require_role
from app.modules.costing.schemas import CreateCostSheetRequest
from app.modules.costing.service import get_order_cost_sheet, calculate_or_save_cost_sheet
from app.core.errors import NotFoundError
from app.modules.audit.service import create_audit_event
from app.modules.audit.schemas import AuditEventCreate

router = APIRouter(prefix="/orders", tags=["Costing"])

@router.get("/{order_id}/cost-sheet")
def read_cost_sheet(order_id: str, user=Depends(verify_token)):
    sheet = get_order_cost_sheet(order_id)
    if not sheet:
        sheet = calculate_or_save_cost_sheet(order_id, {"quantity": 100, "components": []})
    return {"success": True, "data": sheet}

@router.post("/{order_id}/cost-sheet")
def save_cost_sheet(order_id: str, req: CreateCostSheetRequest, user=Depends(require_role("leader"))):
    sheet = calculate_or_save_cost_sheet(order_id, req.model_dump())
    create_audit_event(AuditEventCreate(
        order_id=order_id,
        event_type="COST_SHEET_UPDATED",
        entity_type="cost_sheet",
        entity_id=sheet["id"],
        new_values={"total_selling_price": sheet["total_selling_price"], "unit_cost": sheet["unit_cost"]}
    ))
    return {"success": True, "data": sheet}
