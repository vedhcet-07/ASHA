from typing import List, Dict, Any

class CostingEngine:
    @staticmethod
    def calculate_cost_sheet(quantity: int, components: List[Dict[str, Any]], margin_type: str = "PERCENTAGE", margin_value: float = 20.0) -> Dict[str, Any]:
        material_cost = 0.0
        labour_cost = 0.0
        overhead_cost = 0.0
        
        for c in components:
            amt = float(c.get("amount", 0.0))
            if amt == 0.0:
                amt = float(c.get("rate", 0.0)) * float(c.get("quantity", quantity))
            ctype = c.get("component_type", "MATERIAL")
            if ctype == "MATERIAL": material_cost += amt
            elif ctype == "LABOUR": labour_cost += amt
            else: overhead_cost += amt
            
        total_cost = material_cost + labour_cost + overhead_cost
        unit_cost = total_cost / quantity if quantity > 0 else 0.0
        
        if margin_type == "PERCENTAGE":
            margin_amount = total_cost * (margin_value / 100.0)
        elif margin_type == "FIXED_PER_UNIT":
            margin_amount = margin_value * quantity
        else:
            margin_amount = margin_value
            
        total_selling_price = total_cost + margin_amount
        selling_price_per_unit = total_selling_price / quantity if quantity > 0 else 0.0
        
        warning = None
        if selling_price_per_unit < unit_cost:
            warning = "CRITICAL: Selling price is below unit cost!"
            
        return {
            "quantity": quantity,
            "material_cost": round(material_cost, 2),
            "labour_cost": round(labour_cost, 2),
            "overhead_cost": round(overhead_cost, 2),
            "total_cost": round(total_cost, 2),
            "unit_cost": round(unit_cost, 2),
            "margin_amount": round(margin_amount, 2),
            "selling_price_per_unit": round(selling_price_per_unit, 2),
            "total_selling_price": round(total_selling_price, 2),
            "pricing_warning": warning
        }
