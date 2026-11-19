import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.modules.tasks.service import _tasks_store
from app.rules.payout import PayoutEngine
from app.ai.providers.factory import get_ai_provider

_payout_sheets_store: Dict[str, Dict[str, Any]] = {
    "ord-001": {
        "id": "pay-001",
        "order_id": "ord-001",
        "version": 1,
        "status": "SUBMITTED",
        "total_payable_amount": 1060.0,
        "total_accepted_quantity": 53,
        "submitted_by": "Lakshmi Gowda",
        "submitted_at": "2026-11-18T10:00:00Z",
        "lines": [
            {
                "member_id": "mem-01",
                "member_name": "Lakshmi Gowda",
                "task_name": "Stitch Canvas Tote Bags",
                "allocated_quantity": 25,
                "completed_quantity": 20,
                "accepted_quantity": 18,
                "rework_quantity": 2,
                "rejected_quantity": 0,
                "rate": 20.0,
                "payable_amount": 360.0,
                "explanation": "Accepted: 18 units @ ₹20.00/unit (2 in rework not payable)"
            },
            {
                "member_id": "mem-02",
                "member_name": "Meena Devi",
                "task_name": "Stitch Canvas Tote Bags",
                "allocated_quantity": 25,
                "completed_quantity": 20,
                "accepted_quantity": 15,
                "rework_quantity": 5,
                "rejected_quantity": 0,
                "rate": 20.0,
                "payable_amount": 300.0,
                "explanation": "Accepted: 15 units @ ₹20.00/unit (5 in rework not payable)"
            },
            {
                "member_id": "mem-03",
                "member_name": "Radha Bai",
                "task_name": "Pack & Bundle Finished Bags",
                "allocated_quantity": 50,
                "completed_quantity": 40,
                "accepted_quantity": 40,
                "rework_quantity": 0,
                "rejected_quantity": 0,
                "rate": 10.0,
                "payable_amount": 400.0,
                "explanation": "Accepted: 40 units @ ₹10.00/unit"
            }
        ]
    }
}

def get_order_payout_sheet(order_id: str) -> Optional[Dict[str, Any]]:
    return _payout_sheets_store.get(order_id)

def recalculate_payout_from_tasks(order_id: str) -> Dict[str, Any]:
    lines = []
    for t in _tasks_store:
        if t.get("order_id") == order_id:
            accepted = t.get("accepted_quantity", 0)
            rate = float(t.get("rate_per_unit", 20.0))
            lines.append({
                "member_id": t.get("assigned_member_id", "mem-unknown"),
                "member_name": t.get("assigned_member_name", "Member"),
                "task_name": t.get("task_name", "Task"),
                "allocated_quantity": t.get("allocated_quantity", 0),
                "completed_quantity": t.get("completed_quantity", 0),
                "accepted_quantity": accepted,
                "rework_quantity": t.get("rework_quantity", 0),
                "rejected_quantity": t.get("rejected_quantity", 0),
                "rate": rate,
                "payable_amount": accepted * rate,
                "explanation": f"Accepted {accepted} units @ ₹{rate:.2f}/unit"
            })
    
    calculated = PayoutEngine.calculate_payout(lines)
    sheet_id = f"pay-{uuid.uuid4().hex[:6]}"
    sheet = {
        "id": sheet_id,
        "order_id": order_id,
        "version": 1,
        "status": "DRAFT",
        "created_at": datetime.now(timezone.utc).isoformat(),
        **calculated
    }
    _payout_sheets_store[order_id] = sheet
    return sheet

def approve_payout(order_id: str, action: str, note: Optional[str] = None) -> Dict[str, Any]:
    sheet = get_order_payout_sheet(order_id)
    if sheet:
        sheet["status"] = action
        sheet["approval_note"] = note
        sheet["approved_at"] = datetime.now(timezone.utc).isoformat()
    return sheet

def get_payout_explanation(order_id: str) -> Dict[str, Any]:
    return {
        "summary": "Payments are strictly calculated on accepted, verified units. Rework units are withheld until re-inspected. No manual or informal splits allowed.",
        "simulated_warning": "NOTE: All monetary transactions are SIMULATED for hackathon demo purposes."
    }
