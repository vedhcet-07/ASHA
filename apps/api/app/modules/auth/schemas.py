"""Auth request/response schemas."""

from pydantic import BaseModel, field_validator
from typing import Literal


class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: Literal["leader", "member", "approver", "checker", "buyer", "federation_staff"]
    preferred_language: str = "en"
    phone_number: str | None = None

    @field_validator("email")
    @classmethod
    def email_basic_check(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Enter a valid email address")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Full name is required")
        return v.strip()


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def email_basic_check(cls, v: str) -> str:
        return v.strip().lower()


class SelectRoleRequest(BaseModel):
    role: Literal["leader", "member", "approver", "checker", "buyer", "federation_staff"]


class UpdateProfileRequest(BaseModel):
    full_name: str | None = None
    phone_number: str | None = None
    preferred_language: str | None = None


class ProfileResponse(BaseModel):
    id: str
    full_name: str
    phone_number: str | None
    role: str
    preferred_language: str
    created_at: str
    updated_at: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    profile: ProfileResponse
