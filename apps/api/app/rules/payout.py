from typing import List, Dict, Any

class PayoutEngine:
    @staticmethod
    def calculate_payout(lines: List[Dict[str, Any]]) -> Dict[str, Any]:
        total_payable = 0.0
        total_accepted = 0
        computed_lines = []
        for line in lines:
            accepted = line.get("accepted_quantity", 0)
            rate = float(line.get("rate", 0.0))
            payable = accepted * rate
            total_payable += payable
            total_accepted += accepted
            computed_lines.append({
                **line,
                "payable_amount": round(payable, 2),
                "explanation": f"Accepted: {accepted} units @ ₹{rate:.2f}/unit"
            })
        return {
            "total_payable_amount": round(total_payable, 2),
            "total_accepted_quantity": total_accepted,
            "lines": computed_lines
        }
