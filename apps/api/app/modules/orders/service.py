"""Business logic for the Orders module.

Responsibilities:
  - Buyer order creation with unique order_number generation (Req 3.1–3.3)
  - Leader order list and detail retrieval (Req 4.1)
  - Order status transitions: accept (REQUESTED→REVIEWED), reject
    (REQUESTED→CANCELLED), cancel (any→CANCELLED) (Req 4.2–4.3)
  - Leader direct order creation (Req 4.4)
  - Order edit with status guard (Req 4.5)
  - Audit event emission for every status transition (Req 4.7, 14.1–14.3)

Audit events are inserted directly into the ``audit_events`` table.
The dedicated Audit_Service module (task 2.5) will wrap this later;
for now we write to the table inline as directed by the task description.

Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.7, 14.1, 14.2
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from supabase import Client

from app.core.errors import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.core.security import CurrentUser
from app.modules.orders.schemas import (
    BuyerOrderCreate,
    EDITABLE_STATUSES,
    LeaderOrderCreate,
    LeaderOrderUpdate,
    OrderAcceptRequest,
    OrderCancelRequest,
    OrderDetailResponse,
    OrderItemResponse,
    OrderListItem,
    OrderRejectRequest,
    OrderResponse,
    StatusTimelineEvent,
)

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Valid status transitions
# ---------------------------------------------------------------------------

#: Statuses from which accept/reject are permitted (only REQUESTED).
_REVIEW_ALLOWED_STATUS: str = "REQUESTED"

#: Statuses from which a cancel is not meaningful (already terminal).
_TERMINAL_STATUSES: frozenset[str] = frozenset({"CANCELLED", "COMPLETED", "DELIVERED"})


# ---------------------------------------------------------------------------
# Order number generation
# ---------------------------------------------------------------------------


def _generate_order_number(db: Client, shg_id: str) -> str:
    """Generate a unique order number in the format ``ORD-YYYYMMDD-NNNN``.

    The sequence number is derived from counting today's existing orders for
    the SHG and incrementing by 1. Duplicates are prevented by the ``UNIQUE``
    constraint on ``order_number``.
    """
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"ORD-{today}-"

    try:
        result = (
            db.table("orders")
            .select("order_number", count="exact")
            .eq("shg_id", shg_id)
            .like("order_number", f"{prefix}%")
            .execute()
        )
        seq = (result.count or 0) + 1
    except Exception:  # noqa: BLE001
        seq = 1

    return f"{prefix}{seq:04d}"


# ---------------------------------------------------------------------------
# Buyer helpers
# ---------------------------------------------------------------------------


def _get_buyer_id(db: Client, user_id: str) -> str | None:
    """Resolve the ``buyers.id`` for the authenticated user, if any."""
    try:
        result = (
            db.table("buyers")
            .select("id")
            .eq("profile_id", user_id)
            .limit(1)
            .execute()
        )
        if result.data:
            return str(result.data[0]["id"])
    except Exception:  # noqa: BLE001
        log.debug("buyer_id_lookup_failed", user_id=user_id)
    return None


# ---------------------------------------------------------------------------
# Audit event helpers
# ---------------------------------------------------------------------------


def _emit_audit_event(
    db: Client,
    *,
    event_type: str,
    entity_type: str,
    entity_id: str,
    actor_id: str,
    shg_id: str | None,
    order_id: str | None,
    old_values: dict[str, Any] | None = None,
    new_values: dict[str, Any] | None = None,
    reason: str | None = None,
) -> None:
    """Insert a single row into ``audit_events``.

    Per Requirement 14.3 the table is append-only (enforced by a database
    rule). This function only ever inserts — it never updates or deletes.

    Requirements: 4.7, 14.1, 14.2, 14.3
    """
    row: dict[str, Any] = {
        "event_type": event_type,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "actor_id": actor_id,
        "shg_id": shg_id,
        "order_id": order_id,
        "old_values": old_values,
        "new_values": new_values,
        "reason": reason,
    }
    try:
        db.table("audit_events").insert(row).execute()
        log.info(
            "audit_event_emitted",
            event_type=event_type,
            entity_id=entity_id,
            actor_id=actor_id,
        )
    except Exception as exc:  # noqa: BLE001
        # Audit failure must never break the primary operation.
        log.error(
            "audit_event_failed",
            event_type=event_type,
            entity_id=entity_id,
            error=str(exc),
        )


# ---------------------------------------------------------------------------
# Order item helpers
# ---------------------------------------------------------------------------


def _insert_order_items(
    db: Client, order_id: str, items: list[Any]
) -> list[OrderItemResponse]:
    """Insert order items and return them as response models."""
    rows = [
        {
            "order_id": order_id,
            "product_name": item.product_name,
            "product_sku": item.product_sku,
            "quantity": item.quantity,
            # DB column is ``unit``; schema field is ``unit_type``
            "unit": getattr(item, "unit_type", None) or getattr(item, "unit", "piece"),
            "unit_price": str(item.unit_price) if item.unit_price is not None else None,
            "specifications": item.specifications,
        }
        for item in items
    ]
    result = db.table("order_items").insert(rows).execute()
    # Normalise DB column ``unit`` → response field ``unit_type``
    normalised = []
    for row in result.data:
        if "unit" in row and "unit_type" not in row:
            row = dict(row, unit_type=row["unit"])
        normalised.append(OrderItemResponse(**row))
    return normalised


def _fetch_order_items(db: Client, order_id: str) -> list[OrderItemResponse]:
    """Fetch all items for an order."""
    result = (
        db.table("order_items")
        .select("*")
        .eq("order_id", order_id)
        .execute()
    )
    normalised = []
    for row in result.data:
        if "unit" in row and "unit_type" not in row:
            row = dict(row, unit_type=row["unit"])
        normalised.append(OrderItemResponse(**row))
    return normalised


def _delete_order_items(db: Client, order_id: str) -> None:
    """Delete all items for an order (used during PATCH item replacement)."""
    try:
        db.table("order_items").delete().eq("order_id", order_id).execute()
    except Exception as exc:  # noqa: BLE001
        log.error("delete_order_items_failed", order_id=order_id, error=str(exc))


def _fetch_order_timeline(db: Client, order_id: str) -> list[StatusTimelineEvent]:
    """Fetch the status transition history from ``audit_events``."""
    try:
        result = (
            db.table("audit_events")
            .select("*")
            .eq("order_id", order_id)
            .in_(
                "event_type",
                ["ORDER_ACCEPTED", "ORDER_REJECTED", "ORDER_CANCELLED", "ORDER_CREATED"],
            )
            .order("created_at")
            .execute()
        )
        events = []
        for row in result.data:
            old_vals: dict = row.get("old_values") or {}
            new_vals: dict = row.get("new_values") or {}
            events.append(
                StatusTimelineEvent(
                    id=row["id"],
                    order_id=order_id,
                    old_status=old_vals.get("status"),
                    new_status=new_vals.get("status", ""),
                    actor_id=row.get("actor_id"),
                    reason=row.get("reason"),
                    created_at=row["created_at"],
                )
            )
        return events
    except Exception as exc:  # noqa: BLE001
        log.debug("order_timeline_fetch_failed", order_id=order_id, error=str(exc))
        return []


# ---------------------------------------------------------------------------
# _build_order_response — shared helper
# ---------------------------------------------------------------------------


def _build_order_response(order_data: dict, items: list[OrderItemResponse]) -> OrderResponse:
    """Build an ``OrderResponse`` from a raw DB row and item list.

    Maps the DB column ``required_by`` to the schema field ``required_date``
    via the alias defined in ``OrderResponse``.
    """
    # Normalise: DB uses ``required_by``; schema uses alias ``required_by``
    # and stores as ``required_date`` internally.
    response = OrderResponse(**order_data)
    response.order_items = items
    return response


# ---------------------------------------------------------------------------
# Fetch helpers shared by mutation operations
# ---------------------------------------------------------------------------


def _fetch_order_for_mutation(
    db: Client, order_id: str, shg_id: str
) -> dict:
    """Fetch a live order record for a mutation, scoped to the SHG."""
    try:
        result = (
            db.table("orders")
            .select("id,order_number,shg_id,status,title,created_by,buyer_id")
            .eq("id", order_id)
            .eq("shg_id", shg_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
        return result.data
    except Exception as exc:  # noqa: BLE001
        raise NotFoundError(f"Order {order_id} not found.") from exc


# ---------------------------------------------------------------------------
# Buyer order creation
# ---------------------------------------------------------------------------


def create_buyer_order(
    db: Client,
    request: BuyerOrderCreate,
    user: CurrentUser,
    shg_id: str,
) -> OrderResponse:
    """Create a new buyer order with status ``REQUESTED``.

    Requirements: 3.1, 3.2, 3.3
    """
    buyer_id = _get_buyer_id(db, user.user_id)
    order_number = _generate_order_number(db, shg_id)

    order_row: dict[str, Any] = {
        "order_number": order_number,
        "shg_id": shg_id,
        "buyer_id": buyer_id,
        "title": request.title,
        "description": request.description,
        "status": "REQUESTED",
        "required_by": str(request.required_by) if request.required_by else None,
        "delivery_address": request.delivery_address,
        "created_by": user.user_id,
    }

    try:
        result = db.table("orders").insert(order_row).execute()
    except Exception as exc:  # noqa: BLE001
        log.error("buyer_order_create_failed", error=str(exc))
        raise ConflictError(f"Failed to create order: {exc}") from exc

    order_data: dict = result.data[0]
    order_id: str = order_data["id"]

    items = _insert_order_items(db, order_id, request.items)

    _emit_audit_event(
        db,
        event_type="ORDER_CREATED",
        entity_type="order",
        entity_id=order_id,
        actor_id=user.user_id,
        shg_id=shg_id,
        order_id=order_id,
        old_values=None,
        new_values={"status": "REQUESTED", "order_number": order_number},
    )

    log.info(
        "buyer_order_created",
        order_id=order_id,
        order_number=order_number,
        buyer_id=buyer_id,
        shg_id=shg_id,
    )

    return _build_order_response(order_data, items)


# ---------------------------------------------------------------------------
# Leader direct order creation
# ---------------------------------------------------------------------------


def create_leader_order(
    db: Client,
    request: LeaderOrderCreate,
    leader_id: str,
    shg_id: str | None,
) -> OrderResponse:
    """Create an order directly as a Leader (no prior buyer request).

    Requirement 4.4: status is set to ``REVIEWED`` immediately.

    Parameters
    ----------
    db:
        Supabase client.
    request:
        Validated ``LeaderOrderCreate``.
    leader_id:
        The authenticated leader's profile UUID.
    shg_id:
        The leader's SHG UUID. Raises ``ValidationError`` when ``None``.
    """
    if not shg_id:
        raise ValidationError("Leader must be associated with an SHG to create orders.")

    order_number = _generate_order_number(db, shg_id)
    now = datetime.now(timezone.utc).isoformat()

    order_row: dict[str, Any] = {
        "order_number": order_number,
        "shg_id": shg_id,
        "buyer_id": None,
        "title": request.title,
        "description": request.description,
        "status": "REVIEWED",
        "required_by": str(request.required_date) if request.required_date else None,
        "delivery_address": request.delivery_address,
        "created_by": leader_id,
        "reviewed_by": leader_id,
        "reviewed_at": now,
    }

    try:
        result = db.table("orders").insert(order_row).execute()
    except Exception as exc:  # noqa: BLE001
        log.error("leader_order_create_failed", error=str(exc))
        raise ConflictError(f"Failed to create order: {exc}") from exc

    order_data: dict = result.data[0]
    order_id: str = order_data["id"]

    items = _insert_order_items(db, order_id, request.order_items)

    _emit_audit_event(
        db,
        event_type="ORDER_CREATED",
        entity_type="order",
        entity_id=order_id,
        actor_id=leader_id,
        shg_id=shg_id,
        order_id=order_id,
        old_values=None,
        new_values={"status": "REVIEWED", "order_number": order_number},
    )

    log.info(
        "leader_order_created",
        order_id=order_id,
        order_number=order_number,
        shg_id=shg_id,
    )

    return _build_order_response(order_data, items)


# ---------------------------------------------------------------------------
# Leader order update (edit)
# ---------------------------------------------------------------------------


def update_order(
    db: Client,
    order_id: str,
    request: LeaderOrderUpdate,
    leader_id: str,
    shg_id: str,
) -> OrderResponse:
    """Edit an order while it is in REQUESTED or REVIEWED status.

    Requirement 4.5: edits are allowed only in REQUESTED or REVIEWED.
    Raises ``ConflictError`` for any other status.
    Raises ``ValidationError`` when the payload has no fields to update.

    If ``order_items`` is provided in the payload, existing items are
    replaced wholesale.
    """
    # Validate that at least one field is being changed
    has_updates = any(
        v is not None
        for v in (
            request.title,
            request.description,
            request.required_date,
            request.delivery_address,
            request.order_items,
        )
    )
    if not has_updates:
        raise ValidationError("At least one field must be provided in the update payload.")

    if request.order_items is not None and len(request.order_items) == 0:
        raise ValidationError("When provided, order_items must contain at least one order item.")

    # Fetch and validate status
    order = _fetch_order_for_mutation(db, order_id, shg_id)

    if order["status"] not in EDITABLE_STATUSES:
        raise ConflictError(
            f"Order cannot be edited in status '{order['status']}'. "
            "Only REQUESTED or REVIEWED orders can be edited."
        )

    now = datetime.now(timezone.utc).isoformat()
    update_payload: dict[str, Any] = {"updated_at": now}
    if request.title is not None:
        update_payload["title"] = request.title
    if request.description is not None:
        update_payload["description"] = request.description
    if request.required_date is not None:
        update_payload["required_by"] = str(request.required_date)
    if request.delivery_address is not None:
        update_payload["delivery_address"] = request.delivery_address

    try:
        result = (
            db.table("orders")
            .update(update_payload)
            .eq("id", order_id)
            .execute()
        )
        updated: dict = result.data[0]
    except Exception as exc:  # noqa: BLE001
        log.error("update_order_failed", order_id=order_id, error=str(exc))
        raise ConflictError(f"Failed to update order: {exc}") from exc

    # Replace items if provided
    if request.order_items is not None:
        _delete_order_items(db, order_id)
        items = _insert_order_items(db, order_id, request.order_items)
    else:
        items = _fetch_order_items(db, order_id)

    log.info("order_updated", order_id=order_id, actor=leader_id)

    return _build_order_response(updated, items)


# ---------------------------------------------------------------------------
# Leader order list
# ---------------------------------------------------------------------------


def list_orders_for_leader(
    db: Client,
    user: CurrentUser,
    status_filter: str | None = None,
) -> list[OrderListItem]:
    """Return all orders for the Leader's SHG, optionally filtered by status.

    Requirement 4.1: a Leader can list all SHG orders with their current status.
    """
    if not user.shg_id:
        raise ForbiddenError("Leader must be associated with an SHG.")

    query = (
        db.table("orders")
        .select(
            "id,order_number,title,status,buyer_id,required_by,created_at,updated_at"
        )
        .eq("shg_id", user.shg_id)
        .is_("deleted_at", "null")
        .order("created_at", desc=True)
    )
    if status_filter:
        query = query.eq("status", status_filter)

    try:
        result = query.execute()
    except Exception as exc:  # noqa: BLE001
        log.error("list_orders_failed", shg_id=user.shg_id, error=str(exc))
        raise ConflictError(f"Failed to list orders: {exc}") from exc

    return [OrderListItem(**row) for row in result.data]


# ---------------------------------------------------------------------------
# Leader order detail
# ---------------------------------------------------------------------------


def get_order_detail(
    db: Client,
    order_id: str,
    user: CurrentUser,
) -> OrderDetailResponse:
    """Return full order details including items and status timeline.

    Requirement 4.1: a Leader sees all order details.
    """
    if not user.shg_id:
        raise ForbiddenError("Leader must be associated with an SHG.")

    try:
        result = (
            db.table("orders")
            .select("*")
            .eq("id", order_id)
            .eq("shg_id", user.shg_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
        order_data: dict = result.data
    except Exception as exc:  # noqa: BLE001
        raise NotFoundError(f"Order {order_id} not found.") from exc

    items = _fetch_order_items(db, order_id)
    timeline = _fetch_order_timeline(db, order_id)

    response = OrderDetailResponse(**order_data)
    response.order_items = items
    response.timeline = timeline
    return response


# ---------------------------------------------------------------------------
# Order state transitions (task 2.3)
# ---------------------------------------------------------------------------


def _assert_shg_id(user: CurrentUser) -> str:
    """Raise ForbiddenError if the Leader has no SHG; otherwise return shg_id."""
    if not user.shg_id:
        raise ForbiddenError("Leader must be associated with an SHG.")
    return user.shg_id


def accept_order(
    db: Client,
    order_id: str,
    request: OrderAcceptRequest,
    user: CurrentUser,
) -> OrderResponse:
    """Transition ``REQUESTED → REVIEWED`` and emit an audit event.

    Requirements: 4.2, 4.7
    """
    shg_id = _assert_shg_id(user)
    order = _fetch_order_for_mutation(db, order_id, shg_id)

    if order["status"] != _REVIEW_ALLOWED_STATUS:
        raise ConflictError(
            f"Order cannot be accepted from status '{order['status']}'. "
            "Only orders in REQUESTED status can be accepted."
        )

    now = datetime.now(timezone.utc).isoformat()
    update_payload: dict[str, Any] = {
        "status": "REVIEWED",
        "reviewed_by": user.user_id,
        "reviewed_at": now,
        "updated_at": now,
    }

    try:
        result = (
            db.table("orders")
            .update(update_payload)
            .eq("id", order_id)
            .execute()
        )
        updated: dict = result.data[0]
    except Exception as exc:  # noqa: BLE001
        log.error("accept_order_failed", order_id=order_id, error=str(exc))
        raise ConflictError(f"Failed to accept order: {exc}") from exc

    _emit_audit_event(
        db,
        event_type="ORDER_ACCEPTED",
        entity_type="order",
        entity_id=order_id,
        actor_id=user.user_id,
        shg_id=shg_id,
        order_id=order_id,
        old_values={"status": order["status"]},
        new_values={"status": "REVIEWED"},
        reason=request.note,
    )

    log.info("order_accepted", order_id=order_id, actor=user.user_id)

    items = _fetch_order_items(db, order_id)
    return _build_order_response(updated, items)


def reject_order(
    db: Client,
    order_id: str,
    request: OrderRejectRequest,
    user: CurrentUser,
) -> OrderResponse:
    """Transition ``REQUESTED → CANCELLED`` and emit an audit event.

    Requirements: 4.3, 4.7 — reason is required.
    """
    shg_id = _assert_shg_id(user)
    order = _fetch_order_for_mutation(db, order_id, shg_id)

    if order["status"] != _REVIEW_ALLOWED_STATUS:
        raise ConflictError(
            f"Order cannot be rejected from status '{order['status']}'. "
            "Only orders in REQUESTED status can be rejected."
        )

    now = datetime.now(timezone.utc).isoformat()
    update_payload: dict[str, Any] = {
        "status": "CANCELLED",
        "cancel_reason": request.reason,
        "cancelled_at": now,
        "updated_at": now,
    }

    try:
        result = (
            db.table("orders")
            .update(update_payload)
            .eq("id", order_id)
            .execute()
        )
        updated: dict = result.data[0]
    except Exception as exc:  # noqa: BLE001
        log.error("reject_order_failed", order_id=order_id, error=str(exc))
        raise ConflictError(f"Failed to reject order: {exc}") from exc

    _emit_audit_event(
        db,
        event_type="ORDER_REJECTED",
        entity_type="order",
        entity_id=order_id,
        actor_id=user.user_id,
        shg_id=shg_id,
        order_id=order_id,
        old_values={"status": order["status"]},
        new_values={"status": "CANCELLED"},
        reason=request.reason,
    )

    log.info("order_rejected", order_id=order_id, actor=user.user_id)

    items = _fetch_order_items(db, order_id)
    return _build_order_response(updated, items)


def cancel_order(
    db: Client,
    order_id: str,
    request: OrderCancelRequest,
    user: CurrentUser,
) -> OrderResponse:
    """Transition any non-terminal order to ``CANCELLED`` and emit audit event.

    Requirements: 4.7 — reason required; cannot cancel already-terminal orders.
    """
    shg_id = _assert_shg_id(user)
    order = _fetch_order_for_mutation(db, order_id, shg_id)

    if order["status"] in _TERMINAL_STATUSES:
        raise ConflictError(
            f"Order is already in terminal status '{order['status']}' and cannot be cancelled."
        )

    now = datetime.now(timezone.utc).isoformat()
    update_payload: dict[str, Any] = {
        "status": "CANCELLED",
        "cancel_reason": request.reason,
        "cancelled_at": now,
        "updated_at": now,
    }

    try:
        result = (
            db.table("orders")
            .update(update_payload)
            .eq("id", order_id)
            .execute()
        )
        updated: dict = result.data[0]
    except Exception as exc:  # noqa: BLE001
        log.error("cancel_order_failed", order_id=order_id, error=str(exc))
        raise ConflictError(f"Failed to cancel order: {exc}") from exc

    _emit_audit_event(
        db,
        event_type="ORDER_CANCELLED",
        entity_type="order",
        entity_id=order_id,
        actor_id=user.user_id,
        shg_id=shg_id,
        order_id=order_id,
        old_values={"status": order["status"]},
        new_values={"status": "CANCELLED"},
        reason=request.reason,
    )

    log.info("order_cancelled", order_id=order_id, actor=user.user_id)

    items = _fetch_order_items(db, order_id)
    return _build_order_response(updated, items)
