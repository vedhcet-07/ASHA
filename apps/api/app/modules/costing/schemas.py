from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class CostComponentInput(BaseModel):
    component_type: str  # MATERIAL, LABOUR, PACKAGING, TRANSPORT, UTILITIES, OTHER_OVERHEAD
    label: str
    calculation_basis: str = "PER_UNIT"  # PER_UNIT, PER_BATCH, PER_HOUR, PERCENTAGE, FIXED
    rate: float = 0.0
    quantity: float = 0.0
    amount: Optional[float] = None

class CreateCostSheetRequest(BaseModel):
    order_item_id: Optional[str] = None
    quantity: int = 100
    components: List[CostComponentInput]
    margin_type: str = "PERCENTAGE"  # PERCENTAGE, FIXED_PER_UNIT, MANUAL
    margin_value: float = 20.0
