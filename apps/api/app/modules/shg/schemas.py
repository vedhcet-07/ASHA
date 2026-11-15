"""Pydantic request/response models for the SHG module.

Requirement 2.1: a Leader creates an SHG with a name, district, state, and
optional registration number. The creator becomes the SHG's ``leader_id``;
that field is set server-side and is never accepted from the client.
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SHGCreate(BaseModel):
    """Body for ``POST /shgs`` — create a new SHG.

    ``name`` is required; ``district``, ``state``, ``registration_number``,
    and ``address`` are optional. ``minimum_margin_percent`` defaults to the
    database default (10.00) when omitted.
    """

    name: str = Field(..., min_length=1, max_length=255, description="SHG name")
    district: str | None = Field(default=None, description="District")
    state: str | None = Field(default=None, description="State")
    registration_number: str | None = Field(
        default=None, description="Optional registration number"
    )
    address: str | None = Field(default=None, description="Optional address")
    minimum_margin_percent: Decimal | None = Field(
        default=None,
        ge=0,
        le=100,
        description="Minimum margin percentage; defaults to 10.00 when omitted",
    )


class SHGUpdate(BaseModel):
    """Body for ``PUT /shgs/{shg_id}`` — update SHG details.

    All fields are optional; only fields explicitly provided (set) in the
    request are updated. ``leader_id`` is never changed through this endpoint.
    """

    name: str | None = Field(default=None, min_length=1, max_length=255)
    district: str | None = Field(default=None)
    state: str | None = Field(default=None)
    registration_number: str | None = Field(default=None)
    address: str | None = Field(default=None)
    minimum_margin_percent: Decimal | None = Field(default=None, ge=0, le=100)


class SHGResponse(BaseModel):
    """Response model for an SHG record."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    name: str
    registration_number: str | None = None
    address: str | None = None
    district: str | None = None
    state: str | None = None
    leader_id: UUID
    minimum_margin_percent: Decimal
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Member CRUD — Requirements 2.2, 2.3, 2.9
# ---------------------------------------------------------------------------

#: Maximum number of active (non-soft-deleted) members per SHG (Requirement 2.2).
MAX_MEMBERS_PER_SHG: int = 15


class MemberCreate(BaseModel):
    """Body for ``POST /shgs/{shg_id}/members`` — add a member to an SHG.

    Requirement 2.3: ``display_name`` and ``daily_capacity`` (greater than
    zero) are required. ``profile_id`` is optional — when provided it links
    the member to an existing auth user. The member's ``shg_id`` is set
    server-side from the URL path, not accepted from the client.
    """

    display_name: str = Field(
        ..., min_length=1, max_length=255, description="Member display name"
    )
    daily_capacity: int = Field(
        ...,
        gt=0,
        description="Units/hours a member can produce per day; must be greater than zero",
    )
    profile_id: UUID | None = Field(
        default=None, description="Optional link to an auth user profile"
    )


class MemberUpdate(BaseModel):
    """Body for ``PUT /shgs/{shg_id}/members/{member_id}`` — update a member.

    All fields are optional; only fields explicitly provided (set) in the
    request are updated.
    """

    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    daily_capacity: int | None = Field(
        default=None, gt=0, description="Must be greater than zero when provided"
    )


class MemberResponse(BaseModel):
    """Response model for an SHG member record (``shg_members`` row).

    Mirrors the database columns. ``profile_id`` is nullable so a member can
    exist without a linked auth account. ``deleted_at`` is ``None`` for active
    members and set when soft-deleted (Requirement 2.9).
    """

    model_config = ConfigDict(extra="ignore")

    id: UUID
    shg_id: UUID
    profile_id: UUID | None = None
    display_name: str
    daily_capacity: int
    availability: AvailabilityStatus
    quality_score: Decimal
    workload_score: Decimal
    joined_at: datetime
    deleted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Member skills — Requirements 2.4, 2.5
# ---------------------------------------------------------------------------

#: Valid skills from the ``skill_catalogue`` PostgreSQL enum (Requirement 2.4).
SkillCatalogue = Literal[
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

#: Valid availability statuses from the ``availability_status`` PostgreSQL enum
#: (Requirement 2.6).
AvailabilityStatus = Literal["available", "partially_available", "unavailable"]


class MemberSkillCreate(BaseModel):
    """Body for ``POST /shgs/{shg_id}/members/{member_id}/skills``.

    Requirement 2.4: the skill must come from the ``skill_catalogue`` enum.
    Requirement 2.5: proficiency must be an integer between 1 and 5.
    """

    skill: SkillCatalogue = Field(..., description="Skill from the catalogue enum")
    proficiency: int = Field(..., ge=1, le=5, description="Proficiency level 1–5")


class MemberSkillResponse(BaseModel):
    """Response model for a member skill record."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    shg_member_id: UUID
    skill: str
    proficiency: int
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Member availability — Requirements 2.6, 2.7
# ---------------------------------------------------------------------------


class MemberAvailabilityCreate(BaseModel):
    """Body for ``POST /shgs/{shg_id}/members/{member_id}/availability``.

    Requirement 2.7: a Leader records an availability window with a start
    date, end date, status, and an optional reason (``note``). The end date
    must not precede the start date, mirroring the database CHECK constraint
    ``available_to >= available_from``.
    """

    available_from: date = Field(..., description="Window start date")
    available_to: date = Field(..., description="Window end date")
    status: AvailabilityStatus = Field(
        ..., description="Availability status for the window"
    )
    note: str | None = Field(default=None, description="Optional reason/note")

    @model_validator(mode="after")
    def _validate_date_order(self) -> "MemberAvailabilityCreate":
        if self.available_to < self.available_from:
            raise ValueError("available_to must not be earlier than available_from")
        return self


class MemberAvailabilityResponse(BaseModel):
    """Response model for a member availability window."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    shg_member_id: UUID
    available_from: date
    available_to: date
    status: str
    note: str | None = None
    created_at: datetime
    updated_at: datetime


class DeleteResult(BaseModel):
    """Minimal response body for a successful DELETE operation."""

    deleted: bool = True
    id: UUID
