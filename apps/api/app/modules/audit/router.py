from fastapi import APIRouter, Depends
from app.core.security import verify_token
from app.modules.audit.service import get_order_audit_events

router = APIRouter(prefix="/orders", tags=["Audit"])

@router.get("/{order_id}/audit")
def list_order_audit(order_id: str, user=Depends(verify_token)):
    events = get_order_audit_events(order_id)
    return {"success": True, "data": events, "meta": {"count": len(events)}}
