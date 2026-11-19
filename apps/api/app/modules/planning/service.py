import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.ai.providers.factory import get_ai_provider
from app.modules.orders.service import get_order_by_id

_plans_by_order: Dict[str, Dict[str, Any]] = {}
_drafts_by_id: Dict[str, Dict[str, Any]] = {}

def generate_plan_draft(order_id: str) -> Dict[str, Any]:
    order = get_order_by_id(order_id)
    if not order:
        order = {"title": "Bulk Production", "items": [{"quantity": 100}]}
    
    ai = get_ai_provider()
    plan_content = ai.generate_production_plan(order)
    draft_id = f"draft-{uuid.uuid4().hex[:6]}"
    
    draft = {
        "id": draft_id,
        "order_id": order_id,
        "status": "VALID",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "plan": plan_content
    }
    _drafts_by_id[draft_id] = draft
    return draft

def get_draft(draft_id: str) -> Optional[Dict[str, Any]]:
    return _drafts_by_id.get(draft_id)

def confirm_plan(order_id: str, confirmed_stages: Optional[list] = None) -> Dict[str, Any]:
    if not confirmed_stages:
        draft = generate_plan_draft(order_id)
        confirmed_stages = draft["plan"]["stages"]
    
    plan = {
        "id": f"plan-{uuid.uuid4().hex[:6]}",
        "order_id": order_id,
        "version": 1,
        "status": "CONFIRMED",
        "confirmed_at": datetime.now(timezone.utc).isoformat(),
        "stages": confirmed_stages
    }
    _plans_by_order[order_id] = plan
    return plan

def get_order_plan(order_id: str) -> Optional[Dict[str, Any]]:
    if order_id not in _plans_by_order:
        confirm_plan(order_id)
    return _plans_by_order.get(order_id)
