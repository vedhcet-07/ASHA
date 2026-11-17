"""Production planning and allocation routes."""

import json
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, BackgroundTasks, status

from app.core.dependencies import SupabaseClient, CurrentToken, success_response
from app.core.errors import AshaAPIError
from app.modules.shg.router import _get_user_shg_id, _require_role
from app.modules.orders.service import get_order_or_404, _record_audit
from app.rules.allocation import (
    propose_allocation, MemberProfile, AllocationProposal,
)
from .schemas import (
    ConfirmPlanRequest,
    ProposeAllocationRequest,
    AdjustAllocationRequest,
    ConfirmAllocationRequest,
)

router = APIRouter(tags=["planning"])


# ─────────────────────────────────────
# Production Plan
# ─────────────────────────────────────

@router.post("/orders/{order_id}/plan/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_plan(
    order_id: str,
    background_tasks: BackgroundTasks,
    token: CurrentToken,
    db: SupabaseClient,
):
    """
    Start AI-assisted production plan generation (async).
    Returns a draft_id to poll for status.
    """
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    order = get_order_or_404(order_id, shg_id, db)

    # Create a pending AI draft record
    draft = db.table("ai_drafts").insert({
        "order_id": order_id,
        "draft_type": "PRODUCTION_PLAN",
        "provider": None,
        "input_snapshot": {
            "title": order["title"],
            "description": order.get("description"),
            "required_by_date": str(order["required_by_date"]),
            "items": order.get("order_items", []),
        },
        "status": "PENDING",
    }).execute()

    draft_id = draft.data[0]["id"]

    # Run AI generation in the background
    background_tasks.add_task(_run_plan_generation, draft_id, order, db)

    return success_response({"draft_id": draft_id, "status": "PENDING"})


def _run_plan_generation(draft_id: str, order: dict, db) -> None:
    """Background task: call AI, validate output, update draft record."""
    from app.ai.adapter import ai_adapter

    try:
        order_context = {
            "title": order["title"],
            "description": order.get("description", ""),
            "required_by_date": str(order["required_by_date"]),
            "items": order.get("order_items", []),
        }
        plan = ai_adapter.generate_production_plan(order_context)

        if plan is None:
            db.table("ai_drafts").update({
                "status": "INVALID",
                "validation_errors": [{"error": "AI provider returned invalid or empty output"}],
            }).eq("id", draft_id).execute()
            return

        db.table("ai_drafts").update({
            "status": "VALID",
            "output": plan.model_dump(),
            "provider": "ai_adapter",
        }).eq("id", draft_id).execute()

    except Exception as exc:
        db.table("ai_drafts").update({
            "status": "INVALID",
            "validation_errors": [{"error": str(exc)}],
        }).eq("id", draft_id).execute()


