"""Pydantic request/response models for the Auth module.

These models validate the shape of every request body and response payload
for the auth endpoints. Role and language fields use ``Literal`` types so
that invalid values are rejected at the schema boundary with a 422
``VALIDATION_ERROR`` rather than reaching the database.

Requirements: 1.1, 1.2, 1.3, 1.6
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, EmailStr, Field

# ---------------------------------------------------------------------------
# Enum-like literal types (mirror the PostgreSQL enums)
# ---------------------------------------------------------------------------

#: Valid roles as defined by the ``user_role`` PostgreSQL enum.
UserRole = Literal[
    "leader",
    "member",
    "approver",
    "checker",
    "buyer",
    "federation_staff",
]

#: Valid languages as defined by the ``preferred_language`` PostgreSQL enum.
PreferredLanguage = Literal["en", "kn", "hi"]


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class SignupRequest(BaseModel):
    """Payload for ``POST /auth/signup``.

    The caller supplies their email, password, display name, and the role
    they want to operate under. The service layer creates a Supabase Auth
    user and a corresponding ``profiles`` row.
    """

    email: EmailStr
    password: str = Field(..., min_length=6, description="At least 6 characters")
    full_name: str = Field(..., min_length=1, description="Display name")
    role: UserRole
    phone_number: str | None = None


class LoginRequest(BaseModel):
    """Payload for ``POST /auth/login``."""

    email: EmailStr
    password: str


class RoleUpdateRequest(BaseModel):
    """Payload for ``PUT /auth/role`` — set the user's active role."""

    role: UserRole


class LanguageUpdateRequest(BaseModel):
    """Payload for ``PUT /auth/language`` — set the user's preferred language."""

    preferred_language: PreferredLanguage


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------


class ProfileResponse(BaseModel):
    """User profile returned by signup, login, /me, and update endpoints.

    ``shg_id`` is resolved from the ``shg_members`` table and may be ``None``
    for users who have not yet joined an SHG (e.g. buyers, new leaders).
    """

    id: str
    full_name: str
    role: str
    preferred_language: str
    phone_number: str | None = None
    avatar_url: str | None = None
    shg_id: str | None = None


class LoginResponse(BaseModel):
    """Response for ``POST /auth/login`` — JWT + the caller's profile."""

    access_token: str
    token_type: str = "bearer"
    profile: ProfileResponse
