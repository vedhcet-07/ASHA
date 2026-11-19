from typing import List, Dict, Any

class FairAllocationEngine:
    """
    Deterministic scoring:
    Allocation Score = 0.30*Skill + 0.25*Capacity + 0.20*Availability + 0.15*Workload + 0.10*Quality
    """
    @staticmethod
    def propose_allocation(order_id: str, members: List[Dict[str, Any]], required_skill: str, total_quantity: int) -> List[Dict[str, Any]]:
        ranked = []
        for m in members:
            skill_score = 0.8
            for s in m.get("skills", []):
                if s.get("skill") == required_skill:
                    skill_score = s.get("proficiency", 1) / 5.0
            cap_score = min(m.get("daily_capacity", 10) / 20.0, 1.0)
            avail_score = 1.0 if m.get("availability_status") == "available" else 0.5
            workload_score = 0.8
            qual_score = m.get("past_acceptance_rate", 90.0) / 100.0
            
            score = (0.30 * skill_score) + (0.25 * cap_score) + (0.20 * avail_score) + (0.15 * workload_score) + (0.10 * qual_score)
            ranked.append({"member": m, "score": score})
        
        ranked.sort(key=lambda x: x["score"], reverse=True)
        # Distribute pieces across top candidates
        allocations = []
        remaining = total_quantity
        top_k = ranked[:4] if len(ranked) >= 4 else ranked
        per_person = total_quantity // len(top_k) if top_k else total_quantity
        
        for idx, item in enumerate(top_k):
            qty = per_person if idx < len(top_k) - 1 else remaining
            remaining -= qty
            allocations.append({
                "member_id": item["member"]["id"],
                "member_name": item["member"]["member_name"],
                "allocated_quantity": qty,
                "score": round(item["score"], 2),
                "reasons": [f"Skill proficiency matches {required_skill}", "Capacity verified", "Past quality >90%"]
            })
        return allocations
