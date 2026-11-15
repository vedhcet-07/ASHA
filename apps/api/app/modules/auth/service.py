"""Business logic for the Auth module.

Every function accepts a Supabase client (injected via the ``get_db``
dependency in the router) and performs the necessary Supabase Auth and
database operations. Service-layer errors are raised as ``AppError``
subclasses so the global exception handlers in ``core/errors.py`` convert
them into the standard error envelope.

Key responsibilities:
- ``signup``        — create a Supabase Auth user + a ``profiles`` row.
- ``login``         — authenticate via Supabase, return JWT + profile.
- ``get_profile``   — fetch the caller's profile (used by ``/me``).
- ``update_role``   — write a new role to the ``profiles`` table.
- ``update_language`` — write a new ``preferred_language`` to ``profiles``.

Requirements: 1.1, 1.2, 1.3, 1.5, 1.6
"""

from __future__ import annotations

from supabase import Client

from app.core.errors import ConflictError, NotFoundError, UnauthorizedError
from app.core.logging import get_logger
from app.modules.auth.schemas import (
    LanguageUpdateRequest,
    LoginRequest,
    LoginResponse,
    ProfileResponse,
    RoleUpdateRequest,
    SignupRequest,
)

log = get_logger(__name__)

# ---------------------------------------------------------------------------
# Signup
# ---------------------------------------------------------------------------


def signup(db: Client, request: SignupRequest) -> ProfileResponse:
    """Create a Supabase Auth user and a matching ``profiles`` row.

    The auth user is created via the GoTrue admin API (``auth.admin.create_user``)
    with ``email_confirm=True`` so the user can log in immediately. The role
    is embedded in both ``user_metadata`` and ``app_metadata`` so it is
    available in the JWT claims when the user subsequently logs in.

    Parameters
    ----------
    db:
        An authenticated Supabase client (service-role key).
    request:
        Validated ``SignupRequest`` with email, password, full_name, role.

    Returns
    -------
    ProfileResponse
        The newly created profile.

    Raises
    ------
    ConflictError
        If a user with the given email already exists.
    """
    # 1. Create the Supabase Auth user via the admin API.
    try:
        auth_response = db.auth.admin.create_user(
            {
                "email": request.email,
                "password": request.password,
                "email_confirm": True,
                "user_metadata": {
                    "full_name": request.full_name,
                    "role": request.role,
                },
                "app_metadata": {"role": request.role},
            }
        )
    except Exception as exc:  # noqa: BLE001 — GoTrue raises varied types
        msg = str(exc).lower()
        if any(kw in msg for kw in ("already", "registered", "exists", "duplicate")):
            raise ConflictError("A user with this email already exists.") from exc
        log.error("signup_auth_user_failed", email=request.email, error=str(exc))
        raise ConflictError(f"Failed to create auth user: {exc}") from exc

    user_id: str = auth_response.user.id

    # 2. Insert the profiles row that links the auth user to a role.
    profile_row: dict = {
        "id": user_id,
        "full_name": request.full_name,
        "role": request.role,
        "preferred_language": "en",
    }
    if request.phone_number:
        profile_row["phone_number"] = request.phone_number

    try:
        db.table("profiles").insert(profile_row).execute()
    except Exception as exc:  # noqa: BLE001
        log.error(
            "signup_profile_insert_failed",
            user_id=user_id,
            error=str(exc),
        )
        # The auth user was created but the profile row failed. Surface the
        # error so the caller can retry or clean up.
        raise ConflictError(f"Failed to create profile: {exc}") from exc

    log.info("signup_completed", user_id=user_id, role=request.role)

    # 3. Fetch and return the profile (resolves shg_id from shg_members).
    return get_profile(db, user_id)


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


def login(db: Client, request: LoginRequest) -> LoginResponse:
    """Authenticate the caller via Supabase and return a JWT + profile.

    Delegates password verification to Supabase Auth (``sign_in_with_password``).
    On success the GoTrue response contains a session with the JWT
    ``access_token`` and the user's UUID. The profile is then fetched from
    the ``profiles`` table.

    Parameters
    ----------
    db:
        An authenticated Supabase client (service-role key).
    request:
        Validated ``LoginRequest`` with email and password.

    Returns
    -------
    LoginResponse
        The JWT, token type, and the caller's profile.

    Raises
    ------
    UnauthorizedError
        If the credentials are invalid.
    """
    try:
        auth_response = db.auth.sign_in_with_password(
            {
                "email": request.email,
                "password": request.password,
            }
        )
    except Exception as exc:  # noqa: BLE001
        raise UnauthorizedError("Invalid email or password.") from exc

    session = auth_response.session
    if session is None or not session.access_token:
        raise UnauthorizedError("Authentication succeeded but no session was returned.")

    user_id: str = auth_response.user.id
    profile = get_profile(db, user_id)

    log.info("login_completed", user_id=user_id, role=profile.role)

    return LoginResponse(
        access_token=session.access_token,
        token_type="bearer",
        profile=profile,
    )


