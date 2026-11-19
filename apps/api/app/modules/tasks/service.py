import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

_tasks_store: List[Dict[str, Any]] = [
    {
        "id": "task-001",
        "order_id": "ord-001",
        "task_name": "Stitch Canvas Tote Bags",
        "task_type": "PIECE_BASED",
        "required_skill": "STITCHING",
        "allocated_quantity": 25,
        "completed_quantity": 10,
        "accepted_quantity": 0,
        "rework_quantity": 0,
        "rejected_quantity": 0,
        "due_date": "2026-12-04",
        "status": "IN_PROGRESS",
        "assigned_member_id": "mem-01",
        "assigned_member_name": "Lakshmi Gowda",
        "rate_per_unit": 20.0,
        "proofs": [
            {
                "id": "media-001",
                "media_type": "PHOTO",
                "storage_path": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400",
                "file_name": "batch_1_seams.jpg",
                "status": "SUBMITTED",
                "uploaded_at": "2026-11-17T12:00:00Z"
            }
        ]
    },
    {
        "id": "task-002",
        "order_id": "ord-001",
        "task_name": "Stitch Canvas Tote Bags",
        "task_type": "PIECE_BASED",
        "required_skill": "STITCHING",
        "allocated_quantity": 25,
        "completed_quantity": 25,
        "accepted_quantity": 20,
        "rework_quantity": 5,
        "rejected_quantity": 0,
        "due_date": "2026-12-04",
        "status": "QUALITY_REVIEW",
        "assigned_member_id": "mem-02",
        "assigned_member_name": "Meena Devi",
        "rate_per_unit": 20.0,
        "proofs": [
            {
                "id": "media-002",
                "media_type": "PHOTO",
                "storage_path": "https://images.unsplash.com/photo-1597484662317-9bd7bdda2907?auto=format&fit=crop&q=80&w=400",
                "file_name": "tote_batch_meena.jpg",
                "status": "SUBMITTED",
                "uploaded_at": "2026-11-17T14:30:00Z"
            }
        ]
    },
    {
        "id": "task-003",
        "order_id": "ord-001",
        "task_name": "Pack & Bundle Finished Bags",
        "task_type": "STAGE_BASED",
        "required_skill": "PACKING",
        "allocated_quantity": 50,
        "completed_quantity": 0,
        "accepted_quantity": 0,
        "rework_quantity": 0,
        "rejected_quantity": 0,
        "due_date": "2026-12-05",
        "status": "ASSIGNED",
        "assigned_member_id": "mem-03",
        "assigned_member_name": "Radha Bai",
        "rate_per_unit": 5.0,
        "proofs": []
    }
]

def create_member_tasks_from_allocation(order_id: str, allocations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    created = []
    for item in allocations:
        tid = f"task-{uuid.uuid4().hex[:6]}"
        t = {
            "id": tid,
            "order_id": order_id,
            "task_name": "Stitch Canvas Tote Bags",
            "task_type": "PIECE_BASED",
            "required_skill": "STITCHING",
            "allocated_quantity": item["allocated_quantity"],
            "completed_quantity": 0,
            "accepted_quantity": 0,
            "rework_quantity": 0,
            "rejected_quantity": 0,
            "due_date": "2026-12-04",
            "status": "ASSIGNED",
            "assigned_member_id": item["member_id"],
            "assigned_member_name": item["member_name"],
            "rate_per_unit": 20.0,
            "proofs": []
        }
        _tasks_store.append(t)
        created.append(t)
    return created

def list_member_tasks(member_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if member_id:
        return [t for t in _tasks_store if t.get("assigned_member_id") == member_id]
    return _tasks_store

def get_task_by_id(task_id: str) -> Optional[Dict[str, Any]]:
    for t in _tasks_store:
        if t["id"] == task_id:
            return t
    return None

def update_task_progress(task_id: str, quantity_completed: int, note: Optional[str] = None) -> Optional[Dict[str, Any]]:
    t = get_task_by_id(task_id)
    if t:
        t["completed_quantity"] = quantity_completed
        if t["status"] in ["ASSIGNED", "ACCEPTED"]:
            t["status"] = "IN_PROGRESS"
        if quantity_completed >= t["allocated_quantity"]:
            t["status"] = "QUALITY_REVIEW"
        t["last_progress_note"] = note
        t["updated_at"] = datetime.now(timezone.utc).isoformat()
    return t

def accept_task(task_id: str) -> Optional[Dict[str, Any]]:
    t = get_task_by_id(task_id)
    if t:
        t["status"] = "ACCEPTED"
        t["member_response"] = "ACCEPTED"
    return t

def reject_task(task_id: str, reason: str) -> Optional[Dict[str, Any]]:
    t = get_task_by_id(task_id)
    if t:
        t["status"] = "REJECTED_BY_MEMBER"
        t["member_response"] = "REJECTED"
        t["rejection_reason"] = reason
    return t

def add_task_proof(task_id: str, storage_path: str, media_type: str = "PHOTO", file_name: str = "proof.jpg") -> Dict[str, Any]:
    t = get_task_by_id(task_id)
    media = {
        "id": f"media-{uuid.uuid4().hex[:6]}",
        "media_type": media_type,
        "storage_path": storage_path,
        "file_name": file_name,
        "status": "SUBMITTED",
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    if t:
        t.setdefault("proofs", []).append(media)
        t["status"] = "QUALITY_REVIEW"
    return media
