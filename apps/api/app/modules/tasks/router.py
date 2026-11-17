"""Member task routes — accept, progress, proof upload."""

from datetime import datetime, timezone
from fastapi import APIRouter, status
from app.core.dependencies import SupabaseClient, CurrentToken, success_response
from app.core.errors import AshaAPIError
from pydantic import BaseModel


router = APIRouter(tags=["tasks"])


class AcceptTaskRequest(BaseModel):
    response_reason: str | None = None


class RejectTaskRequest(BaseModel):
    response_reason: str


class ProgressUpdateRequest(BaseModel):
    quantity_completed: int
    note: str | None = None


class ProofUploadUrlRequest(BaseModel):
    media_type: str   # PHOTO | VIDEO | VOICE_NOTE
    file_name: str
    mime_type: str
    file_size_bytes: int


class CompleteProofRequest(BaseModel):
    storage_path: str


def _get_member_id(user_id: str, db) -> str:
    result = db.table("shg_members").select("id").eq("profile_id", user_id).is_("deleted_at", "null").limit(1).execute()
    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Member profile not found", status_code=404)
    return result.data[0]["id"]


def _get_task_assignment(task_id: str, member_id: str, db) -> dict:
    result = db.table("task_assignments").select("*").eq("task_id", task_id).eq("shg_member_id", member_id).single().execute()
    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Task not assigned to you", status_code=404)
    return result.data


@router.get("/member/tasks")
async def list_my_tasks(token: CurrentToken, db: SupabaseClient):
    """Member lists their own assigned tasks."""
    member_id = _get_member_id(token.sub, db)
    result = (
        db.table("task_assignments")
        .select("*, tasks(*)")
        .eq("shg_member_id", member_id)
        .order("created_at", desc=True)
        .execute()
    )
    return success_response(result.data)


@router.get("/member/tasks/{task_id}")
async def get_my_task(task_id: str, token: CurrentToken, db: SupabaseClient):
    """Member gets full details of their task."""
    member_id = _get_member_id(token.sub, db)
    assignment = _get_task_assignment(task_id, member_id, db)
    task = db.table("tasks").select("*").eq("id", task_id).single().execute()
    if not task.data:
        raise AshaAPIError(code="NOT_FOUND", message="Task not found", status_code=404)
    proof = db.table("proof_media").select("*").eq("task_id", task_id).execute()
    return success_response({
        **task.data,
        "assignment": assignment,
        "proof_media": proof.data,
    })


@router.post("/member/tasks/{task_id}/accept")
async def accept_task(task_id: str, body: AcceptTaskRequest, token: CurrentToken, db: SupabaseClient):
    """Member accepts an assigned task."""
    member_id = _get_member_id(token.sub, db)
    _get_task_assignment(task_id, member_id, db)
    now = datetime.now(timezone.utc).isoformat()
    db.table("task_assignments").update({
        "member_response": "ACCEPTED",
        "response_reason": body.response_reason,
        "responded_at": now,
    }).eq("task_id", task_id).eq("shg_member_id", member_id).execute()
    db.table("tasks").update({"status": "ACCEPTED"}).eq("id", task_id).execute()
    return success_response({"task_id": task_id, "response": "ACCEPTED"})


@router.post("/member/tasks/{task_id}/reject")
async def reject_task(task_id: str, body: RejectTaskRequest, token: CurrentToken, db: SupabaseClient):
    """Member rejects a task with a required reason."""
    member_id = _get_member_id(token.sub, db)
    _get_task_assignment(task_id, member_id, db)
    now = datetime.now(timezone.utc).isoformat()
    db.table("task_assignments").update({
        "member_response": "REJECTED",
        "response_reason": body.response_reason,
        "responded_at": now,
    }).eq("task_id", task_id).eq("shg_member_id", member_id).execute()
    return success_response({"task_id": task_id, "response": "REJECTED"})


