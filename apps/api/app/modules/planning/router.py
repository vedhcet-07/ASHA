from fastapi import APIRouter, Depends
from app.core.security import verify_token, require_role
from app.modules.planning.schemas import ProductionPlanConfirm
from app.modules.planning.service import generate_plan_draft, get_draft, confirm_plan, get_order_plan
from app.core.errors import NotFoundError
from app.modules.audit.service import create_audit_event
from app.modules.audit.schemas import AuditEventCreate

router = APIRouter(prefix="/orders", tags=["Planning"])

@router.post("/{order_id}/plan/generate")
def create_plan_draft(order_id: str, user=Depends(require_role("leader"))):
    draft = generate_plan_draft(order_id)
    create_audit_event(AuditEventCreate(
        order_id=order_id,
        event_type="PLAN_DRAFT_GENERATED",
        entity_type="production_plan",
        entity_id=draft["id"]
    ))
    return {"success": True, "data": draft}

@router.get("/{order_id}/plan/drafts/{draft_id}")
def read_draft(order_id: str, draft_id: str, user=Depends(verify_token)):
    draft = get_draft(draft_id)
    if not draft:
        raise NotFoundError("Draft not found")
    return {"success": True, "data": draft}

@router.post("/{order_id}/plan/confirm")
def confirm_order_plan(order_id: str, body: ProductionPlanConfirm = None, user=Depends(require_role("leader"))):
    stages = [s.model_dump() for s in body.stages] if body and body.stages else None
    plan = confirm_plan(order_id, stages)
    create_audit_event(AuditEventCreate(
        order_id=order_id,
        event_type="PLAN_CONFIRMED",
        entity_type="production_plan",
        entity_id=plan["id"]
    ))
    return {"success": True, "data": plan}

@router.get("/{order_id}/plan")
def read_order_plan(order_id: str, user=Depends(verify_token)):
    plan = get_order_plan(order_id)
    return {"success": True, "data": plan}
