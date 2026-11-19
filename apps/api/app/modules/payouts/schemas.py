from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class PayoutApprovalRequest(BaseModel):
    action: str  # APPROVED, REJECTED, CHANGES_REQUESTED
    note: Optional[str] = None