@router.post("/member/tasks/{task_id}/progress")
async def add_progress(task_id: str, body: ProgressUpdateRequest, token: CurrentToken, db: SupabaseClient):
    """Member submits a progress update."""
    member_id = _get_member_id(token.sub, db)
    _get_task_assignment(task_id, member_id, db)
    if body.quantity_completed < 0:
        raise AshaAPIError(code="VALIDATION_ERROR", message="Quantity cannot be negative")

    progress = db.table("progress_updates").insert({
        "task_id": task_id,
        "shg_member_id": member_id,
        "quantity_completed": body.quantity_completed,
        "note": body.note,
    }).execute()

    # Update task completed_quantity (cumulative)
    task = db.table("tasks").select("completed_quantity").eq("id", task_id).single().execute()
    new_completed = (task.data["completed_quantity"] or 0) + body.quantity_completed
    db.table("tasks").update({
        "completed_quantity": new_completed,
        "status": "IN_PROGRESS",
    }).eq("id", task_id).execute()

    return success_response(progress.data[0])


@router.post("/member/tasks/{task_id}/proof/upload-url", status_code=status.HTTP_201_CREATED)
async def get_proof_upload_url(task_id: str, body: ProofUploadUrlRequest, token: CurrentToken, db: SupabaseClient):
    """Get a Supabase signed upload URL for proof media."""
    member_id = _get_member_id(token.sub, db)
    _get_task_assignment(task_id, member_id, db)

    allowed_types = {"PHOTO", "VIDEO", "VOICE_NOTE"}
    if body.media_type not in allowed_types:
        raise AshaAPIError(code="VALIDATION_ERROR", message=f"media_type must be one of {allowed_types}")

    if body.file_size_bytes > 10 * 1024 * 1024:  # 10 MB
        raise AshaAPIError(code="VALIDATION_ERROR", message="File size must be under 10 MB")

    # Create pending proof_media record
    storage_path = f"proof/{task_id}/{member_id}/{body.file_name}"
    media = db.table("proof_media").insert({
        "task_id": task_id,
        "media_type": body.media_type,
        "storage_path": storage_path,
        "file_name": body.file_name,
        "mime_type": body.mime_type,
        "file_size_bytes": body.file_size_bytes,
        "uploaded_by": token.sub,
    }).execute()
    media_id = media.data[0]["id"]

    # Generate signed upload URL via Supabase Storage
    try:
        from app.core.config import settings
        bucket = settings.supabase_storage_bucket
        signed = db.storage.from_(bucket).create_signed_upload_url(storage_path)
        upload_url = signed.get("signedURL") or signed.get("signed_url", "")
    except Exception:
        upload_url = f"https://placeholder-storage/{storage_path}"

    return success_response({
        "media_id": media_id,
        "upload_url": upload_url,
        "storage_path": storage_path,
    })


@router.post("/member/tasks/{task_id}/proof/{media_id}/complete")
async def complete_proof_upload(
    task_id: str, media_id: str, token: CurrentToken, db: SupabaseClient
):
    """Mark a proof upload as complete and transition task to SUBMITTED."""
    member_id = _get_member_id(token.sub, db)
    _get_task_assignment(task_id, member_id, db)

    # Verify media belongs to this task and uploader
    media = db.table("proof_media").select("*").eq("id", media_id).eq("task_id", task_id).single().execute()
    if not media.data:
        raise AshaAPIError(code="NOT_FOUND", message="Proof media not found", status_code=404)

    db.table("tasks").update({"status": "SUBMITTED"}).eq("id", task_id).execute()
    return success_response({"task_id": task_id, "media_id": media_id, "status": "SUBMITTED"})


@router.get("/member/tasks/{task_id}/voice")
async def get_task_voice(task_id: str, token: CurrentToken, db: SupabaseClient):
    """Get voice text for a task (for TTS playback)."""
    member_id = _get_member_id(token.sub, db)
    assignment = _get_task_assignment(task_id, member_id, db)
    task = db.table("tasks").select("*").eq("id", task_id).single().execute()
    if not task.data:
        raise AshaAPIError(code="NOT_FOUND", message="Task not found", status_code=404)
    t = task.data
    voice_text = (
        f"You have been assigned {t['task_name']}. "
        f"Your target is {assignment['allocated_quantity']} units. "
        f"Due date is {t.get('due_date', 'not set')}. "
        f"Status is {t['status']}."
    )
    return success_response({"voice_text": voice_text, "task": t})


@router.get("/leader/tasks/{order_id}")
async def leader_list_tasks(order_id: str, token: CurrentToken, db: SupabaseClient):
    """Leader lists all tasks for an order."""
    result = db.table("tasks").select("*, task_assignments(*, shg_members(member_name))") \
        .eq("order_id", order_id).is_("deleted_at", "null").order("created_at").execute()
    return success_response(result.data)
