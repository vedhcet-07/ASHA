import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any
from app.core.dependencies import get_supabase_client
from app.modules.audit.schemas import AuditEventCreate

_in_memory_audit: List[Dict[str, Any]] = []

def create_audit_event(event: AuditEventCreate) -> Dict[str, Any]:
    supabase = get_supabase_client()
    event_dict = event.model_dump()
    event_dict["id"] = str(uuid.uuid4())
    event_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    if supabase:
        try:
            supabase.table("audit_events").insert(event_dict).execute()
        except Exception:
            pass
    _in_memory_audit.append(event_dict)
    return event_dict

def get_order_audit_events(order_id: str) -> List[Dict[str, Any]]:
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.table("audit_events").select("*").eq("order_id", order_id).order("created_at", desc=True).execute()
            if res.data:
                return res.data
        except Exception:
            pass
    return [e for e in _in_memory_audit if e.get("order_id") == order_id]
