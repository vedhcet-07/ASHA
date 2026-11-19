from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class ProposeAllocationRequest(BaseModel):
    strategy: str = "FAIR_BALANCED"
    consider_past_quality: bool = True
    avoid_overload: bool = True

class AllocationOverrideItem(BaseModel):
    member_id: str
    member_name: str
    allocated_quantity: int
    override_reason: Optional[str] = None

class ConfirmAllocationRequest(BaseModel):
    allocations: List[AllocationOverrideItem]
    note: Optional[str] = None
