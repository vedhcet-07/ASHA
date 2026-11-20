"""Order business logic — deterministic, no AI calls."""

import uuid
from datetime import datetime, timezone
from supabase import Client
from app.core.errors import AshaAPIError


ORDER_STATUS_TRANSITIONS: dict[str, list[str]] = {
    "REQUESTED":          ["REVIEWED", "CANCELLED"],
    "REVIEWED":           ["PLANNING", "CANCELLED"],
    "PLANNING":           ["ALLOCATION_PENDING", "CANCELLED"],
    "ALLOCATION_PENDING": ["IN_PROGRESS", "CANCELLED"],
    "IN_PROGRESS":        ["QUALITY_REVIEW", "CANCELLED"],
    "QUALITY_REVIEW":     ["REWORK", "READY", "CANCELLED"],
    "REWORK":             ["QUALITY_REVIEW", "CANCELLED"],
    "READY":              ["DELIVERED", "COMPLETED", "CANCELLED"],
    "DELIVERED":          ["COMPLETED"],
    "CANCELLED":          [],
    "COMPLETED":          [],
}


def check_and_complete_order(order_id: str, shg_id: str, actor_id: str, db: Client) -> dict | None:
    """
    Complete order ONLY if both:
    1. Delivery has been recorded (audit event ORDER_DELIVERED exists or status is DELIVERED)
    2. Payout sheet has been APPROVED
    Applies symmetrically regardless of which event occurred first.
    """
    deliv = (
        db.table("audit_events")
        .select("id")
        .eq("order_id", order_id)
        .eq("event_type", "ORDER_DELIVERED")
        .limit(1)
        .execute()
    )
    order_data = db.table("orders").select("status").eq("id", order_id).single().execute()
    current_status = order_data.data.get("status") if order_data.data else None
    has_delivery = bool(deliv.data) or current_status == "DELIVERED"

    payout = (
        db.table("payout_sheets")
        .select("id")
        .eq("order_id", order_id)
        .eq("status", "APPROVED")
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    has_payout_approval = bool(payout.data)

    if has_delivery and has_payout_approval:
        if current_status != "COMPLETED":
            db.table("orders").update({"status": "COMPLETED"}).eq("id", order_id).execute()
            _record_audit(
                db=db,
                shg_id=shg_id,
                order_id=order_id,
                actor_id=actor_id,
                event_type="ORDER_COMPLETED",
                entity_type="order",
                entity_id=order_id,
                old_values={"status": current_status},
                new_values={"status": "COMPLETED"},
                reason="Both delivery and payout approval completed",
            )
            return {"status": "COMPLETED"}
    return None


def generate_order_number() -> str:
    """Generate a unique order number like ORD-2026-XXXX."""
    year = datetime.now(timezone.utc).year
    suffix = str(uuid.uuid4())[:6].upper()
    return f"ORD-{year}-{suffix}"


def get_order_or_404(order_id: str, shg_id: str, db: Client) -> dict:
    """Fetch an order that belongs to the given SHG or raise 404."""
    result = (
        db.table("orders")
        .select("*, order_items(*)")
        .eq("id", order_id)
        .eq("shg_id", shg_id)
        .is_("deleted_at", "null")
        .single()
        .execute()
    )
    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Order not found", status_code=404)
    return result.data


def transition_order_status(
    order_id: str,
    shg_id: str,
    new_status: str,
    actor_id: str,
    db: Client,
    reason: str | None = None,
) -> dict:
    """Transition an order to a new status, enforcing valid transitions."""
    order = get_order_or_404(order_id, shg_id, db)
    current = order["status"]

    allowed = ORDER_STATUS_TRANSITIONS.get(current, [])
    if new_status not in allowed:
        raise AshaAPIError(
            code="CONFLICT",
            message=f"Cannot move order from '{current}' to '{new_status}'. "
                    f"Allowed transitions: {allowed}",
            status_code=409,
        )

    updates: dict = {"status": new_status}
    if reason:
        updates["rejection_reason"] = reason

    db.table("orders").update(updates).eq("id", order_id).execute()

    # Audit event
    _record_audit(
        db=db,
        shg_id=shg_id,
        order_id=order_id,
        actor_id=actor_id,
        event_type=f"ORDER_{new_status}",
        entity_type="order",
        entity_id=order_id,
        old_values={"status": current},
        new_values={"status": new_status},
        reason=reason,
    )

    order["status"] = new_status
    return order


def _record_audit(
    db: Client,
    shg_id: str,
    order_id: str,
    actor_id: str,
    event_type: str,
    entity_type: str,
    entity_id: str,
    old_values: dict | None = None,
    new_values: dict | None = None,
    reason: str | None = None,
) -> None:
    """Write an immutable audit event."""
    db.table("audit_events").insert({
        "shg_id": shg_id,
        "order_id": order_id,
        "actor_profile_id": actor_id,
        "event_type": event_type,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "old_values": old_values,
        "new_values": new_values,
        "reason": reason,
    }).execute()


def get_buyer_or_create(profile_id: str, buyer_name: str, db: Client) -> dict:
    """Return existing buyer record for a profile, or create one."""
    result = (
        db.table("buyers")
        .select("*")
        .eq("profile_id", profile_id)
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    if result.data:
        return result.data[0]

    new_buyer = db.table("buyers").insert({
        "profile_id": profile_id,
        "buyer_name": buyer_name,
    }).execute()
    return new_buyer.data[0]


def get_order_timeline(order_id: str, shg_id: str, db: Client) -> list[dict]:
    """Return audit events for an order as a timeline."""
    result = (
        db.table("audit_events")
        .select("event_type, new_values, reason, created_at, actor_profile_id")
        .eq("order_id", order_id)
        .order("created_at", desc=False)
        .execute()
    )
    return result.data or []
