"""AI input/output schemas — strictly validated, never trusted directly."""

from pydantic import BaseModel
from typing import Literal


class PlanStageOutput(BaseModel):
    stage_name: str
    stage_order: int
    requires_skill: str | None = None
    planned_days: int = 1
    is_quality_checkpoint: bool = False
    description: str | None = None


class ProductionPlanOutput(BaseModel):
    summary: str
    total_days: int
    stages: list[PlanStageOutput]
    notes: str | None = None


class AllocationExplanationOutput(BaseModel):
    summary: str
    member_explanations: list[dict]
