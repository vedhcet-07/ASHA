"""Planning and allocation request/response schemas."""

from pydantic import BaseModel, field_validator
from typing import Literal


class ConfirmPlanRequest(BaseModel):
    plan_id: str


class ProposeAllocationRequest(BaseModel):
    task_id: str
    strategy: Literal["FAIR_BALANCED"] = "FAIR_BALANCED"
    consider_past_quality: bool = True
    avoid_overload: bool = True


class AdjustAllocationRequest(BaseModel):
    """Leader manually adjusts an allocation line."""
    task_id: str
    member_id: str
    new_quantity: int
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_must_not_be_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("A reason is required when adjusting allocation")
        return v.strip()


class ConfirmAllocationRequest(BaseModel):
    """Leader confirms the entire allocation proposal."""
    task_id: str
    allocations: list[dict]   # [{member_id, allocated_quantity}]
