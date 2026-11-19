import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.modules.tasks.service import _tasks_store, get_task_by_id
from app.ai.providers.factory import get_ai_provider

_quality_reviews_store: List[Dict[str, Any]] = []

def get_review_queue() -> List[Dict[str, Any]]:
    return [t for t in _tasks_store if t.get("status") == "QUALITY_REVIEW" or (t.get("proofs") and len(t["proofs"]) > 0)]

def submit_quality_decision(task_id: str, decision: str, reviewed_quantity: int, reason: Optional[str] = None) -> Dict[str, Any]:
    task = get_task_by_id(task_id)
    if not task:
        return None
    
    review_id = f"rev-{uuid.uuid4().hex[:6]}"
    review = {
        "id": review_id,
        "task_id": task_id,
        "decision": decision,
        "reviewed_quantity": reviewed_quantity,
        "reason": reason,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    _quality_reviews_store.append(review)
    
    if decision == "ACCEPTED":
        task["status"] = "ACCEPTED"
        task["accepted_quantity"] = reviewed_quantity
    elif decision == "REWORK":
        task["status"] = "REWORK"
        task["rework_quantity"] = reviewed_quantity
        # Automatically spawn rework tracking task
        spawn_rework_task(task, reviewed_quantity, reason)
    elif decision == "REJECTED":
        task["status"] = "REJECTED"
        task["rejected_quantity"] = reviewed_quantity
    
    return review

def spawn_rework_task(original_task: Dict[str, Any], qty: int, reason: Optional[str] = None) -> Dict[str, Any]:
    rework_task_id = f"rework-{uuid.uuid4().hex[:6]}"
    rework = {
        "id": rework_task_id,
        "order_id": original_task.get("order_id"),
        "task_name": f"Rework: {original_task.get('task_name')}",
        "task_type": original_task.get("task_type", "PIECE_BASED"),
        "required_skill": original_task.get("required_skill"),
        "allocated_quantity": qty,
        "completed_quantity": 0,
        "accepted_quantity": 0,
        "rework_quantity": 0,
        "rejected_quantity": 0,
        "due_date": original_task.get("due_date"),
        "status": "ASSIGNED",
        "assigned_member_id": original_task.get("assigned_member_id"),
        "assigned_member_name": original_task.get("assigned_member_name"),
        "is_rework": True,
        "original_task_id": original_task.get("id"),
        "rework_reason": reason,
        "proofs": []
    }
    _tasks_store.append(rework)
    return rework

def get_ai_rework_suggestion(task_id: str, reason: str) -> str:
    task = get_task_by_id(task_id)
    member_name = task.get("assigned_member_name", "Member") if task else "Member"
    task_name = task.get("task_name", "Stitching") if task else "Stitching"
    ai = get_ai_provider()
    return ai.draft_rework_note(task_name, member_name, reason)
