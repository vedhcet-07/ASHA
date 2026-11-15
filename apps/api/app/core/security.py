"""JWT validation and core FastAPI security dependencies.

Responsibilities:
- Decode and validate Supabase-issued JWTs via python-jose (HS256).
- Provide ``get_current_user`` — a FastAPI dependency that extracts the
  bearer token from the Authorization header, verifies it, and returns a
  typed ``CurrentUser`` value.
- Provide ``get_db`` — a FastAPI dependency that yields an authenticated
  Supabase client using the service-role key.

Usage::

    from app.core.security import get_current_user, get_db, CurrentUser

    @router.get("/me")
    async def me(user: CurrentUser = Depends(get_current_user)):
        return {"user_id": user.user_id, "role": user.role}
"""

from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import ExpiredSignatureError, JWTError, jwt
from supabase import Client, create_client

from app.core.config import settings
from app.core.errors import UnauthorizedError

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_ALGORITHM = "HS256"
_AUDIENCE = "authenticated"

# HTTPBearer will return HTTP 403 by default when the header is missing.
# We override auto_error=False so we can raise our own HTTP 401.
_bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# CurrentUser dataclass
# ---------------------------------------------------------------------------


@dataclass
class CurrentUser:
    """Typed representation of the authenticated caller.

    Fields are populated from the validated JWT claims.
    """

    user_id: str
    role: str
    shg_id: str | None


# ---------------------------------------------------------------------------
# JWT verification
# ---------------------------------------------------------------------------


def verify_jwt(token: str) -> dict:
    """Decode and validate a Supabase JWT.

    Parameters
    ----------
    token:
        The raw JWT string (without the ``Bearer `` prefix).

    Returns
    -------
    dict
        The decoded claims payload.

    Raises
    ------
    UnauthorizedError
        On any of: missing token, expired token, invalid signature,
        or malformed JWT.
    """
    if not token:
        raise UnauthorizedError("Authorization token is missing.")

    try:
        payload: dict = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=[_ALGORITHM],
            audience=_AUDIENCE,
        )
    except ExpiredSignatureError:
        raise UnauthorizedError("Authorization token has expired.")
    except JWTError as exc:
        raise UnauthorizedError(f"Authorization token is invalid: {exc}") from exc

    return payload


# ---------------------------------------------------------------------------
# FastAPI dependencies
# ---------------------------------------------------------------------------


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> CurrentUser:
    """FastAPI dependency — resolve the authenticated caller from the JWT.

    Extracts the ``Authorization: Bearer <token>`` header, decodes it, and
    returns a ``CurrentUser`` with ``user_id``, ``role``, and ``shg_id``.

    Raises HTTP 401 (via ``UnauthorizedError``) when the header is absent,
    the token is expired, or the signature is invalid.
    """
    if credentials is None:
        raise UnauthorizedError("Authorization header is missing.")

    payload = verify_jwt(credentials.credentials)

    # Supabase embeds the user UUID in the ``sub`` claim.
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Token payload is missing the subject (sub) claim.")

    # App metadata holds the active role and SHG assignment written at login.
    app_metadata: dict = payload.get("app_metadata", {})
    user_metadata: dict = payload.get("user_metadata", {})

    # Role may be stored in app_metadata (server-set) or user_metadata (fallback).
    role: str = app_metadata.get("role") or user_metadata.get("role") or ""
    if not role:
        raise UnauthorizedError("Token payload is missing the role claim.")

    shg_id: str | None = app_metadata.get("shg_id") or user_metadata.get("shg_id")

    return CurrentUser(user_id=user_id, role=role, shg_id=shg_id)


def get_db() -> Client:
    """FastAPI dependency — return a Supabase client using the service-role key.

    The service-role key bypasses Row-Level Security and is used only within
    trusted server-side service functions.  Never expose this client or its
    credentials to the browser.

    Returns
    -------
    supabase.Client
        An authenticated Supabase client ready for database operations.
    """
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
