"""
Deterministic Costing Engine.
All calculations are pure functions — no AI, no side effects.
"""

from dataclasses import dataclass
from typing import Literal


CostBasis = Literal["PER_UNIT", "PER_BATCH", "PER_HOUR", "PERCENTAGE", "FIXED"]
MarginType = Literal["PERCENTAGE", "FIXED_PER_UNIT", "MANUAL"]


@dataclass
class CostComponentInput:
    component_type: str   # MATERIAL | LABOUR | PACKAGING | TRANSPORT | UTILITIES | OTHER_OVERHEAD
    label: str
    calculation_basis: CostBasis
    rate: float
    quantity: float


@dataclass
class CostComponentResult:
    component_type: str
    label: str
    calculation_basis: str
    rate: float
    quantity: float
    amount: float


@dataclass
class CostSheetResult:
    quantity: int
    components: list[CostComponentResult]
    material_cost: float
    labour_cost: float
    overhead_cost: float
    total_cost: float
    unit_cost: float
    margin_type: MarginType
    margin_value: float
    margin_amount: float
    selling_price_per_unit: float
    total_selling_price: float
    pricing_warning: str | None


def _compute_component_amount(component: CostComponentInput, batch_quantity: int) -> float:
    basis = component.calculation_basis
    if basis == "PER_UNIT":
        return round(component.rate * batch_quantity, 2)
    elif basis == "PER_BATCH":
        return round(component.rate * component.quantity, 2)
    elif basis == "PER_HOUR":
        return round(component.rate * component.quantity, 2)
    elif basis == "FIXED":
        return round(component.rate, 2)
    elif basis == "PERCENTAGE":
        # Percentage is applied later against direct costs
        return 0.0
    return 0.0


def calculate_cost_sheet(
    quantity: int,
    components: list[CostComponentInput],
    margin_type: MarginType,
    margin_value: float,
    minimum_margin_percent: float = 0.0,
) -> CostSheetResult:
    """
    Calculate all cost components, unit cost, margin, and selling price.
    Pure deterministic function — always returns the same result for same inputs.
    """
    if quantity <= 0:
        raise ValueError("Quantity must be greater than zero")

    material_cost = 0.0
    labour_cost = 0.0
    overhead_cost = 0.0
    computed: list[CostComponentResult] = []
    percentage_components: list[CostComponentInput] = []

    # First pass: compute all non-percentage components
    for comp in components:
        if comp.calculation_basis == "PERCENTAGE":
            percentage_components.append(comp)
            computed.append(CostComponentResult(
                component_type=comp.component_type,
                label=comp.label,
                calculation_basis=comp.calculation_basis,
                rate=comp.rate,
                quantity=comp.quantity,
                amount=0.0,  # filled in second pass
            ))
        else:
            amount = _compute_component_amount(comp, quantity)
            computed.append(CostComponentResult(
                component_type=comp.component_type,
                label=comp.label,
                calculation_basis=comp.calculation_basis,
                rate=comp.rate,
                quantity=comp.quantity,
                amount=amount,
            ))
            t = comp.component_type
            if t == "MATERIAL":
                material_cost += amount
            elif t == "LABOUR":
                labour_cost += amount
            else:
                overhead_cost += amount

    direct_cost = material_cost + labour_cost + overhead_cost

    # Second pass: resolve percentage-based components against direct cost
    for i, comp in enumerate(components):
        if comp.calculation_basis == "PERCENTAGE":
            amount = round(direct_cost * (comp.rate / 100.0), 2)
            # Find and update the placeholder
            for c in computed:
                if c.label == comp.label and c.calculation_basis == "PERCENTAGE":
                    c.amount = amount
                    break
            overhead_cost += amount

    total_cost = round(material_cost + labour_cost + overhead_cost, 2)
    unit_cost = round(total_cost / quantity, 4)

    # Margin calculation
    if margin_type == "PERCENTAGE":
        margin_amount = round(total_cost * (margin_value / 100.0), 2)
        selling_price_per_unit = round(unit_cost + (unit_cost * margin_value / 100.0), 4)
    elif margin_type == "FIXED_PER_UNIT":
        margin_amount = round(margin_value * quantity, 2)
        selling_price_per_unit = round(unit_cost + margin_value, 4)
    else:  # MANUAL
        selling_price_per_unit = round(margin_value, 4)
        margin_amount = round((selling_price_per_unit - unit_cost) * quantity, 2)

    total_selling_price = round(selling_price_per_unit * quantity, 2)

    # Pricing warnings
    pricing_warning: str | None = None
    if selling_price_per_unit < unit_cost:
        pricing_warning = (
            f"Selling price (₹{selling_price_per_unit:.2f}) is below unit cost (₹{unit_cost:.2f}). "
            "You will incur a loss on this order."
        )
    elif minimum_margin_percent > 0:
        actual_margin_pct = ((selling_price_per_unit - unit_cost) / unit_cost * 100) if unit_cost > 0 else 0
        if actual_margin_pct < minimum_margin_percent:
            pricing_warning = (
                f"Margin is {actual_margin_pct:.1f}%, below the SHG minimum of {minimum_margin_percent:.1f}%."
            )

    return CostSheetResult(
        quantity=quantity,
        components=computed,
        material_cost=round(material_cost, 2),
        labour_cost=round(labour_cost, 2),
        overhead_cost=round(overhead_cost, 2),
        total_cost=total_cost,
        unit_cost=round(unit_cost, 2),
        margin_type=margin_type,
        margin_value=margin_value,
        margin_amount=margin_amount,
        selling_price_per_unit=round(selling_price_per_unit, 2),
        total_selling_price=total_selling_price,
        pricing_warning=pricing_warning,
    )
