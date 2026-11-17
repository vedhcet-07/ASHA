"""Payout request/response schemas."""

from pydantic import BaseModel, field_validator
from typing import Literal


class TaskRateInput(BaseModel):
    task_id: str
    payment_basis: Literal["PER_PIECE", "PER_HOUR", "FIXED"] = "PER_PIECE"
    rate: float
    hours: float = 0.0

    @field_validator("rate")
    @classmethod
    def rate_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("Rate cannot be negative")
        return v


class CalculatePayoutRequest(BaseModel):
    task_rates: list[TaskRateInput]


class SubmitPayoutRequest(BaseModel):
    payout_sheet_id: str


class ApprovePayoutRequest(BaseModel):
    payout_sheet_id: str
    note: str | None = None


class RejectPayoutRequest(BaseModel):
    payout_sheet_id: str
    note: str


class RequestChangesRequest(BaseModel):
    payout_sheet_id: str
    note: str

    @field_validator("note")
    @classmethod
    def note_required(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("A note is required when requesting changes")
        return v.strip()
