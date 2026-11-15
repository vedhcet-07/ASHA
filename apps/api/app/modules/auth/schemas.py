"""Auth request/response schemas."""

from pydantic import BaseModel, EmailStr
from typing import Literal


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Literal["leader", "member", "approver", "checker", "buyer", "federation_staff"]
    preferred_language: str = "en"
    phone_number: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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
