"""JWT validation and user identity resolution."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from .config import settings

bearer_scheme = HTTPBearer(auto_error=False)


class TokenPayload(BaseModel):
    sub: str  # Supabase user UUID
    role: str = "authenticated"
    email: str | None = None


def decode_supabase_jwt(token: str) -> TokenPayload:
    """Decode and validate a Supabase JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        return TokenPayload(
            sub=payload["sub"],
            role=payload.get("role", "authenticated"),
            email=payload.get("email"),
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def get_current_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> TokenPayload:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )
    return decode_supabase_jwt(credentials.credentials)
