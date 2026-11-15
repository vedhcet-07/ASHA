"""SHG and member request/response schemas."""

from pydantic import BaseModel
from typing import Literal


class CreateSHGRequest(BaseModel):
    name: str
    registration_number: str | None = None
    district: str | None = None
    state: str | None = None
    minimum_margin_percent: float = 0.0


class UpdateSHGRequest(BaseModel):
    name: str | None = None
    district: str | None = None
    state: str | None = None
    minimum_margin_percent: float | None = None


class AddMemberRequest(BaseModel):
    member_name: str
    phone_number: str | None = None
    daily_capacity: int = 0
    weekly_capacity: int = 0
    availability_status: Literal["available", "partially_available", "unavailable"] = "available"


class UpdateMemberRequest(BaseModel):
    member_name: str | None = None
    phone_number: str | None = None
    daily_capacity: int | None = None
    weekly_capacity: int | None = None
    availability_status: Literal["available", "partially_available", "unavailable"] | None = None
    is_active: bool | None = None


class AddSkillRequest(BaseModel):
    skill: Literal[
        "CUTTING",
        "STITCHING",
        "TAILORING",
        "EMBROIDERY",
        "PACKING",
        "QUALITY_CHECK",
        "DELIVERY",
        "ACCOUNTING",
        "OTHER",
    ]
    proficiency: int  # 1-5


class AddAvailabilityRequest(BaseModel):
    available_from: str | None = None
    available_to: str | None = None
    status: Literal["available", "partially_available", "unavailable"]
    reason: str | None = None
