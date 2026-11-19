from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

class AuditEventCreate(BaseModel):
    shg_id: Optional[str] = None
    order_id: Optional[str] = None
    actor_profile_id: Optional[str] = None
    event_type: str
    entity_type: str
    entity_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    reason: Optional[str] = None
    metadata: Dict[str, Any] = {}

class AuditEventResponse(AuditEventCreate):
    id: str
    created_at: datetime
