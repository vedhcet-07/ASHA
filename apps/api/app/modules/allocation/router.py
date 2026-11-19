from fastapi import APIRouter, Depends
from app.core.security import verify_token, require_role
from app.modules.allocation.schemas import ProposeAllocationRequest, ConfirmAllocationRequest
from app.modules.allocation.service import calculate_proposal, get_proposal, update_proposal, confirm_allocation_service, get_allocation_explanation
from app.modules.audit.service import create_audit_event
from app.modules.audit.schemas import AuditEventCreate

router = APIRouter(prefix="/orders", tags=["Allocation"])

@router.post("/{order_id}/allocation/propose")
def propose_allocation_route(order_id: str, req: ProposeAllocationRequest = None, user=Depends(require_role("leader"))):
    proposal = calculate_proposal(order_id)
    return {"success": True, "data": proposal}

@router.get("/{order_id}/allocation/proposal")
def read_proposal_route(order_id: str, user=Depends(verify_token)):
    proposal = get_proposal(order_id)
    return {"success": True, "data": proposal}

@router.post("/{order_id}/allocation/confirm")
def confirm_allocation_route(order_id: str, req: ConfirmAllocationRequest, user=Depends(require_role("leader"))):
    allocs = [a.model_dump() for a in req.allocations]
    created_tasks = confirm_allocation_service(order_id, allocs)
    create_audit_event(AuditEventCreate(
        order_id=order_id,
        event_type="ALLOCATION_CONFIRMED",
        entity_type="allocation",
        new_values={"allocated_members": len(allocs)}
    ))
    return {"success": True, "data": {"status": "CONFIRMED", "tasks": created_tasks}}

@router.get("/{order_id}/allocation/explanation")
def explanation_route(order_id: str, user=Depends(verify_token)):
    res = get_allocation_explanation(order_id)
    return {"success": True, "data": res}
