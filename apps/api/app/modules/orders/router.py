"""Order and buyer routes."""

from fastapi import APIRouter, status
from app.core.dependencies import SupabaseClient, CurrentToken, success_response
from app.core.errors import AshaAPIError
from app.modules.shg.router import _get_user_shg_id, _require_role
from .schemas import (
    CreateOrderRequest,
    UpdateOrderRequest,
    RejectOrderRequest,
    CreateBuyerRequest,
)
from .service import (
    generate_order_number,
    get_order_or_404,
    transition_order_status,
    get_buyer_or_create,
    get_order_timeline,
    _record_audit,
)

router = APIRouter(tags=["orders"])


# ─────────────────────────────────────
# Buyer endpoints
# ─────────────────────────────────────

@router.post("/buyers/register", status_code=status.HTTP_201_CREATED)
async def register_buyer(body: CreateBuyerRequest, token: CurrentToken, db: SupabaseClient):
    """Create or fetch a buyer profile linked to the current user."""
    result = db.table("buyers").upsert(
        {"profile_id": token.sub, **body.model_dump(exclude_none=True)},
        on_conflict="profile_id",
    ).execute()
    return success_response(result.data[0])


@router.post("/buyers/orders", status_code=status.HTTP_201_CREATED)
async def buyer_create_order(body: CreateOrderRequest, token: CurrentToken, db: SupabaseClient):
    """Buyer submits a new order request to the default SHG."""
    # Resolve or create buyer record
    profile = db.table("profiles").select("full_name").eq("id", token.sub).single().execute()
    buyer_name = profile.data["full_name"] if profile.data else "Buyer"
    buyer = get_buyer_or_create(token.sub, buyer_name, db)

    # Get the first available SHG (for MVP — one SHG)
    shg_result = db.table("shgs").select("id").is_("deleted_at", "null").limit(1).execute()
    if not shg_result.data:
        raise AshaAPIError(code="NOT_FOUND", message="No SHG found", status_code=404)
    shg_id = shg_result.data[0]["id"]

    # Create order
    order_data = {
        "shg_id": shg_id,
        "buyer_id": buyer["id"],
        "order_number": generate_order_number(),
        "title": body.title,
        "description": body.description,
        "required_by_date": body.required_by_date,
        "delivery_address": body.delivery_address,
        "special_instructions": body.special_instructions,
        "status": "REQUESTED",
        "created_by": token.sub,
    }
    order_result = db.table("orders").insert(order_data).execute()
    order = order_result.data[0]
    order_id = order["id"]

    # Create order items
    items_data = [
        {**item.model_dump(), "order_id": order_id}
        for item in body.items
    ]
    items_result = db.table("order_items").insert(items_data).execute()
    order["items"] = items_result.data

    # Audit
    _record_audit(
        db=db, shg_id=shg_id, order_id=order_id, actor_id=token.sub,
        event_type="ORDER_CREATED", entity_type="order", entity_id=order_id,
        new_values={"status": "REQUESTED", "title": body.title},
    )

    return success_response(order)


@router.get("/buyers/orders")
async def buyer_list_orders(token: CurrentToken, db: SupabaseClient):
    """Buyer lists their own orders."""
    buyer_result = db.table("buyers").select("id").eq("profile_id", token.sub).execute()
    if not buyer_result.data:
        return success_response([])

    buyer_ids = [b["id"] for b in buyer_result.data]
    result = (
        db.table("orders")
        .select("*, order_items(*)")
        .in_("buyer_id", buyer_ids)
        .is_("deleted_at", "null")
        .order("created_at", desc=True)
        .execute()
    )
    return success_response(result.data)


