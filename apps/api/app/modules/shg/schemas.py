from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class SHGMemberCreate(BaseModel):
    member_name: str
    phone_number: Optional[str] = None
    daily_capacity: int = 10
    weekly_capacity: int = 50
    availability_status: str = "available"
    skills: List[Dict[str, Any]] = []

class SHGMemberUpdate(BaseModel):
    member_name: Optional[str] = None
    phone_number: Optional[str] = None
    daily_capacity: Optional[int] = None
    weekly_capacity: Optional[int] = None
    availability_status: Optional[str] = None

class AddSkillRequest(BaseModel):
    skill: str
    proficiency: int = 3

class SetAvailabilityRequest(BaseModel):
    status: str
    available_from: Optional[str] = None
    available_to: Optional[str] = None
    reason: Optional[str] = None
