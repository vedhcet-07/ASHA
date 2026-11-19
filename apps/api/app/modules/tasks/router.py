from fastapi import APIRouter, Depends
from app.core.security import verify_token
from app.modules.tasks.schemas import TaskProgressUpdate, TaskRejectRequest, ProofUploadUrlRequest, ProofCompleteRequest
from app.modules.tasks.service import list_member_tasks, get_task_by_id, update_task_progress, accept_task, reject_task, add_task_proof
from app.core.errors import NotFoundError
from app.modules.audit.service import create_audit_event
from app.modules.audit.schemas import AuditEventCreate

router = APIRouter(prefix="/member", tags=["Member Tasks"])

@router.get("/tasks")
def get_my_tasks(user=Depends(verify_token)):
    tasks = list_member_tasks()
    return {"success": True, "data": tasks}

@router.get("/tasks/{task_id}")
def get_task_details(task_id: str, user=Depends(verify_token)):
    task = get_task_by_id(task_id)
    if not task:
        raise NotFoundError("Task not found")
    return {"success": True, "data": task}

@router.post("/tasks/{task_id}/accept")
def accept_task_route(task_id: str, user=Depends(verify_token)):
    t = accept_task(task_id)
    if not t:
        raise NotFoundError("Task not found")
    create_audit_event(AuditEventCreate(
        order_id=t.get("order_id"),
        event_type="TASK_ACCEPTED",
        entity_type="task",
        entity_id=task_id
    ))
    return {"success": True, "data": t}

@router.post("/tasks/{task_id}/reject")
def reject_task_route(task_id: str, req: TaskRejectRequest, user=Depends(verify_token)):
    t = reject_task(task_id, req.reason)
    if not t:
        raise NotFoundError("Task not found")
    create_audit_event(AuditEventCreate(
        order_id=t.get("order_id"),
        event_type="TASK_REJECTED",
        entity_type="task",
        entity_id=task_id,
        reason=req.reason
    ))
    return {"success": True, "data": t}

@router.post("/tasks/{task_id}/progress")
def submit_progress(task_id: str, req: TaskProgressUpdate, user=Depends(verify_token)):
    t = update_task_progress(task_id, req.quantity_completed, req.note)
    if not t:
        raise NotFoundError("Task not found")
    create_audit_event(AuditEventCreate(
        order_id=t.get("order_id"),
        event_type="TASK_PROGRESS_UPDATED",
        entity_type="task",
        entity_id=task_id,
        new_values={"completed_quantity": req.quantity_completed}
    ))
    return {"success": True, "data": t}

@router.post("/tasks/{task_id}/proof/upload-url")
def request_proof_upload_url(task_id: str, req: ProofUploadUrlRequest, user=Depends(verify_token)):
    media_id = f"media-{uuid.uuid4().hex[:6]}"
    return {
        "success": True,
        "data": {
            "media_id": media_id,
            "upload_url": f"https://mock-storage.supabase.co/upload/{media_id}",
            "storage_path": f"https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400"
        }
    }

@router.post("/tasks/{task_id}/proof/{media_id}/complete")
def complete_proof_upload(task_id: str, media_id: str, req: ProofCompleteRequest, user=Depends(verify_token)):
    media = add_task_proof(task_id, req.storage_path)
    create_audit_event(AuditEventCreate(
        event_type="PROOF_UPLOADED",
        entity_type="proof_media",
        entity_id=media_id
    ))
    return {"success": True, "data": media}

@router.get("/tasks/{task_id}/voice")
def get_task_voice_script(task_id: str, user=Depends(verify_token)):
    t = get_task_by_id(task_id)
    if not t:
        raise NotFoundError("Task not found")
    text = f"Hello {t.get('assigned_member_name', 'Member')}. Your assigned work is {t['task_name']}, quantity {t['allocated_quantity']} units. Completed: {t['completed_quantity']} units. Due date is {t['due_date']}."
    return {"success": True, "data": {"text": text}}

@router.get("/earnings")
def get_my_earnings(user=Depends(verify_token)):
    return {
        "success": True,
        "data": {
            "member_name": "Lakshmi Gowda",
            "total_accepted_quantity": 18,
            "rate_per_unit": 20.0,
            "expected_payout": 360.0,
            "payout_status": "PENDING_APPROVAL"
        }
    }
