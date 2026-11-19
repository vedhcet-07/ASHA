import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.rules.costing import CostingEngine

_cost_sheets_store: Dict[str, Dict[str, Any]] = {
    "ord-001": {
        "id": "cost-001",
        "order_id": "ord-001",
        "version": 1,
        "quantity": 100,
        "components": [
            {"component_type": "MATERIAL", "label": "Canvas Cotton Fabric (Grade A)", "calculation_basis": "PER_UNIT", "rate": 45.0, "quantity": 100, "amount": 4500.0},
            {"component_type": "LABOUR", "label": "Stitching & Assembly Labour", "calculation_basis": "PER_PIECE", "rate": 20.0, "quantity": 100, "amount": 2000.0},
            {"component_type": "PACKAGING", "label": "Eco-friendly Jute Tag & Bundle Packing", "calculation_basis": "PER_UNIT", "rate": 5.0, "quantity": 100, "amount": 500.0},
            {"component_type": "TRANSPORT", "label": "SHG Cluster Delivery Van", "calculation_basis": "FIXED", "rate": 300.0, "quantity": 1, "amount": 300.0},
            {"component_type": "OTHER_OVERHEAD", "label": "Thread, Needles & Machine Maintenance", "calculation_basis": "PER_UNIT", "rate": 2.0, "quantity": 100, "amount": 200.0}
        ],
        "margin_type": "PERCENTAGE",
        "margin_value": 20.0,
        "material_cost": 4500.0,
        "labour_cost": 2000.0,
        "overhead_cost": 1000.0,
        "total_cost": 7500.0,
        "unit_cost": 75.0,
        "margin_amount": 1500.0,
        "selling_price_per_unit": 90.0,
        "total_selling_price": 9000.0,
        "pricing_warning": None,
        "created_at": "2026-11-16T10:00:00Z"
    }
}

def get_order_cost_sheet(order_id: str) -> Optional[Dict[str, Any]]:
    return _cost_sheets_store.get(order_id)

def calculate_or_save_cost_sheet(order_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    qty = data.get("quantity", 100)
    comps = data.get("components", [])
    m_type = data.get("margin_type", "PERCENTAGE")
    m_val = float(data.get("margin_value", 20.0))
    
    calculated = CostingEngine.calculate_cost_sheet(qty, comps, m_type, m_val)
    sheet_id = f"cost-{uuid.uuid4().hex[:6]}"
    
    sheet = {
        "id": sheet_id,
        "order_id": order_id,
        "version": 1,
        "components": comps,
        "margin_type": m_type,
        "margin_value": m_val,
        **calculated,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    _cost_sheets_store[order_id] = sheet
    return sheet
