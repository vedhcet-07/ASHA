from typing import Optional
from pydantic import BaseModel, EmailStr

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone_number: Optional[str] = None
    role: str = "member"
    preferred_language: str = "en"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SelectRoleRequest(BaseModel):
    role: str

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    preferred_language: Optional[str] = None

class ProfileResponse(BaseModel):
    id: str
    email: Optional[str] = None
    full_name: str
    phone_number: Optional[str] = None
    role: str
    preferred_language: str
    shg_id: Optional[str] = None
