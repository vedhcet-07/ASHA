"""Unit tests for the Auth module Pydantic schemas.

These tests validate the request/response models defined in
``app.modules.auth.schemas``. They exercise the schema boundary — the
first layer of validation that rejects malformed input before it reaches
the service layer or database.

No database or network connection is required; the tests construct model
instances directly and assert on validation outcomes.

Validates: Requirements 1.1, 1.2, 1.6
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.modules.auth.schemas import (
    LanguageUpdateRequest,
    LoginRequest,
    LoginResponse,
    ProfileResponse,
    RoleUpdateRequest,
    SignupRequest,
)

# All valid roles per the ``user_role`` PostgreSQL enum (Requirement 1.6).
VALID_ROLES = [
    "leader",
    "member",
    "approver",
    "checker",
    "buyer",
    "federation_staff",
]

VALID_LANGUAGES = ["en", "kn", "hi"]


# ---------------------------------------------------------------------------
# SignupRequest
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("role", VALID_ROLES)
def test_signup_request_accepts_all_valid_roles(role: str) -> None:
    """Every role in the user_role enum is accepted by SignupRequest."""
    req = SignupRequest(
        email="user@example.com",
        password="secret123",
        full_name="Test User",
        role=role,
    )
    assert req.role == role


def test_signup_request_rejects_invalid_role() -> None:
    """A role not in the enum is rejected with a validation error."""
    with pytest.raises(ValidationError) as exc_info:
        SignupRequest(
            email="user@example.com",
            password="secret123",
            full_name="Test User",
            role="admin",  # not a valid role
        )
    assert "role" in str(exc_info.value)


def test_signup_request_rejects_invalid_email() -> None:
    """A malformed email is rejected by EmailStr validation."""
    with pytest.raises(ValidationError) as exc_info:
        SignupRequest(
            email="not-an-email",
            password="secret123",
            full_name="Test User",
            role="leader",
        )
    assert "email" in str(exc_info.value).lower()


def test_signup_request_rejects_short_password() -> None:
    """A password shorter than 6 characters is rejected."""
    with pytest.raises(ValidationError) as exc_info:
        SignupRequest(
            email="user@example.com",
            password="abc",  # too short
            full_name="Test User",
            role="leader",
        )
    # Pydantic includes the field name in the error
    errors = exc_info.value.errors()
    assert any(e["loc"] == ("password",) for e in errors)


def test_signup_request_rejects_empty_full_name() -> None:
    """An empty full_name is rejected."""
    with pytest.raises(ValidationError) as exc_info:
        SignupRequest(
            email="user@example.com",
            password="secret123",
            full_name="",  # empty
            role="leader",
        )
    errors = exc_info.value.errors()
    assert any(e["loc"] == ("full_name",) for e in errors)


def test_signup_request_phone_number_is_optional() -> None:
    """phone_number defaults to None when not provided."""
    req = SignupRequest(
        email="user@example.com",
        password="secret123",
        full_name="Test User",
        role="member",
    )
    assert req.phone_number is None


def test_signup_request_accepts_phone_number() -> None:
    """phone_number is accepted when provided."""
    req = SignupRequest(
        email="user@example.com",
        password="secret123",
        full_name="Test User",
        role="member",
        phone_number="+919876543210",
    )
    assert req.phone_number == "+919876543210"


# ---------------------------------------------------------------------------
# LoginRequest
# ---------------------------------------------------------------------------


def test_login_request_valid() -> None:
    """A valid email + password constructs a LoginRequest."""
    req = LoginRequest(email="user@example.com", password="secret123")
    assert req.email == "user@example.com"
    assert req.password == "secret123"


def test_login_request_rejects_invalid_email() -> None:
    """A malformed email is rejected."""
    with pytest.raises(ValidationError):
        LoginRequest(email="bad", password="secret123")


# ---------------------------------------------------------------------------
# RoleUpdateRequest
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("role", VALID_ROLES)
def test_role_update_accepts_all_valid_roles(role: str) -> None:
    """Every valid role is accepted by RoleUpdateRequest."""
    req = RoleUpdateRequest(role=role)
    assert req.role == role


def test_role_update_rejects_invalid_role() -> None:
    """An invalid role is rejected."""
    with pytest.raises(ValidationError):
        RoleUpdateRequest(role="superadmin")


# ---------------------------------------------------------------------------
# LanguageUpdateRequest
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("language", VALID_LANGUAGES)
def test_language_update_accepts_all_valid_languages(language: str) -> None:
    """Every valid language is accepted by LanguageUpdateRequest."""
    req = LanguageUpdateRequest(preferred_language=language)
    assert req.preferred_language == language


def test_language_update_rejects_invalid_language() -> None:
    """An invalid language is rejected."""
    with pytest.raises(ValidationError):
        LanguageUpdateRequest(preferred_language="fr")


# ---------------------------------------------------------------------------
# ProfileResponse & LoginResponse
# ---------------------------------------------------------------------------


def test_profile_response_minimal() -> None:
    """ProfileResponse can be constructed with required fields only."""
    profile = ProfileResponse(
        id="user-uuid-1",
        full_name="Test User",
        role="leader",
        preferred_language="en",
    )
    assert profile.id == "user-uuid-1"
    assert profile.phone_number is None
    assert profile.avatar_url is None
    assert profile.shg_id is None


def test_profile_response_with_shg() -> None:
    """ProfileResponse includes shg_id when provided."""
    profile = ProfileResponse(
        id="user-uuid-1",
        full_name="Test User",
        role="member",
        preferred_language="kn",
        shg_id="shg-uuid-1",
    )
    assert profile.shg_id == "shg-uuid-1"


def test_login_response_structure() -> None:
    """LoginResponse wraps an access token and a ProfileResponse."""
    profile = ProfileResponse(
        id="user-uuid-1",
        full_name="Test User",
        role="leader",
        preferred_language="en",
    )
    resp = LoginResponse(access_token="jwt-token", profile=profile)
    assert resp.access_token == "jwt-token"
    assert resp.token_type == "bearer"
    assert resp.profile.id == "user-uuid-1"
