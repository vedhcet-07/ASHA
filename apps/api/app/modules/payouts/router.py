"""Payout calculation, submission, approval, and member earnings routes."""

from datetime import datetime, timezone
from fastapi import APIRouter, status
from app.core.dependencies import SupabaseClient, CurrentToken, success_response
from app.core.errors import AshaAPIError
from app.modules.shg.router import _get_user_shg_id, _require_role
from app.modules.orders.service import get_order_or_404, _record_audit
from app.rules.payout import calculate_payout_sheet, TaskPayoutInput
from .schemas import (
    CalculatePayoutRequest,
    SubmitPayoutRequest,
    ApprovePayoutRequest,
    RejectPayoutRequest,
    RequestChangesRequest,
)

router = APIRouter(tags=["payouts"])


@router.post("/orders/{order_id}/payout/calculate", status_code=status.HTTP_201_CREATED)
async def calculate_payout(
    order_id: str,
    body: CalculatePayoutRequest,
    token: CurrentToken,
    db: SupabaseClient,
):
    """
    Leader calculates member-wise payout from accepted work.
    Deterministic: accepted_quantity × rate. Rework/rejected not paid.
    """
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    # Build rate lookup
    rate_map = {r.task_id: r for r in body.task_rates}

    # Fetch all tasks + assignments for this order
    tasks_result = db.table("tasks") \
        .select("*, task_assignments(*, shg_members(member_name, profile_id))") \
        .eq("order_id", order_id).is_("deleted_at", "null").execute()

    payout_inputs: list[TaskPayoutInput] = []
    for task in tasks_result.data or []:
        rate_info = rate_map.get(task["id"])
        if not rate_info:
            continue
        for assign in task.get("task_assignments") or []:
            member = assign.get("shg_members") or {}
            payout_inputs.append(TaskPayoutInput(
                task_id=task["id"],
                member_id=assign["shg_member_id"],
                member_name=member.get("member_name", "Unknown"),
                allocated_quantity=assign["allocated_quantity"],
                completed_quantity=task["completed_quantity"],
                accepted_quantity=assign.get("accepted_quantity", 0),
                rework_quantity=assign.get("rework_quantity", 0),
                rejected_quantity=assign.get("rejected_quantity", 0),
                payment_basis=rate_info.payment_basis,
                rate=rate_info.rate,
                hours=rate_info.hours,
            ))

    if not payout_inputs:
        raise AshaAPIError(
            code="VALIDATION_ERROR",
            message="No task assignments found. Confirm allocation first.",
            status_code=422,
        )

    # Run deterministic payout calculation
    sheet_result = calculate_payout_sheet(payout_inputs)

    # Get current max version
    existing = db.table("payout_sheets").select("version") \
        .eq("order_id", order_id).is_("deleted_at", "null") \
        .order("version", desc=True).limit(1).execute()
    version = (existing.data[0]["version"] + 1) if existing.data else 1

    # Save payout sheet
    sheet = db.table("payout_sheets").insert({
        "order_id": order_id,
        "version": version,
        "status": "DRAFT",
        "total_payable_amount": sheet_result.total_payable_amount,
        "total_accepted_quantity": sheet_result.total_accepted_quantity,
    }).execute()
    sheet_id = sheet.data[0]["id"]

    # Save payout lines
    lines_data = [
        {
            "payout_sheet_id": sheet_id,
            "shg_member_id": line.member_id,
            "task_id": line.task_id,
            "allocated_quantity": line.allocated_quantity,
            "completed_quantity": line.completed_quantity,
            "accepted_quantity": line.accepted_quantity,
            "rework_quantity": line.rework_quantity,
            "rejected_quantity": line.rejected_quantity,
            "payment_basis": line.payment_basis,
            "rate": line.rate,
            "hours": line.hours,
            "payable_amount": line.payable_amount,
            "explanation": line.explanation,
        }
        for line in sheet_result.lines
    ]
    if lines_data:
        db.table("payout_lines").insert(lines_data).execute()

    _record_audit(
        db=db, shg_id=shg_id, order_id=order_id, actor_id=token.sub,
        event_type="PAYOUT_CALCULATED", entity_type="payout_sheet", entity_id=sheet_id,
        new_values={
            "total_payable": sheet_result.total_payable_amount,
            "total_accepted": sheet_result.total_accepted_quantity,
            "version": version,
        },
    )

    full_sheet = db.table("payout_sheets").select("*, payout_lines(*)") \
        .eq("id", sheet_id).single().execute()
    return success_response({
        **full_sheet.data,
        "warnings": sheet_result.warnings,
    })