@router.get("/orders/{order_id}/plan/drafts/{draft_id}")
async def get_plan_draft(
    order_id: str,
    draft_id: str,
    token: CurrentToken,
    db: SupabaseClient,
):
    """Poll the status of an AI plan draft."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    result = db.table("ai_drafts").select("*").eq("id", draft_id).eq("order_id", order_id).single().execute()
    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Draft not found", status_code=404)

    return success_response(result.data)


@router.post("/orders/{order_id}/plan/confirm")
async def confirm_plan(
    order_id: str,
    body: ConfirmPlanRequest,
    token: CurrentToken,
    db: SupabaseClient,
):
    """
    Leader confirms an AI plan draft — creates production_plan + plan_stages.
    This is the human approval step.
    """
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    order = get_order_or_404(order_id, shg_id, db)

    # Fetch the draft
    draft_result = db.table("ai_drafts").select("*").eq("id", body.plan_id).eq("order_id", order_id).single().execute()
    if not draft_result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Draft not found", status_code=404)
    draft = draft_result.data
    if draft["status"] != "VALID":
        raise AshaAPIError(
            code="CONFLICT",
            message=f"Draft is not ready for confirmation (status: {draft['status']})",
            status_code=409,
        )

    plan_output = draft["output"]
    today = datetime.now(timezone.utc).date()

    # Create the production plan
    plan_result = db.table("production_plans").insert({
        "order_id": order_id,
        "summary": plan_output.get("summary"),
        "planned_start_date": str(today),
        "planned_end_date": str(today + timedelta(days=plan_output.get("total_days", 7))),
        "created_by_ai": True,
        "confirmed_by": token.sub,
        "confirmed_at": datetime.now(timezone.utc).isoformat(),
        "status": "CONFIRMED",
    }).execute()
    plan_id = plan_result.data[0]["id"]

    # Create stages
    stages_data = []
    start = today
    for stage in plan_output.get("stages", []):
        end = start + timedelta(days=max(1, stage.get("planned_days", 1)))
        stages_data.append({
            "production_plan_id": plan_id,
            "stage_name": stage["stage_name"],
            "stage_order": stage["stage_order"],
            "requires_skill": stage.get("requires_skill"),
            "planned_start_date": str(start),
            "planned_end_date": str(end),
            "is_quality_checkpoint": stage.get("is_quality_checkpoint", False),
        })
        start = end

    if stages_data:
        db.table("plan_stages").insert(stages_data).execute()

    # Mark draft as reviewed
    db.table("ai_drafts").update({
        "status": "REVIEWED",
        "reviewed_by": token.sub,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", body.plan_id).execute()

    # Transition order to PLANNING
    db.table("orders").update({"status": "PLANNING"}).eq("id", order_id).execute()

    _record_audit(
        db=db, shg_id=shg_id, order_id=order_id, actor_id=token.sub,
        event_type="PLAN_CONFIRMED", entity_type="production_plan", entity_id=plan_id,
        new_values={"status": "CONFIRMED", "stages": len(stages_data)},
    )

    plan_result_full = db.table("production_plans").select("*, plan_stages(*)").eq("id", plan_id).single().execute()
    return success_response(plan_result_full.data)


@router.get("/orders/{order_id}/plan")
async def get_plan(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Get the confirmed production plan for an order."""
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    result = db.table("production_plans").select("*, plan_stages(*)") \
        .eq("order_id", order_id).eq("status", "CONFIRMED") \
        .order("created_at", desc=True).limit(1).execute()

    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="No confirmed plan found", status_code=404)
    return success_response(result.data[0])


# ─────────────────────────────────────
# Allocation
# ─────────────────────────────────────

@router.post("/orders/{order_id}/allocation/propose")
async def propose_allocation_endpoint(
    order_id: str,
    body: ProposeAllocationRequest,
    token: CurrentToken,
    db: SupabaseClient,
):
    """
    Run the deterministic allocation engine for a task.
    Returns a scored proposal — leader must confirm it.
    """
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    # Fetch the task
    task_result = db.table("tasks").select("*").eq("id", body.task_id).eq("order_id", order_id).single().execute()
    if not task_result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Task not found", status_code=404)
    task = task_result.data

    # Fetch all SHG members with skills
    members_result = db.table("shg_members").select("*, member_skills(*)") \
        .eq("shg_id", shg_id).eq("is_active", True).is_("deleted_at", "null").execute()

    # Get current workloads (sum of allocated_quantity in active task_assignments)
    workload_result = db.table("task_assignments").select("shg_member_id, allocated_quantity") \
        .execute()
    workloads: dict[str, int] = {}
    for row in workload_result.data or []:
        mid = row["shg_member_id"]
        workloads[mid] = workloads.get(mid, 0) + row["allocated_quantity"]

    # Build MemberProfile list
    profiles: list[MemberProfile] = []
    for m in members_result.data or []:
        profiles.append(MemberProfile(
            id=m["id"],
            name=m["member_name"],
            skills=[{"skill": s["skill"], "proficiency": s["proficiency"]} for s in (m.get("member_skills") or [])],
            daily_capacity=m["daily_capacity"],
            weekly_capacity=m["weekly_capacity"],
            availability_status=m["availability_status"],
            current_workload=workloads.get(m["id"], 0),
            past_acceptance_rate=float(m.get("past_acceptance_rate") or 0),
            past_rework_rate=float(m.get("past_rework_rate") or 0),
            past_on_time_rate=float(m.get("past_on_time_rate") or 0),
        ))

    # Run the deterministic engine
    proposal: AllocationProposal = propose_allocation(
        members=profiles,
        total_quantity=task["allocated_quantity"],
        required_skill=task.get("required_skill"),
    )

    return success_response({
        "task_id": body.task_id,
        "total_quantity": proposal.total_quantity,
        "required_skill": proposal.required_skill,
        "allocations": [
            {
                "member_id": a.member_id,
                "member_name": a.member_name,
                "allocated_quantity": a.allocated_quantity,
                "score": a.score,
                "scores": {
                    "skill": a.skill_score,
                    "capacity": a.capacity_score,
                    "availability": a.availability_score,
                    "workload": a.workload_score,
                    "quality": a.quality_score,
                },
                "reasons": a.reasons,
            }
            for a in proposal.allocations
        ],
        "warnings": proposal.warnings,
        "unallocated": proposal.unallocated,
    })