@router.get("/buyers/orders/{order_id}")
async def buyer_get_order(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Buyer gets safe view of their own order (no internal member/cost data)."""
    buyer_result = db.table("buyers").select("id").eq("profile_id", token.sub).execute()
    if not buyer_result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Order not found", status_code=404)

    buyer_ids = [b["id"] for b in buyer_result.data]
    result = (
        db.table("orders")
        .select("*, order_items(*)")
        .eq("id", order_id)
        .in_("buyer_id", buyer_ids)
        .is_("deleted_at", "null")
        .single()
        .execute()
    )
    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Order not found", status_code=404)

    # Strip internal fields
    order = result.data
    order.pop("rejection_reason", None)
    return success_response(order)


@router.get("/buyers/orders/{order_id}/status")
async def buyer_order_status(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Buyer gets public-safe order status and timeline."""
    buyer_result = db.table("buyers").select("id").eq("profile_id", token.sub).execute()
    if not buyer_result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Order not found", status_code=404)

    buyer_ids = [b["id"] for b in buyer_result.data]
    result = (
        db.table("orders")
        .select("id, order_number, title, status, required_by_date, created_at, order_items(product_name, quantity, unit_type)")
        .eq("id", order_id)
        .in_("buyer_id", buyer_ids)
        .single()
        .execute()
    )
    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Order not found", status_code=404)

    return success_response(result.data)


# ─────────────────────────────────────
# Leader order endpoints
# ─────────────────────────────────────

@router.get("/orders")
async def list_orders(token: CurrentToken, db: SupabaseClient):
    """Leader lists all orders for their SHG."""
    shg_id = _get_user_shg_id(token.sub, db)
    result = (
        db.table("orders")
        .select("*, order_items(*), buyers(buyer_name, organization_name)")
        .eq("shg_id", shg_id)
        .is_("deleted_at", "null")
        .order("created_at", desc=True)
        .execute()
    )
    return success_response(result.data)


@router.post("/orders", status_code=status.HTTP_201_CREATED)
async def leader_create_order(body: CreateOrderRequest, token: CurrentToken, db: SupabaseClient):
    """Leader creates an order manually (without a buyer request)."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)

    # Use a default internal buyer
    buyer = get_buyer_or_create(token.sub, "Internal Order", db)

    order_data = {
        "shg_id": shg_id,
        "buyer_id": buyer["id"],
        "order_number": generate_order_number(),
        "title": body.title,
        "description": body.description,
        "required_by_date": body.required_by_date,
        "delivery_address": body.delivery_address,
        "special_instructions": body.special_instructions,
        "status": "REVIEWED",   # Leader-created orders skip REQUESTED
        "created_by": token.sub,
    }
    order_result = db.table("orders").insert(order_data).execute()
    order = order_result.data[0]
    order_id = order["id"]

    items_data = [
        {**item.model_dump(), "order_id": order_id}
        for item in body.items
    ]
    items_result = db.table("order_items").insert(items_data).execute()
    order["items"] = items_result.data

    _record_audit(
        db=db, shg_id=shg_id, order_id=order_id, actor_id=token.sub,
        event_type="ORDER_CREATED_BY_LEADER", entity_type="order", entity_id=order_id,
        new_values={"status": "REVIEWED", "title": body.title},
    )

    return success_response(order)


@router.get("/orders/{order_id}")
async def get_order(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Get full order details (leader/checker/approver)."""
    shg_id = _get_user_shg_id(token.sub, db)
    order = get_order_or_404(order_id, shg_id, db)
    return success_response(order)


@router.patch("/orders/{order_id}")
async def update_order(order_id: str, body: UpdateOrderRequest, token: CurrentToken, db: SupabaseClient):
    """Leader updates order details."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)  # verify exists

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise AshaAPIError(code="VALIDATION_ERROR", message="Nothing to update")

    result = db.table("orders").update(updates).eq("id", order_id).eq("shg_id", shg_id).single().execute()
    return success_response(result.data)


@router.post("/orders/{order_id}/accept")
async def accept_order(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Leader accepts a buyer order request."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    order = transition_order_status(order_id, shg_id, "REVIEWED", token.sub, db)
    return success_response(order)


@router.post("/orders/{order_id}/reject")
async def reject_order(order_id: str, body: RejectOrderRequest, token: CurrentToken, db: SupabaseClient):
    """Leader rejects a buyer order request."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    order = transition_order_status(
        order_id, shg_id, "CANCELLED", token.sub, db, reason=body.reason
    )
    return success_response(order)


@router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Leader cancels an order."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    order = transition_order_status(order_id, shg_id, "CANCELLED", token.sub, db)
    return success_response(order)


@router.post("/orders/{order_id}/deliver")
async def mark_delivered(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Leader marks an order as delivered."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    order = transition_order_status(order_id, shg_id, "DELIVERED", token.sub, db)
    return success_response(order)


@router.get("/orders/{order_id}/timeline")
async def get_timeline(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Get the audit-based status timeline for an order."""
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)  # verify access
    timeline = get_order_timeline(order_id, shg_id, db)
    return success_response(timeline)


@router.get("/orders/{order_id}/audit")
async def get_audit(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Get the full audit trail for an order."""
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)
    result = (
        db.table("audit_events")
        .select("*")
        .eq("order_id", order_id)
        .order("created_at", desc=False)
        .execute()
    )
    return success_response(result.data)
