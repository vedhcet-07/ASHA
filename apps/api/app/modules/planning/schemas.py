from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class PlanStageCreate(BaseModel):
    stage_name: str
    stage_order: int
    requires_skill: str
    planned_days: int = 2
    is_quality_checkpoint: bool = False
    description: Optional[str] = None

class ProductionPlanCreate(BaseModel):
    summary: str
    stages: List[PlanStageCreate]

class ProductionPlanConfirm(BaseModel):
    stages: Optional[List[PlanStageCreate]] = None
    note: Optional[str] = None
