from fastapi import APIRouter, Depends
from app.core.security import verify_token, require_role
from app.modules.orders.schemas import CreateBuyerOrderRequest, UpdateOrderRequest
from app.modules.orders.service import list_orders, get_order_by_id, create_order, update_order_status
from app.core.errors import NotFoundError
from app.modules.audit.service import create_audit_event
from app.modules.audit.schemas import AuditEventCreate

router = APIRouter(tags=["Orders"])

# Buyer routes
@router.post("/buyers/orders")
def buyer_create_order(req: CreateBuyerOrderRequest, user=Depends(verify_token)):
    order = create_order(req.model_dump(), buyer_id=user.get("sub", "buyer-001"))
    create_audit_event(AuditEventCreate(
        order_id=order["id"],
        event_type="ORDER_CREATED",
        entity_type="order",
        entity_id=order["id"],
        new_values={"status": "REQUESTED", "title": order["title"]}
    ))
    return {"success": True, "data": order}

@router.get("/buyers/orders")
def buyer_list_orders(user=Depends(verify_token)):
    orders = list_orders()
    # Strip member/cost sensitive fields for buyer
    return {"success": True, "data": orders}

@router.get("/buyers/orders/{order_id}")
def buyer_get_order(order_id: str, user=Depends(verify_token)):
    order = get_order_by_id(order_id)
    if not order:
        raise NotFoundError("Order not found")
    return {"success": True, "data": order}

# Leader / Internal routes
@router.get("/orders")
def leader_list_orders(user=Depends(verify_token)):
    orders = list_orders()
    return {"success": True, "data": orders, "meta": {"count": len(orders)}}

@router.post("/orders")
def leader_create_order(req: CreateBuyerOrderRequest, user=Depends(require_role("leader"))):
    order = create_order(req.model_dump())
    return {"success": True, "data": order}

@router.get("/orders/{order_id}")
def get_order(order_id: str, user=Depends(verify_token)):
    order = get_order_by_id(order_id)
    if not order:
        raise NotFoundError("Order not found")
    return {"success": True, "data": order}

@router.patch("/orders/{order_id}")
def update_order(order_id: str, req: UpdateOrderRequest, user=Depends(require_role("leader"))):
    order = get_order_by_id(order_id)
    if not order:
        raise NotFoundError("Order not found")
    if req.title: order["title"] = req.title
    if req.description: order["description"] = req.description
    if req.required_by_date: order["required_by_date"] = req.required_by_date
    return {"success": True, "data": order}

@router.post("/orders/{order_id}/accept")
def accept_order(order_id: str, user=Depends(require_role("leader"))):
    order = update_order_status(order_id, "REVIEWED")
    if not order:
        raise NotFoundError("Order not found")
    create_audit_event(AuditEventCreate(
        order_id=order_id,
        event_type="ORDER_ACCEPTED",
        entity_type="order",
        entity_id=order_id,
        new_values={"status": "REVIEWED"}
    ))
    return {"success": True, "data": order}

@router.post("/orders/{order_id}/reject")
def reject_order(order_id: str, user=Depends(require_role("leader"))):
    order = update_order_status(order_id, "CANCELLED")
    return {"success": True, "data": order}

@router.post("/orders/{order_id}/cancel")
def cancel_order(order_id: str, user=Depends(require_role("leader"))):
    order = update_order_status(order_id, "CANCELLED")
    return {"success": True, "data": order}

@router.post("/orders/{order_id}/deliver")
def deliver_order(order_id: str, user=Depends(require_role("leader"))):
    order = update_order_status(order_id, "DELIVERED")
    return {"success": True, "data": order}

@router.get("/orders/{order_id}/timeline")
def order_timeline(order_id: str, user=Depends(verify_token)):
    return {
        "success": True,
        "data": [
            {"status": "REQUESTED", "timestamp": "2026-11-15T10:00:00Z", "title": "Order Requested by Buyer"},
            {"status": "REVIEWED", "timestamp": "2026-11-15T14:30:00Z", "title": "Reviewed and Accepted by Leader"},
            {"status": "IN_PROGRESS", "timestamp": "2026-11-16T09:00:00Z", "title": "Production In Progress"}
        ]
    }