# ---------------------------------------------------------------------------
# Profile lookup
# ---------------------------------------------------------------------------


def get_profile(db: Client, user_id: str) -> ProfileResponse:
    """Fetch a user's profile from the ``profiles`` table.

    Also resolves the user's SHG membership (if any) from the
    ``shg_members`` table so the caller's SHG context is available in a
    single round-trip.

    Parameters
    ----------
    db:
        An authenticated Supabase client (service-role key).
    user_id:
        The Supabase Auth user UUID (matches ``profiles.id``).

    Returns
    -------
    ProfileResponse
        The user's profile with ``shg_id`` resolved if the user is an SHG
        member.

    Raises
    ------
    NotFoundError
        If no ``profiles`` row exists for the given ``user_id``.
    """
    try:
        result = (
            db.table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        data: dict = result.data
    except Exception as exc:  # noqa: BLE001
        raise NotFoundError("Profile not found.") from exc

    shg_id = _resolve_shg_id(db, user_id)

    return ProfileResponse(
        id=data["id"],
        full_name=data["full_name"],
        role=data["role"],
        preferred_language=data["preferred_language"],
        phone_number=data.get("phone_number"),
        avatar_url=data.get("avatar_url"),
        shg_id=shg_id,
    )


# ---------------------------------------------------------------------------
# Role update
# ---------------------------------------------------------------------------


def update_role(db: Client, user_id: str, request: RoleUpdateRequest) -> ProfileResponse:
    """Update the user's role in the ``profiles`` table.

    The role is written to ``profiles.role``. The ``app_metadata`` in the
    auth user is *not* updated here — that would require a separate admin
    call. For the MVP the ``profiles`` table is the source of truth; the
    JWT role claim is set at signup time and the ``/me`` endpoint reads the
    role from the database rather than relying solely on the JWT.

    Parameters
    ----------
    db:
        An authenticated Supabase client (service-role key).
    user_id:
        The authenticated caller's UUID (from ``get_current_user``).
    request:
        Validated ``RoleUpdateRequest`` with the new role.

    Returns
    -------
    ProfileResponse
        The updated profile.

    Raises
    ------
    NotFoundError
        If no ``profiles`` row exists for the given ``user_id``.
    """
    try:
        db.table("profiles").update({"role": request.role}).eq("id", user_id).execute()
    except Exception as exc:  # noqa: BLE001
        raise NotFoundError("Profile not found.") from exc

    log.info("role_updated", user_id=user_id, new_role=request.role)

    return get_profile(db, user_id)


# ---------------------------------------------------------------------------
# Language update
# ---------------------------------------------------------------------------


def update_language(
    db: Client, user_id: str, request: LanguageUpdateRequest
) -> ProfileResponse:
    """Update the user's preferred language in the ``profiles`` table.

    Parameters
    ----------
    db:
        An authenticated Supabase client (service-role key).
    user_id:
        The authenticated caller's UUID (from ``get_current_user``).
    request:
        Validated ``LanguageUpdateRequest`` with the new language.

    Returns
    -------
    ProfileResponse
        The updated profile.

    Raises
    ------
    NotFoundError
        If no ``profiles`` row exists for the given ``user_id``.
    """
    try:
        db.table("profiles").update(
            {"preferred_language": request.preferred_language}
        ).eq("id", user_id).execute()
    except Exception as exc:  # noqa: BLE001
        raise NotFoundError("Profile not found.") from exc

    log.info(
        "language_updated",
        user_id=user_id,
        new_language=request.preferred_language,
    )

    return get_profile(db, user_id)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _resolve_shg_id(db: Client, user_id: str) -> str | None:
    """Look up the user's active SHG membership, if any.

    Queries ``shg_members`` for a non-soft-deleted row matching the user's
    profile ID. Returns ``None`` for users who are not SHG members (e.g.
    buyers) or when the lookup fails for any reason.
    """
    try:
        result = (
            db.table("shg_members")
            .select("shg_id")
            .eq("profile_id", user_id)
            .is_("deleted_at", "null")
            .limit(1)
            .execute()
        )
        if result.data:
            return str(result.data[0]["shg_id"])
    except Exception:  # noqa: BLE001 — non-critical lookup
        log.debug("shg_id_lookup_failed", user_id=user_id)
    return None
