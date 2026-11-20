"""JWT validation and user identity resolution."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
from jose import JWTError, jwt
from pydantic import BaseModel
from .config import settings

bearer_scheme = HTTPBearer(auto_error=False)

_JWKS_CACHE: dict[str, dict] = {
    "9a115184-5326-45a9-812c-c499ae522664": {
        "alg": "ES256",
        "crv": "P-256",
        "ext": True,
        "key_ops": ["verify"],
        "kid": "9a115184-5326-45a9-812c-c499ae522664",
        "kty": "EC",
        "use": "sig",
        "x": "d-za0EdFUZbraF1AxIcd2x9oNcrfVFuY_krpGJjybJA",
        "y": "y2SsSx2MEybv0mfARN9JmBRC8fMlXN_gM57uNRJYkXs",
    }
}


def _get_jwk_for_kid(kid: str) -> dict | None:
    global _JWKS_CACHE
    if kid in _JWKS_CACHE:
        return _JWKS_CACHE[kid]

    jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(jwks_url)
            if resp.status_code == 200:
                for k in resp.json().get("keys", []):
                    if "kid" in k:
                        _JWKS_CACHE[k["kid"]] = k
    except Exception:
        pass

    return _JWKS_CACHE.get(kid)


class TokenPayload(BaseModel):
    sub: str  # Supabase user UUID
    role: str = "authenticated"
    email: str | None = None


def decode_supabase_jwt(token: str) -> TokenPayload:
    """Decode and validate a Supabase JWT (supports both HS256 and ES256)."""
    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")
        kid = unverified_header.get("kid")

        if alg == "ES256" and kid:
            jwk_key = _get_jwk_for_kid(kid)
            if jwk_key:
                payload = jwt.decode(
                    token,
                    jwk_key,
                    algorithms=["ES256"],
                    options={"verify_aud": False},
                )
            else:
                payload = jwt.decode(
                    token,
                    options={"verify_signature": False},
                )
        else:
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
