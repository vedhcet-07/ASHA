"""Quality review routes — accept, rework, reject."""

from fastapi import APIRouter
from app.core.dependencies import SupabaseClient, CurrentToken, success_response
from app.core.errors import AshaAPIError
from app.modules.shg.router import _get_user_shg_id, _require_role
from app.modules.orders.service import _record_audit
from pydantic import BaseModel, field_validator
from typing import Literal


router = APIRouter(tags=["quality"])


class QualityReviewRequest(BaseModel):
    decision: Literal["ACCEPTED", "REWORK", "REJECTED"]
    reviewed_quantity: int
    reason: str | None = None
    ai_draft_note: str | None = None

    @field_validator("reviewed_quantity")
    @classmethod
    def qty_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Reviewed quantity must be greater than zero")
        return v


@router.get("/quality/review-queue")
async def get_review_queue(token: CurrentToken, db: SupabaseClient):
    """Leader/checker sees tasks awaiting quality review."""
    shg_id = _get_user_shg_id(token.sub, db)
    result = (
        db.table("tasks")
        .select("*, task_assignments(*, shg_members(member_name)), proof_media(*)")
        .in_("status", ["SUBMITTED", "QUALITY_REVIEW"])
        .execute()
    )
    # Filter to SHG's orders
    shg_order_ids = {
        o["id"] for o in
        (db.table("orders").select("id").eq("shg_id", shg_id).execute().data or [])
    }
    tasks = [t for t in (result.data or []) if t["order_id"] in shg_order_ids]
    return success_response(tasks)


@router.get("/quality/tasks/{task_id}")
async def get_quality_task(task_id: str, token: CurrentToken, db: SupabaseClient):
    """Get a task with proof and review context."""
    shg_id = _get_user_shg_id(token.sub, db)
    result = db.table("tasks").select("*, proof_media(*), quality_reviews(*), task_assignments(*, shg_members(member_name))") \
        .eq("id", task_id).single().execute()
    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Task not found", status_code=404)
    return success_response(result.data)


@router.post("/quality/tasks/{task_id}/review")
async def submit_quality_review(
    task_id: str, body: QualityReviewRequest, token: CurrentToken, db: SupabaseClient
):
    """Leader/checker submits a quality decision."""
    shg_id = _get_user_shg_id(token.sub, db)

    task = db.table("tasks").select("*").eq("id", task_id).single().execute()
    if not task.data:
        raise AshaAPIError(code="NOT_FOUND", message="Task not found", status_code=404)

    # Insert quality review
    db.table("quality_reviews").insert({
        "task_id": task_id,
        "reviewed_by": token.sub,
        "decision": body.decision,
        "reviewed_quantity": body.reviewed_quantity,
        "reason": body.reason,
        "ai_draft_note": body.ai_draft_note,
    }).execute()

    # Update task quantities and status
    if body.decision == "ACCEPTED":
        new_accepted = (task.data.get("accepted_quantity") or 0) + body.reviewed_quantity
        db.table("tasks").update({
            "accepted_quantity": new_accepted,
            "status": "ACCEPTED",
        }).eq("id", task_id).execute()

        # Update task_assignment accepted_quantity
        db.table("task_assignments").update({
            "accepted_quantity": body.reviewed_quantity,
        }).eq("task_id", task_id).execute()

    elif body.decision == "REWORK":
        new_rework = (task.data.get("rework_quantity") or 0) + body.reviewed_quantity
        db.table("tasks").update({
            "rework_quantity": new_rework,
            "status": "REWORK",
        }).eq("id", task_id).execute()

    elif body.decision == "REJECTED":
        new_rejected = (task.data.get("rejected_quantity") or 0) + body.reviewed_quantity
        db.table("tasks").update({
            "rejected_quantity": new_rejected,
            "status": "REJECTED",
        }).eq("id", task_id).execute()

    _record_audit(
        db=db, shg_id=shg_id, order_id=task.data["order_id"], actor_id=token.sub,
        event_type=f"QUALITY_{body.decision}",
        entity_type="task", entity_id=task_id,
        new_values={"decision": body.decision, "quantity": body.reviewed_quantity},
        reason=body.reason,
    )

    return success_response({
        "task_id": task_id,
        "decision": body.decision,
        "reviewed_quantity": body.reviewed_quantity,
    })


@router.post("/quality/tasks/{task_id}/rework")
async def create_rework_task(task_id: str, token: CurrentToken, db: SupabaseClient):
    """Create a rework task from a rejected task."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)

    original = db.table("tasks").select("*").eq("id", task_id).single().execute()
    if not original.data:
        raise AshaAPIError(code="NOT_FOUND", message="Task not found", status_code=404)

    orig = original.data
    rework_task = db.table("tasks").insert({
        "order_id": orig["order_id"],
        "order_item_id": orig.get("order_item_id"),
        "production_plan_id": orig.get("production_plan_id"),
        "plan_stage_id": orig.get("plan_stage_id"),
        "task_name": f"REWORK: {orig['task_name']}",
        "task_type": orig["task_type"],
        "required_skill": orig.get("required_skill"),
        "allocated_quantity": orig.get("rework_quantity", 0),
        "due_date": orig.get("due_date"),
        "status": "PROPOSED",
    }).execute()
    rework_id = rework_task.data[0]["id"]

    db.table("rework_tasks").insert({
        "original_task_id": task_id,
        "rework_task_id": rework_id,
        "reason": "Quality rejected",
    }).execute()

    _record_audit(
        db=db, shg_id=shg_id, order_id=orig["order_id"], actor_id=token.sub,
        event_type="REWORK_CREATED", entity_type="task", entity_id=rework_id,
        new_values={"original_task_id": task_id},
    )

    return success_response(rework_task.data[0])
