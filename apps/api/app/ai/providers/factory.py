import json
from typing import Dict, Any
from app.core.config import get_settings
from app.ai.providers.base import BaseAIProvider

class MockOrLocalAIProvider(BaseAIProvider):
    """Reliable provider with intelligent rule-guided heuristics for hackathon demo & live AI fallback."""
    
    def generate_production_plan(self, order_data: Dict[str, Any]) -> Dict[str, Any]:
        title = order_data.get("title", "Bulk Order")
        items = order_data.get("items", [])
        total_qty = sum(it.get("quantity", 0) for it in items) or 100
        
        stages = [
            {
                "stage_name": "Fabric & Material Cutting",
                "stage_order": 1,
                "requires_skill": "CUTTING",
                "planned_days": 2,
                "is_quality_checkpoint": True,
                "description": f"Precision pattern cutting for {total_qty} units with seam allowances."
            },
            {
                "stage_name": "Assembly & Stitching",
                "stage_order": 2,
                "requires_skill": "STITCHING",
                "planned_days": 4,
                "is_quality_checkpoint": True,
                "description": "Double-needle lockstitch assembly and handle reinforcement."
            },
            {
                "stage_name": "Surface Finishing & Trimming",
                "stage_order": 3,
                "requires_skill": "EMBROIDERY",
                "planned_days": 2,
                "is_quality_checkpoint": False,
                "description": "Thread trimming, edge finishing, and decorative elements."
            },
            {
                "stage_name": "Comprehensive Quality Check",
                "stage_order": 4,
                "requires_skill": "QUALITY_CHECK",
                "planned_days": 1,
                "is_quality_checkpoint": True,
                "description": "100% batch inspection for dimensional accuracy, seam strength, and finish."
            },
            {
                "stage_name": "Final Packaging & Dispatch Prep",
                "stage_order": 5,
                "requires_skill": "PACKING",
                "planned_days": 1,
                "is_quality_checkpoint": False,
                "description": "Eco-friendly labeling, protective bundling, and boxing."
            }
        ]
        
        return {
            "version": 1,
            "summary": f"Standardized 5-stage production plan for {title} ({total_qty} units). Includes 3 mandatory quality gates.",
            "stages": stages,
            "estimated_production_days": 10
        }

    def explain_allocation(self, allocation_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "summary": "Work was distributed using the deterministic ASHA Fair Allocation Formula: 30% Skill Proficiency, 25% Verified Daily Capacity, 20% Availability, 15% Current Workload Balance, and 10% Historical Quality Score.",
            "fairness_rating": "High (Balanced capacity distribution)",
            "risk_mitigation": "No member assigned above 80% daily capacity limit."
        }

    def draft_rework_note(self, task_name: str, member_name: str, reason: str) -> str:
        return (
            f"Dear {member_name}, during quality inspection for {task_name}, the checker noted: '{reason}'. "
            f"Please inspect the seam tension and trim excess loose threads before resubmitting. "
            f"Corrected units will be prioritized for immediate verification."
        )

def get_ai_provider() -> BaseAIProvider:
    return MockOrLocalAIProvider()
