from typing import Optional, Dict, Any, List
from pydantic import BaseModel

class TaskProgressUpdate(BaseModel):
    quantity_completed: int
    note: Optional[str] = None
    voice_note_url: Optional[str] = None

class TaskRejectRequest(BaseModel):
    reason: str

class ProofUploadUrlRequest(BaseModel):
    media_type: str = "PHOTO"
    file_name: str
    mime_type: str = "image/jpeg"
    file_size_bytes: int = 250000

class ProofCompleteRequest(BaseModel):
    storage_path: str
