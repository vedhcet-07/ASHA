from typing import Optional
from pydantic import BaseModel

class QualityReviewDecision(BaseModel):
    decision: str  # ACCEPTED, REWORK, REJECTED
    reviewed_quantity: int
    reason: Optional[str] = None
    ai_draft_note: Optional[str] = None

class ReworkTaskCreate(BaseModel):
    reassign_to_member_id: Optional[str] = None
    reason: str
