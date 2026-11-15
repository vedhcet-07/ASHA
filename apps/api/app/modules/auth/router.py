"""FastAPI router for the Auth module.

Endpoints (all under the ``/api/v1`` prefix applied in ``main.py``):

    POST   /auth/signup     — create Supabase auth user + profiles row
    POST   /auth/login      — authenticate, return JWT + profile
    GET    /auth/me         — return the caller's profile (authenticated)
    PUT    /auth/role       — update the caller's active role (authenticated)
    PUT    /auth/language   — update preferred_language (authenticated)

All responses use the standard ``SuccessResponse`` envelope. Errors are
raised as ``AppError`` subclasses and handled by the global exception
handlers in ``core/errors.py``.

Requirements: 1.1, 1.2, 1.3, 1.5, 1.6
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, status
from supabase import Client

from app.core.dependencies import get_current_user, get_db
from app.core.schemas import SuccessResponse, success_response
from app.core.security import CurrentUser
from app.modules.auth import service
from app.modules.auth.schemas import (
    LanguageUpdateRequest,
    LoginRequest,
    LoginResponse,
    ProfileResponse,
    RoleUpdateRequest,
    SignupRequest,
)

router = APIRouter(prefix="/auth")


# ---------------------------------------------------------------------------
# Signup — public (no auth required)
# ---------------------------------------------------------------------------


@router.post(
    "/signup",
    response_model=SuccessResponse[ProfileResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Sign up a new user",
    description=(
        "Creates a Supabase Auth user with the given email and password, "
        "then inserts a matching row in the ``profiles`` table with the "
        "specified role. The email is auto-confirmed so the user can log in "
        "immediately."
    ),
)
async def signup(
    request: SignupRequest,
    req: Request,
    db: Client = Depends(get_db),
) -> SuccessResponse[ProfileResponse]:
    profile = service.signup(db, request)
    return success_response(profile, req)


# ---------------------------------------------------------------------------
# Login — public (no auth required)
# ---------------------------------------------------------------------------


@router.post(
    "/login",
    response_model=SuccessResponse[LoginResponse],
    summary="Log in",
    description=(
        "Authenticates the caller via Supabase Auth and returns a JWT "
        "access token along with the user's profile (including resolved "
        "SHG membership)."
    ),
)
async def login(
    request: LoginRequest,
    req: Request,
    db: Client = Depends(get_db),
) -> SuccessResponse[LoginResponse]:
    result = service.login(db, request)
    return success_response(result, req)


# ---------------------------------------------------------------------------
# Me — authenticated
# ---------------------------------------------------------------------------


@router.get(
    "/me",
    response_model=SuccessResponse[ProfileResponse],
    summary="Get current user profile",
    description=(
        "Returns the authenticated caller's profile, including role, "
        "preferred language, and resolved SHG membership."
    ),
)
async def get_me(
    req: Request,
    user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
) -> SuccessResponse[ProfileResponse]:
    profile = service.get_profile(db, user.user_id)
    return success_response(profile, req)


# ---------------------------------------------------------------------------
# Role update — authenticated
# ---------------------------------------------------------------------------


@router.put(
    "/role",
    response_model=SuccessResponse[ProfileResponse],
    summary="Update active role",
    description=(
        "Updates the authenticated user's role in the ``profiles`` table. "
        "Use this when a user holds multiple roles and needs to switch "
        "their active role."
    ),
)
async def update_role(
    request: RoleUpdateRequest,
    req: Request,
    user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
) -> SuccessResponse[ProfileResponse]:
    profile = service.update_role(db, user.user_id, request)
    return success_response(profile, req)


# ---------------------------------------------------------------------------
# Language update — authenticated
# ---------------------------------------------------------------------------


@router.put(
    "/language",
    response_model=SuccessResponse[ProfileResponse],
    summary="Update preferred language",
    description=(
        "Updates the authenticated user's preferred language "
        "(``en``, ``kn``, or ``hi``) in the ``profiles`` table."
    ),
)
async def update_language(
    request: LanguageUpdateRequest,
    req: Request,
    user: CurrentUser = Depends(get_current_user),
    db: Client = Depends(get_db),
) -> SuccessResponse[ProfileResponse]:
    profile = service.update_language(db, user.user_id, request)
    return success_response(profile, req)
