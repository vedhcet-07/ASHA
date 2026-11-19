from fastapi import APIRouter, Depends
from app.core.security import verify_token, require_role
from app.modules.quality.schemas import QualityReviewDecision, ReworkTaskCreate
from app.modules.quality.service import get_review_queue, submit_quality_decision, get_ai_rework_suggestion
from app.modules.tasks.service import get_task_by_id
from app.core.errors import NotFoundError
from app.modules.audit.service import create_audit_event
from app.modules.audit.schemas import AuditEventCreate

router = APIRouter(prefix="/quality", tags=["Quality"])

@router.get("/review-queue")
def review_queue(user=Depends(verify_token)):
    queue = get_review_queue()
    return {"success": True, "data": queue, "meta": {"count": len(queue)}}

@router.get("/tasks/{task_id}")
def quality_task_context(task_id: str, user=Depends(verify_token)):
    task = get_task_by_id(task_id)
    if not task:
        raise NotFoundError("Task not found")
    return {"success": True, "data": task}

@router.post("/tasks/{task_id}/review")
def review_task(task_id: str, req: QualityReviewDecision, user=Depends(require_role("leader", "checker"))):
    rev = submit_quality_decision(task_id, req.decision, req.reviewed_quantity, req.reason)
    if not rev:
        raise NotFoundError("Task not found")
    create_audit_event(AuditEventCreate(
        event_type="QUALITY_REVIEW_COMPLETED",
        entity_type="quality_review",
        entity_id=rev["id"],
        new_values={"decision": req.decision, "quantity": req.reviewed_quantity},
        reason=req.reason
    ))
    return {"success": True, "data": rev}

@router.get("/tasks/{task_id}/ai-suggestion")
def rework_note_suggestion(task_id: str, reason: str = "Uneven thread tension", user=Depends(verify_token)):
    note = get_ai_rework_suggestion(task_id, reason)
    return {"success": True, "data": {"suggested_note": note}}
