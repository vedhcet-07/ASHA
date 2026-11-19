from fastapi import APIRouter, Depends
from app.core.security import verify_token

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("")
def list_notifications(user=Depends(verify_token)):
    return {
        "success": True,
        "data": [
            {
                "id": "notif-1",
                "title": "New Batch Submitted",
                "message": "Meena Devi submitted 25 units for Quality Review.",
                "type": "QUALITY_REVIEW_REQUIRED",
                "is_read": False,
                "created_at": "2026-11-18T14:30:00Z"
            },
            {
                "id": "notif-2",
                "title": "Payout Ready for Approval",
                "message": "Order #ORD-2026-001 payout sheet is ready for group review.",
                "type": "PAYOUT_READY",
                "is_read": False,
                "created_at": "2026-11-18T10:00:00Z"
            }
        ]
    }

@router.post("/{notification_id}/read")
def mark_read(notification_id: str, user=Depends(verify_token)):
    return {"success": True, "data": {"id": notification_id, "is_read": True}}
