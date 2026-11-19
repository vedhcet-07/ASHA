from fastapi import APIRouter, Depends
from app.core.security import verify_token, require_role
from app.modules.payouts.schemas import PayoutApprovalRequest
from app.modules.payouts.service import get_order_payout_sheet, recalculate_payout_from_tasks, approve_payout, get_payout_explanation
from app.core.errors import NotFoundError
from app.modules.audit.service import create_audit_event
from app.modules.audit.schemas import AuditEventCreate

router = APIRouter(prefix="/orders", tags=["Payouts"])

@router.get("/{order_id}/payout")
def read_payout_sheet(order_id: str, user=Depends(verify_token)):
    sheet = get_order_payout_sheet(order_id)
    if not sheet:
        sheet = recalculate_payout_from_tasks(order_id)
    return {"success": True, "data": sheet}

@router.post("/{order_id}/payout/calculate")
def calculate_payout_route(order_id: str, user=Depends(require_role("leader"))):
    sheet = recalculate_payout_from_tasks(order_id)
    create_audit_event(AuditEventCreate(
        order_id=order_id,
        event_type="PAYOUT_CALCULATED",
        entity_type="payout_sheet",
        entity_id=sheet["id"],
        new_values={"total_payable_amount": sheet["total_payable_amount"]}
    ))
    return {"success": True, "data": sheet}

@router.post("/{order_id}/payout/submit")
def submit_payout_route(order_id: str, user=Depends(require_role("leader"))):
    sheet = get_order_payout_sheet(order_id)
    if not sheet:
        raise NotFoundError("Payout sheet not found")
    sheet["status"] = "SUBMITTED"
    create_audit_event(AuditEventCreate(
        order_id=order_id,
        event_type="PAYOUT_SUBMITTED_FOR_APPROVAL",
        entity_type="payout_sheet",
        entity_id=sheet["id"]
    ))
    return {"success": True, "data": sheet}

@router.post("/{order_id}/payout/approve")
def approve_payout_route(order_id: str, req: PayoutApprovalRequest, user=Depends(require_role("leader", "approver"))):
    sheet = approve_payout(order_id, req.action, req.note)
    if not sheet:
        raise NotFoundError("Payout sheet not found")
    create_audit_event(AuditEventCreate(
        order_id=order_id,
        event_type=f"PAYOUT_{req.action}",
        entity_type="payout_sheet",
        entity_id=sheet["id"],
        reason=req.note
    ))
    return {"success": True, "data": sheet}

@router.get("/{order_id}/payout/explanation")
def payout_explanation_route(order_id: str, user=Depends(verify_token)):
    res = get_payout_explanation(order_id)
    return {"success": True, "data": res}
