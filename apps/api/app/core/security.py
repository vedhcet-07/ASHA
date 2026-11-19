from typing import Optional, Dict, Any
from fastapi import Header, Depends
from jose import jwt, JWTError
from app.core.config import get_settings
from app.core.errors import UnauthenticatedError, ForbiddenError

def verify_token(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        # In development/demo, allow fallback dev headers or anonymous role
        settings = get_settings()
        if settings.APP_ENV == "development":
            return {"sub": "dev-user-id", "role": "leader", "email": "leader@demo.asha"}
        raise UnauthenticatedError("Bearer token required")
    
    token = authorization.split(" ")[1]
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload
    except JWTError:
        if settings.APP_ENV == "development":
            return {"sub": "dev-user-id", "role": "leader", "email": "leader@demo.asha"}
        raise UnauthenticatedError("Invalid or expired token")

def require_role(*allowed_roles: str):
    def role_checker(user: Dict[str, Any] = Depends(verify_token)):
        user_role = user.get("role", "member")
        if allowed_roles and user_role not in allowed_roles and "admin" != user_role:
            raise ForbiddenError(f"Action requires one of roles: {allowed_roles}")
        return user
    return role_checker