@router.post("/orders/{order_id}/allocation/confirm")
async def confirm_allocation(
    order_id: str,
    body: ConfirmAllocationRequest,
    token: CurrentToken,
    db: SupabaseClient,
):
    """
    Leader confirms the allocation — creates task_assignments and transitions order.
    This is the final human approval step.
    """
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    # Validate task
    task_result = db.table("tasks").select("*").eq("id", body.task_id).eq("order_id", order_id).single().execute()
    if not task_result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Task not found", status_code=404)

    # Validate total doesn't exceed task quantity
    task = task_result.data
    total = sum(a["allocated_quantity"] for a in body.allocations)
    if total > task["allocated_quantity"]:
        raise AshaAPIError(
            code="VALIDATION_ERROR",
            message=f"Total allocated ({total}) exceeds task quantity ({task['allocated_quantity']})",
            status_code=422,
        )

    # Delete existing assignments for this task
    db.table("task_assignments").delete().eq("task_id", body.task_id).execute()

    # Create new assignments
    assignments_data = [
        {
            "task_id": body.task_id,
            "shg_member_id": a["member_id"],
            "allocated_quantity": a["allocated_quantity"],
            "member_response": "PENDING",
        }
        for a in body.allocations
        if a["allocated_quantity"] > 0
    ]
    if assignments_data:
        db.table("task_assignments").insert(assignments_data).execute()

    # Update task status to ASSIGNED
    db.table("tasks").update({"status": "ASSIGNED"}).eq("id", body.task_id).execute()

    # Transition order to ALLOCATION_PENDING if not already
    db.table("orders").update({"status": "ALLOCATION_PENDING"}).eq("id", order_id).execute()

    _record_audit(
        db=db, shg_id=shg_id, order_id=order_id, actor_id=token.sub,
        event_type="ALLOCATION_CONFIRMED", entity_type="task", entity_id=body.task_id,
        new_values={"assignments": len(assignments_data), "total_allocated": total},
    )

    result = db.table("task_assignments").select("*").eq("task_id", body.task_id).execute()
    return success_response(result.data)