@router.get("/orders/{order_id}/payout")
async def get_payout_sheet(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Leader/approver gets the full payout sheet."""
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    result = db.table("payout_sheets") \
        .select("*, payout_lines(*, shg_members(member_name)), payout_approvals(*)") \
        .eq("order_id", order_id).is_("deleted_at", "null") \
        .order("version", desc=True).limit(1).execute()

    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="No payout sheet found", status_code=404)
    return success_response(result.data[0])


@router.get("/member/payouts/{payout_sheet_id}")
async def get_my_payout_line(payout_sheet_id: str, token: CurrentToken, db: SupabaseClient):
    """Member sees ONLY their own payout line. Privacy enforced at API level."""
    member_result = db.table("shg_members").select("id").eq("profile_id", token.sub) \
        .is_("deleted_at", "null").limit(1).execute()
    if not member_result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Member profile not found", status_code=404)
    member_id = member_result.data[0]["id"]

    # Only return this member's own line — never expose other members
    line = db.table("payout_lines").select("*") \
        .eq("payout_sheet_id", payout_sheet_id) \
        .eq("shg_member_id", member_id).execute()

    sheet = db.table("payout_sheets").select("status, total_accepted_quantity") \
        .eq("id", payout_sheet_id).single().execute()

    return success_response({
        "payout_sheet_id": payout_sheet_id,
        "sheet_status": sheet.data.get("status") if sheet.data else None,
        "my_lines": line.data,
        "note": "SIMULATED — not a real payment",
    })


@router.get("/member/earnings")
async def get_my_earnings(token: CurrentToken, db: SupabaseClient):
    """Member sees their total earnings summary across all orders."""
    member_result = db.table("shg_members").select("id, member_name").eq("profile_id", token.sub) \
        .is_("deleted_at", "null").limit(1).execute()
    if not member_result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Member profile not found", status_code=404)
    member_id = member_result.data[0]["id"]

    lines = db.table("payout_lines").select("payable_amount, accepted_quantity, payment_basis, payout_sheets(status, order_id)") \
        .eq("shg_member_id", member_id).execute()

    total_earned = sum(
        float(l["payable_amount"]) for l in (lines.data or [])
        if (l.get("payout_sheets") or {}).get("status") == "APPROVED"
    )
    pending = sum(
        float(l["payable_amount"]) for l in (lines.data or [])
        if (l.get("payout_sheets") or {}).get("status") not in ("APPROVED", "REJECTED")
    )

    return success_response({
        "member_id": member_id,
        "member_name": member_result.data[0]["member_name"],
        "total_approved_earnings": round(total_earned, 2),
        "total_pending_earnings": round(pending, 2),
        "lines": lines.data,
        "note": "SIMULATED — not a real payment",
    })


@router.post("/orders/{order_id}/payout/submit")
async def submit_payout(order_id: str, body: SubmitPayoutRequest, token: CurrentToken, db: SupabaseClient):
    """Leader submits the payout sheet for group approval."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    sheet = db.table("payout_sheets").select("*").eq("id", body.payout_sheet_id) \
        .eq("order_id", order_id).single().execute()
    if not sheet.data:
        raise AshaAPIError(code="NOT_FOUND", message="Payout sheet not found", status_code=404)
    if sheet.data["status"] != "DRAFT":
        raise AshaAPIError(code="CONFLICT",
            message=f"Cannot submit — sheet status is '{sheet.data['status']}'", status_code=409)

    now = datetime.now(timezone.utc).isoformat()
    db.table("payout_sheets").update({
        "status": "SUBMITTED",
        "submitted_by": token.sub,
        "submitted_at": now,
    }).eq("id", body.payout_sheet_id).execute()

    _record_audit(
        db=db, shg_id=shg_id, order_id=order_id, actor_id=token.sub,
        event_type="PAYOUT_SUBMITTED", entity_type="payout_sheet",
        entity_id=body.payout_sheet_id,
        new_values={"status": "SUBMITTED"},
    )
    return success_response({"payout_sheet_id": body.payout_sheet_id, "status": "SUBMITTED"})


@router.post("/orders/{order_id}/payout/approve")
async def approve_payout(order_id: str, body: ApprovePayoutRequest, token: CurrentToken, db: SupabaseClient):
    """
    Approver explicitly approves the payout.
    This is the group approval action — explicit, auditable, irreversible.
    """
    _require_role(token, db, "approver")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    sheet = db.table("payout_sheets").select("*").eq("id", body.payout_sheet_id) \
        .eq("order_id", order_id).single().execute()
    if not sheet.data:
        raise AshaAPIError(code="NOT_FOUND", message="Payout sheet not found", status_code=404)
    if sheet.data["status"] != "SUBMITTED":
        raise AshaAPIError(code="CONFLICT",
            message=f"Cannot approve — sheet must be SUBMITTED (current: '{sheet.data['status']}')",
            status_code=409)

    db.table("payout_sheets").update({"status": "APPROVED"}).eq("id", body.payout_sheet_id).execute()
    db.table("payout_approvals").insert({
        "payout_sheet_id": body.payout_sheet_id,
        "approver_id": token.sub,
        "action": "APPROVED",
        "note": body.note,
    }).execute()

    # Transition order to COMPLETED
    db.table("orders").update({"status": "COMPLETED"}).eq("id", order_id).execute()

    _record_audit(
        db=db, shg_id=shg_id, order_id=order_id, actor_id=token.sub,
        event_type="PAYOUT_APPROVED", entity_type="payout_sheet",
        entity_id=body.payout_sheet_id,
        new_values={"status": "APPROVED"},
    )
    return success_response({
        "payout_sheet_id": body.payout_sheet_id,
        "status": "APPROVED",
        "message": "Payout approved. Order is now COMPLETED. All payments are SIMULATED.",
    })


@router.post("/orders/{order_id}/payout/reject")
async def reject_payout(order_id: str, body: RejectPayoutRequest, token: CurrentToken, db: SupabaseClient):
    """Approver rejects the payout with a required note."""
    _require_role(token, db, "approver")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    db.table("payout_sheets").update({"status": "REJECTED"}).eq("id", body.payout_sheet_id).execute()
    db.table("payout_approvals").insert({
        "payout_sheet_id": body.payout_sheet_id,
        "approver_id": token.sub,
        "action": "REJECTED",
        "note": body.note,
    }).execute()

    _record_audit(
        db=db, shg_id=shg_id, order_id=order_id, actor_id=token.sub,
        event_type="PAYOUT_REJECTED", entity_type="payout_sheet",
        entity_id=body.payout_sheet_id,
        new_values={"status": "REJECTED"},
        reason=body.note,
    )
    return success_response({"payout_sheet_id": body.payout_sheet_id, "status": "REJECTED"})


@router.post("/orders/{order_id}/payout/request-changes")
async def request_payout_changes(
    order_id: str, body: RequestChangesRequest, token: CurrentToken, db: SupabaseClient
):
    """Approver requests changes — returns sheet to leader for revision."""
    _require_role(token, db, "approver")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    db.table("payout_sheets").update({"status": "CHANGES_REQUESTED"}).eq("id", body.payout_sheet_id).execute()
    db.table("payout_approvals").insert({
        "payout_sheet_id": body.payout_sheet_id,
        "approver_id": token.sub,
        "action": "CHANGES_REQUESTED",
        "note": body.note,
    }).execute()

    _record_audit(
        db=db, shg_id=shg_id, order_id=order_id, actor_id=token.sub,
        event_type="PAYOUT_CHANGES_REQUESTED", entity_type="payout_sheet",
        entity_id=body.payout_sheet_id,
        new_values={"status": "CHANGES_REQUESTED"},
        reason=body.note,
    )
    return success_response({
        "payout_sheet_id": body.payout_sheet_id,
        "status": "CHANGES_REQUESTED",
        "note": body.note,
    })


@router.get("/orders/{order_id}/payout/explanation")
async def get_payout_explanation(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Get plain-language payout explanation (for voice playback)."""
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    result = db.table("payout_sheets") \
        .select("*, payout_lines(*, shg_members(member_name))") \
        .eq("order_id", order_id).is_("deleted_at", "null") \
        .order("version", desc=True).limit(1).execute()

    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="No payout sheet found", status_code=404)

    sheet = result.data[0]
    lines = sheet.get("payout_lines") or []
    total = sheet["total_payable_amount"]

    member_summaries = []
    for line in lines:
        name = (line.get("shg_members") or {}).get("member_name", "Member")
        member_summaries.append({
            "member_name": name,
            "accepted_quantity": line["accepted_quantity"],
            "payable_amount": line["payable_amount"],
            "explanation": line.get("explanation", ""),
        })

    voice_text = (
        f"The total payout for this order is ₹{total:,.2f}. "
        f"{len(lines)} members will be paid based on their accepted work. "
        "All payments are simulated."
    )

    return success_response({
        "total_payable": total,
        "sheet_status": sheet["status"],
        "member_summaries": member_summaries,
        "voice_text": voice_text,
    })


@router.get("/reports/summary")
async def get_reports_summary(token: CurrentToken, db: SupabaseClient):
    """Basic operational summary for leader/approver."""
    shg_id = _get_user_shg_id(token.sub, db)

    orders = db.table("orders").select("status").eq("shg_id", shg_id).execute().data or []
    tasks = db.table("tasks").select("status, accepted_quantity, rejected_quantity, allocated_quantity") \
        .execute().data or []
    payouts = db.table("payout_sheets").select("total_payable_amount, status") \
        .execute().data or []

    total_orders = len(orders)
    completed = sum(1 for o in orders if o["status"] == "COMPLETED")
    active = sum(1 for o in orders if o["status"] not in ("COMPLETED", "CANCELLED"))
    total_allocated = sum(t["allocated_quantity"] or 0 for t in tasks)
    total_accepted = sum(t["accepted_quantity"] or 0 for t in tasks)
    total_rejected = sum(t["rejected_quantity"] or 0 for t in tasks)
    total_approved_payout = sum(
        float(p["total_payable_amount"]) for p in payouts if p["status"] == "APPROVED"
    )

    acceptance_rate = round(total_accepted / max(total_allocated, 1) * 100, 1)
    rejection_rate = round(total_rejected / max(total_allocated, 1) * 100, 1)

    return success_response({
        "orders": {"total": total_orders, "completed": completed, "active": active},
        "tasks": {
            "total_allocated": total_allocated,
            "total_accepted": total_accepted,
            "total_rejected": total_rejected,
            "acceptance_rate_pct": acceptance_rate,
            "rejection_rate_pct": rejection_rate,
        },
        "payouts": {"total_approved_inr": round(total_approved_payout, 2)},
        "note": "SIMULATED — not real financial data",
    })


@router.get("/notifications")
async def get_notifications(token: CurrentToken, db: SupabaseClient):
    """List notifications for the current user."""
    result = db.table("notifications").select("*") \
        .eq("recipient_profile_id", token.sub) \
        .order("created_at", desc=True).limit(50).execute()
    return success_response(result.data or [])


@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, token: CurrentToken, db: SupabaseClient):
    """Mark a notification as read."""
    from datetime import datetime, timezone
    db.table("notifications").update({
        "is_read": True,
        "read_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", notification_id).eq("recipient_profile_id", token.sub).execute()
    return success_response({"notification_id": notification_id, "is_read": True})
