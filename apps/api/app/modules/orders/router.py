"""FastAPI router for the Orders module.

Endpoints (all under the ``/api/v1`` prefix applied in ``main.py``):

Leader endpoints (task 2.3):
    GET    /orders                          — list all SHG orders with status (Req 4.1)
    GET    /orders/{order_id}               — full order details incl. items + timeline (Req 4.1)
    POST   /orders/{order_id}/accept        — transition REQUESTED → REVIEWED; audit event (Req 4.2)
    POST   /orders/{order_id}/reject        — REQUESTED → CANCELLED; require reason; audit event (Req 4.3)
    POST   /orders/{order_id}/cancel        — to CANCELLED; require reason; audit event (Req 4.7)

Buyer endpoint (task 2.1):
    POST   /orders                          — create a new buyer order, status=REQUESTED (Req 3.1)

Leader direct creation + edit (task 2.4):
    POST   /orders/leader                   — create order directly, status=REVIEWED (Req 4.4)
    PATCH  /orders/{order_id}               — edit in REQUESTED/REVIEWED (Req 4.5)

Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request, status
from supabase import Client

from app.core.dependencies import get_current_user, get_db, require_role
from app.core.schemas import SuccessResponse, success_response
from app.core.security import CurrentUser
from app.modules.orders import service
from app.modules.orders.schemas import (
    BuyerOrderCreate,
    LeaderOrderCreate,
    LeaderOrderUpdate,
    OrderAcceptRequest,
    OrderCancelRequest,
    OrderDetailResponse,
    OrderListItem,
    OrderRejectRequest,
    OrderResponse,
)

router = APIRouter(prefix="/orders")


# ---------------------------------------------------------------------------
# Buyer: create order
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=SuccessResponse[OrderResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a buyer order",
    description=(
        "Buyer submits an order request. The order is set to REQUESTED status "
        "and assigned a unique order number. "
        "The ``shg_id`` query parameter routes the order to the target SHG. "
        "Requirements: 3.1, 3.2, 3.3."
    ),
    tags=["orders-buyer"],
)
async def create_buyer_order(
    request_body: BuyerOrderCreate,
    req: Request,
    shg_id: str = Query(..., description="ID of the SHG this order is directed to"),
    user: CurrentUser = Depends(require_role("buyer")),
    db: Client = Depends(get_db),
) -> SuccessResponse[OrderResponse]:
    order = service.create_buyer_order(db, request_body, user, shg_id)
    return success_response(order, req)


# ---------------------------------------------------------------------------
# Leader: list all SHG orders
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=SuccessResponse[list[OrderListItem]],
    summary="List all SHG orders",
    description=(
        "Returns all orders for the Leader's SHG, sorted by creation date "
        "descending. Optionally filter by status. Requirement 4.1."
    ),
    tags=["orders-leader"],
)
async def list_orders(
    req: Request,
    status_filter: str | None = Query(
        default=None,
        alias="status",
        description="Optional order status filter, e.g. REQUESTED, REVIEWED",
    ),
    user: CurrentUser = Depends(require_role("leader")),
    db: Client = Depends(get_db),
) -> SuccessResponse[list[OrderListItem]]:
    orders = service.list_orders_for_leader(db, user, status_filter)
    return success_response(orders, req)


# ---------------------------------------------------------------------------
# Leader: direct order creation
# ---------------------------------------------------------------------------


@router.post(
    "/leader",
    response_model=SuccessResponse[OrderResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Leader creates an order directly",
    description=(
        "A Leader creates an order without a prior buyer request. "
        "The order is immediately set to REVIEWED status. "
        "Requirement 4.4."
    ),
    tags=["orders-leader"],
)
async def create_leader_order(
    request_body: LeaderOrderCreate,
    req: Request,
    user: CurrentUser = Depends(require_role("leader")),
    db: Client = Depends(get_db),
) -> SuccessResponse[OrderResponse]:
    order = service.create_leader_order(
        db, request_body, leader_id=user.user_id, shg_id=user.shg_id
    )
    return success_response(order, req)


# ---------------------------------------------------------------------------
# Leader: order detail
# ---------------------------------------------------------------------------


@router.get(
    "/{order_id}",
    response_model=SuccessResponse[OrderDetailResponse],
    summary="Get full order details",
    description=(
        "Returns the full order record including order items and status "
        "timeline for the Leader's review. Requirement 4.1."
    ),
    tags=["orders-leader"],
)
async def get_order(
    order_id: str,
    req: Request,
    user: CurrentUser = Depends(require_role("leader")),
    db: Client = Depends(get_db),
) -> SuccessResponse[OrderDetailResponse]:
    order = service.get_order_detail(db, order_id, user)
    return success_response(order, req)


# ---------------------------------------------------------------------------
# Leader: accept order
# ---------------------------------------------------------------------------


@router.post(
    "/{order_id}/accept",
    response_model=SuccessResponse[OrderResponse],
    summary="Accept a buyer order",
    description=(
        "Transitions an order from REQUESTED to REVIEWED. "
        "Emits an ORDER_ACCEPTED audit event capturing actor, old/new status, "
        "and optional note. Only valid from REQUESTED status. "
        "Requirements 4.2, 4.7."
    ),
    tags=["orders-leader"],
)
async def accept_order(
    order_id: str,
    request_body: OrderAcceptRequest,
    req: Request,
    user: CurrentUser = Depends(require_role("leader")),
    db: Client = Depends(get_db),
) -> SuccessResponse[OrderResponse]:
    order = service.accept_order(db, order_id, request_body, user)
    return success_response(order, req)


# ---------------------------------------------------------------------------
# Leader: reject order
# ---------------------------------------------------------------------------


@router.post(
    "/{order_id}/reject",
    response_model=SuccessResponse[OrderResponse],
    summary="Reject a buyer order",
    description=(
        "Transitions an order from REQUESTED to CANCELLED and records the "
        "mandatory rejection reason. Emits an ORDER_REJECTED audit event. "
        "Only valid from REQUESTED status. Requirements 4.3, 4.7."
    ),
    tags=["orders-leader"],
)
async def reject_order(
    order_id: str,
    request_body: OrderRejectRequest,
    req: Request,
    user: CurrentUser = Depends(require_role("leader")),
    db: Client = Depends(get_db),
) -> SuccessResponse[OrderResponse]:
    order = service.reject_order(db, order_id, request_body, user)
    return success_response(order, req)


# ---------------------------------------------------------------------------
# Leader: cancel order
# ---------------------------------------------------------------------------


@router.post(
    "/{order_id}/cancel",
    response_model=SuccessResponse[OrderResponse],
    summary="Cancel an order",
    description=(
        "Transitions any non-terminal order to CANCELLED and records the "
        "mandatory cancellation reason. Emits an ORDER_CANCELLED audit event. "
        "Cannot cancel CANCELLED, COMPLETED, or DELIVERED orders. Req 4.7."
    ),
    tags=["orders-leader"],
)
async def cancel_order(
    order_id: str,
    request_body: OrderCancelRequest,
    req: Request,
    user: CurrentUser = Depends(require_role("leader")),
    db: Client = Depends(get_db),
) -> SuccessResponse[OrderResponse]:
    order = service.cancel_order(db, order_id, request_body, user)
    return success_response(order, req)


# ---------------------------------------------------------------------------
# Leader: edit order
# ---------------------------------------------------------------------------


@router.patch(
    "/{order_id}",
    response_model=SuccessResponse[OrderResponse],
    summary="Edit an order",
    description=(
        "Allows a Leader to edit order title, required_date, delivery_address, "
        "and/or order items while the order is in REQUESTED or REVIEWED status. "
        "Raises 409 CONFLICT for any other status. Requirement 4.5."
    ),
    tags=["orders-leader"],
)
async def update_order(
    order_id: str,
    request_body: LeaderOrderUpdate,
    req: Request,
    user: CurrentUser = Depends(require_role("leader")),
    db: Client = Depends(get_db),
) -> SuccessResponse[OrderResponse]:
    if not user.shg_id:
        from app.core.errors import ForbiddenError
        raise ForbiddenError("Leader must be associated with an SHG.")
    order = service.update_order(db, order_id, request_body, user.user_id, user.shg_id)
    return success_response(order, req)