@router.patch("/orders/{order_id}/allocation/adjust")
async def adjust_allocation(
    order_id: str,
    body: AdjustAllocationRequest,
    token: CurrentToken,
    db: SupabaseClient,
):
    """Leader adjusts one member's allocation with a required reason."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    if not body.reason or not body.reason.strip():
        raise AshaAPIError(
            code="VALIDATION_ERROR",
            message="A reason is required when adjusting allocation",
            status_code=422,
        )

    # Find existing assignment
    assign_result = db.table("task_assignments").select("*") \
        .eq("task_id", body.task_id).eq("shg_member_id", body.member_id).single().execute()

    if not assign_result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Assignment not found", status_code=404)

    old_qty = assign_result.data["allocated_quantity"]
    db.table("task_assignments").update(
        {"allocated_quantity": body.new_quantity}
    ).eq("task_id", body.task_id).eq("shg_member_id", body.member_id).execute()

    _record_audit(
        db=db, shg_id=shg_id, order_id=order_id, actor_id=token.sub,
        event_type="ALLOCATION_ADJUSTED", entity_type="task_assignment",
        entity_id=assign_result.data["id"],
        old_values={"allocated_quantity": old_qty},
        new_values={"allocated_quantity": body.new_quantity},
        reason=body.reason,
    )

    return success_response({"task_id": body.task_id, "member_id": body.member_id, "new_quantity": body.new_quantity})


@router.get("/orders/{order_id}/allocation/explanation")
async def get_allocation_explanation(
    order_id: str,
    token: CurrentToken,
    db: SupabaseClient,
):
    """Get an AI-generated plain-language explanation of the current allocation."""
    shg_id = _get_user_shg_id(token.sub, db)
    get_order_or_404(order_id, shg_id, db)

    # Fetch current assignments
    tasks_result = db.table("tasks").select("*, task_assignments(*, shg_members(member_name))") \
        .eq("order_id", order_id).execute()

    if not tasks_result.data:
        raise AshaAPIError(code="NOT_FOUND", message="No tasks found for this order", status_code=404)

    allocation_data = []
    for task in tasks_result.data:
        for assignment in task.get("task_assignments") or []:
            member_name = (assignment.get("shg_members") or {}).get("member_name", "Unknown")
            allocation_data.append({
                "task": task["task_name"],
                "member": member_name,
                "quantity": assignment["allocated_quantity"],
            })

    if not allocation_data:
        return success_response({
            "summary": "No allocation has been confirmed yet.",
            "member_explanations": [],
        })

    from app.ai.adapter import ai_adapter
    explanation = ai_adapter.explain_allocation({"allocations": allocation_data})

    if explanation:
        return success_response(explanation.model_dump())

    # Fallback if AI unavailable
    return success_response({
        "summary": f"Work for order #{order_id[:8]} has been distributed across {len(set(a['member'] for a in allocation_data))} members.",
        "member_explanations": [
            {"member_name": a["member"], "allocated_quantity": a["quantity"], "reason": "Assigned by leader"}
            for a in allocation_data
        ],
    })


# ─────────────────────────────────────
# Task creation helper (called after plan confirm)
# ─────────────────────────────────────

@router.post("/orders/{order_id}/tasks/create-from-plan")
async def create_tasks_from_plan(
    order_id: str,
    token: CurrentToken,
    db: SupabaseClient,
):
    """Create tasks from the confirmed production plan stages."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    order = get_order_or_404(order_id, shg_id, db)

    # Get confirmed plan
    plan_result = db.table("production_plans").select("*, plan_stages(*)") \
        .eq("order_id", order_id).eq("status", "CONFIRMED").order("created_at", desc=True).limit(1).execute()

    if not plan_result.data:
        raise AshaAPIError(code="NOT_FOUND", message="No confirmed plan found", status_code=404)

    plan = plan_result.data[0]
    stages = plan.get("plan_stages", [])
    items = order.get("order_items", [])
    total_qty = sum(i["quantity"] for i in items) if items else 0

    tasks_data = []
    for stage in stages:
        tasks_data.append({
            "order_id": order_id,
            "production_plan_id": plan["id"],
            "plan_stage_id": stage["id"],
            "task_name": stage["stage_name"],
            "task_type": "STAGE_BASED",
            "required_skill": stage.get("requires_skill"),
            "allocated_quantity": total_qty,
            "due_date": stage.get("planned_end_date"),
            "status": "PROPOSED",
        })

    if tasks_data:
        db.table("tasks").insert(tasks_data).execute()

    return success_response({"tasks_created": len(tasks_data)})
