from fastapi import APIRouter, Depends
from app.core.security import verify_token

router = APIRouter(tags=["Reports & Delivery"])

@router.get("/reports/summary")
def get_operational_summary(user=Depends(verify_token)):
    return {
        "success": True,
        "data": {
            "on_time_delivery_rate": 96.2,
            "overall_acceptance_rate": 94.8,
            "rework_rate": 5.2,
            "total_shg_earnings_simulated": 42500.0,
            "average_group_margin": 20.5,
            "active_orders_count": 1,
            "total_members": 12
        }
    }

@router.get("/buyers/orders/{order_id}/delivery-record")
def get_buyer_delivery_record(order_id: str, user=Depends(verify_token)):
    return {
        "success": True,
        "data": {
            "order_id": order_id,
            "order_number": "ORD-2026-001",
            "title": "Festival Tote Bags & Pouches",
            "dispatched_quantity": 100,
            "accepted_quality_units": 100,
            "dispatch_date": "2026-11-20",
            "tracking_number": "TRK-BLR-883921",
            "logistics_partner": "Karnataka Rural Express",
            "verified_by_checker": "Anitha Murthy (Quality Lead)",
            "buyer_visible_media": [
                {
                    "file_name": "final_packed_bundles.jpg",
                    "url": "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=400"
                }
            ]
        }
    }
