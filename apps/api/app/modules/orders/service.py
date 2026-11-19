import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any

_demo_orders: List[Dict[str, Any]] = [
    {
        "id": "ord-001",
        "order_number": "ORD-2026-001",
        "title": "Festival Tote Bags & Pouches",
        "description": "Eco-friendly canvas tote bags and jute pouches for Tech4Bharat corporate gifts",
        "required_by_date": "2026-12-05",
        "delivery_address": "Tech Park, Whitefield, Bengaluru",
        "special_instructions": "Organic cotton canvas, double stitching on handles",
        "status": "IN_PROGRESS",
        "buyer_id": "buyer-001",
        "buyer_name": "Green Earth Crafts",
        "created_at": "2026-11-15T10:00:00Z",
        "items": [
            {
                "id": "item-01",
                "product_name": "Canvas Tote Bag",
                "quantity": 100,
                "unit_type": "piece",
                "agreed_unit_price": 95.0,
                "specifications": {"size": "14x16 inch", "color": "Natural Beige"}
            },
            {
                "id": "item-02",
                "product_name": "Jute Zipper Pouch",
                "quantity": 50,
                "unit_type": "piece",
                "agreed_unit_price": 45.0,
                "specifications": {"size": "6x8 inch", "color": "Natural Jute"}
            }
        ]
    }
]

def list_orders(buyer_id: str = None) -> List[Dict[str, Any]]:
    if buyer_id:
        return [o for o in _demo_orders if o.get("buyer_id") == buyer_id]
    return _demo_orders

def get_order_by_id(order_id: str) -> Dict[str, Any]:
    for o in _demo_orders:
        if o["id"] == order_id:
            return o
    return None

def create_order(data: Dict[str, Any], buyer_id: str = "buyer-001") -> Dict[str, Any]:
    oid = f"ord-{uuid.uuid4().hex[:6]}"
    num = f"ORD-2026-{len(_demo_orders)+1:03d}"
    items = []
    for idx, item in enumerate(data.get("items", [])):
        items.append({
            "id": f"item-{uuid.uuid4().hex[:6]}",
            "product_name": item["product_name"],
            "quantity": item["quantity"],
            "unit_type": item.get("unit_type", "piece"),
            "agreed_unit_price": item.get("agreed_unit_price", 0.0),
            "specifications": item.get("specifications", {})
        })
    new_ord = {
        "id": oid,
        "order_number": num,
        "title": data["title"],
        "description": data.get("description"),
        "required_by_date": data["required_by_date"],
        "delivery_address": data.get("delivery_address"),
        "special_instructions": data.get("special_instructions"),
        "status": "REQUESTED",
        "buyer_id": buyer_id,
        "buyer_name": "Green Earth Crafts",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "items": items
    }
    _demo_orders.append(new_ord)
    return new_ord

def update_order_status(order_id: str, new_status: str) -> Dict[str, Any]:
    ord = get_order_by_id(order_id)
    if ord:
        ord["status"] = new_status
        ord["updated_at"] = datetime.now(timezone.utc).isoformat()
    return ord
