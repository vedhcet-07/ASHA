import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from app.modules.shg.service import list_shg_members
from app.modules.orders.service import get_order_by_id
from app.rules.allocation import FairAllocationEngine
from app.ai.providers.factory import get_ai_provider

_proposals: Dict[str, Dict[str, Any]] = {}
_confirmed_allocations: Dict[str, List[Dict[str, Any]]] = {}

def calculate_proposal(order_id: str) -> Dict[str, Any]:
    order = get_order_by_id(order_id)
    total_qty = 100
    if order and order.get("items"):
        total_qty = sum(it.get("quantity", 0) for it in order["items"])
    
    members = list_shg_members()
    allocations = FairAllocationEngine.propose_allocation(order_id, members, "STITCHING", total_qty)
    
    prop_id = f"aloc-{uuid.uuid4().hex[:6]}"
    proposal = {
        "proposal_id": prop_id,
        "order_id": order_id,
        "total_quantity": total_qty,
        "allocations": allocations,
        "warnings": []
    }
    _proposals[order_id] = proposal
    return proposal

def get_proposal(order_id: str) -> Dict[str, Any]:
    if order_id not in _proposals:
        calculate_proposal(order_id)
    return _proposals[order_id]

def update_proposal(order_id: str, overrides: List[Dict[str, Any]]) -> Dict[str, Any]:
    prop = get_proposal(order_id)
    prop["allocations"] = overrides
    prop["updated_at"] = datetime.now(timezone.utc).isoformat()
    return prop

def confirm_allocation_service(order_id: str, allocations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    from app.modules.tasks.service import create_member_tasks_from_allocation
    _confirmed_allocations[order_id] = allocations
    created_tasks = create_member_tasks_from_allocation(order_id, allocations)
    return created_tasks

def get_allocation_explanation(order_id: str) -> Dict[str, Any]:
    ai = get_ai_provider()
    return ai.explain_allocation({"order_id": order_id})
