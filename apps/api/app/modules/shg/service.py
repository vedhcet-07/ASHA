"""Business logic for the SHG module.

Each function takes a Supabase client (from ``get_db``) and returns a plain
``dict`` row that the router validates into ``SHGResponse``. Errors are
raised as ``AppError`` subclasses (``NotFoundError``, ``ForbiddenError``) so
the global exception handlers translate them into the standard
``ErrorResponse`` envelope.

The service-role client bypasses Row-Level Security, so service-layer guards
(rejecting callers who are not this SHG's leader) provide the primary
access control. RLS remains a defence-in-depth backstop at the row level.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from supabase import Client

from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.core.logging import get_logger
from app.modules.shg.schemas import (
    MAX_MEMBERS_PER_SHG,
    MemberAvailabilityCreate,
    MemberCreate,
    MemberSkillCreate,
    MemberUpdate,
    SHGCreate,
    SHGUpdate,
)

log = get_logger(__name__)

# Columns returned for SHG responses — kept in sync with ``SHGResponse``.
_SHG_COLUMNS: tuple[str, ...] = (
    "id",
    "name",
    "registration_number",
    "address",
    "district",
    "state",
    "leader_id",
    "minimum_margin_percent",
    "created_at",
    "updated_at",
)


def _select() -> str:
    """Comma-joined column list for Supabase ``select()``."""
    return ",".join(_SHG_COLUMNS)


def create_shg(db: Client, payload: SHGCreate, leader_id: str) -> dict[str, Any]:
    """Insert a new SHG with *leader_id* as the creator-leader.

    Requirement 2.1.

    Parameters
    ----------
    db:
        Supabase client from ``get_db``.
    payload:
        Validated ``SHGCreate`` body.
    leader_id:
        The profile UUID of the authenticated Leader; becomes the SHG's
        ``leader_id``.

    Returns
    -------
    dict
        The inserted SHG row.
    """
    row: dict[str, Any] = {
        "name": payload.name,
        "district": payload.district,
        "state": payload.state,
        "registration_number": payload.registration_number,
        "address": payload.address,
        "leader_id": leader_id,
    }
    if payload.minimum_margin_percent is not None:
        # NUMERIC columns accept floats; PostgreSQL stores the precise value.
        row["minimum_margin_percent"] = float(payload.minimum_margin_percent)

    response = db.table("shgs").insert(row).select(_select()).execute()
    data = response.data
    if not data:
        raise NotFoundError("SHG could not be created.")
    return data[0]


def get_shg(db: Client, shg_id: str) -> dict[str, Any]:
    """Fetch a single SHG by id.

    Raises ``NotFoundError`` if the SHG does not exist.
    """
    response = (
        db.table("shgs").select(_select()).eq("id", str(shg_id)).maybe_single().execute()
    )
    if response.data is None:
        raise NotFoundError(f"SHG '{shg_id}' not found.")
    return response.data


def update_shg(
    db: Client, shg_id: str, payload: SHGUpdate, leader_id: str
) -> dict[str, Any]:
    """Update an SHG's details. Only the SHG's own leader may update it.

    Raises ``NotFoundError`` if the SHG does not exist and ``ForbiddenError`` if
    the caller is not this SHG's leader.

    Only fields explicitly set in *payload* are written; omitted fields keep
    their current values. ``leader_id`` is never changed here.
    """
    existing = get_shg(db, shg_id)
    if str(existing["leader_id"]) != str(leader_id):
        raise ForbiddenError("Only the leader of this SHG can update its details.")

    updates = payload.model_dump(exclude_unset=True)
    if (
        "minimum_margin_percent" in updates
        and updates["minimum_margin_percent"] is not None
    ):
        updates["minimum_margin_percent"] = float(updates["minimum_margin_percent"])

    if not updates:
        # Nothing to change — return the current record unchanged.
        return existing

    response = (
        db.table("shgs")
        .update(updates)
        .eq("id", str(shg_id))
        .select(_select())
        .execute()
    )
    data = response.data
    if not data:
        raise NotFoundError(f"SHG '{shg_id}' not found.")
    return data[0]


def get_my_shg(db: Client, user_id: str) -> dict[str, Any]:
    """Resolve the SHG the current user belongs to.

    A user may belong to an SHG either as its ``leader_id`` or as a row in
    ``shg_members``. Leaders are resolved first; otherwise membership is
    checked (excluding soft-deleted members).

    Raises ``NotFoundError`` if the user is neither a leader nor a member of
    any SHG.
    """
    # 1. Is the user the leader of an SHG?
    leader_response = (
        db.table("shgs").select(_select()).eq("leader_id", str(user_id)).maybe_single().execute()
    )
    if leader_response.data is not None:
        return leader_response.data

    # 2. Otherwise, resolve via shg_members membership (excluding soft-deleted).
    member_response = (
        db.table("shg_members")
        .select("shg_id")
        .eq("profile_id", str(user_id))
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    members = member_response.data
    if not members:
        raise NotFoundError("You are not a member of any SHG.")
    shg_id = members[0]["shg_id"]
    return get_shg(db, shg_id)


# ---------------------------------------------------------------------------
# Member skills & availability — Requirements 2.4, 2.5, 2.6, 2.7
# ---------------------------------------------------------------------------

# Column lists kept in sync with the response models in ``schemas.py``.
_SKILL_COLS = "id,shg_member_id,skill,proficiency,created_at,updated_at"
_AVAIL_COLS = (
    "id,shg_member_id,available_from,available_to,status,note,created_at,updated_at"
)


def _assert_shg_leader(db: Client, shg_id: str, leader_id: str) -> dict[str, Any]:
    """Ensure *leader_id* is the leader of *shg_id*.

    Raises ``NotFoundError`` if the SHG does not exist and ``ForbiddenError`` if
    the caller is not this SHG's leader. Returns the SHG row on success.
    """
    shg = get_shg(db, shg_id)
    if str(shg["leader_id"]) != str(leader_id):
        raise ForbiddenError("Only the leader of this SHG can perform this action.")
    return shg


def _assert_same_shg_access(db: Client, shg_id: str, user_id: str) -> None:
    """Ensure the caller belongs to *shg_id* (as its leader or a member).

    Requirement 2.10: only members of the same SHG may read member records.
    The service-role client bypasses Row-Level Security, so this guard
    provides the primary access control; RLS remains a defence-in-depth
    backstop.

    Raises ``NotFoundError`` if the SHG does not exist and ``ForbiddenError`` if
    the caller is neither the SHG's leader nor one of its members.
    """
    shg = get_shg(db, shg_id)
    if str(shg["leader_id"]) == str(user_id):
        return
    member = (
        db.table("shg_members")
        .select("id")
        .eq("shg_id", shg_id)
        .eq("profile_id", user_id)
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    if member.data:
        return
    raise ForbiddenError("You do not have access to this SHG's member records.")


def _get_member_in_shg(db: Client, shg_id: str, member_id: str) -> dict[str, Any]:
    """Fetch a member row, verifying it belongs to *shg_id* and is active.

    Raises ``NotFoundError`` if the member does not exist, is soft-deleted, or
    belongs to a different SHG. A single not-found message is used so the
    response does not leak cross-SHG existence.
    """
    response = (
        db.table("shg_members")
        .select("id,shg_id")
        .eq("id", member_id)
        .eq("shg_id", shg_id)
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if response.data is None:
        raise NotFoundError(f"Member '{member_id}' not found in SHG '{shg_id}'.")
    return response.data


# --- Skills -----------------------------------------------------------------


def add_member_skill(
    db: Client,
    shg_id: str,
    member_id: str,
    payload: MemberSkillCreate,
    leader_id: str,
) -> dict[str, Any]:
    """Add a skill to a member. Leader-only. Enforces UNIQUE(shg_member_id, skill).

    Requirements 2.4, 2.5.

    Raises ``ForbiddenError`` if the caller is not this SHG's leader,
    ``NotFoundError`` if the member is not in this SHG, and ``ConflictError`` if
    the member already has the given skill.
    """
    _assert_shg_leader(db, shg_id, leader_id)
    _get_member_in_shg(db, shg_id, member_id)

    existing = (
        db.table("member_skills")
        .select("id")
        .eq("shg_member_id", member_id)
        .eq("skill", payload.skill)
        .maybe_single()
        .execute()
    )
    if existing.data is not None:
        raise ConflictError(f"Member already has the skill '{payload.skill}'.")

    row: dict[str, Any] = {
        "shg_member_id": member_id,
        "skill": payload.skill,
        "proficiency": payload.proficiency,
    }
    response = db.table("member_skills").insert(row).select(_SKILL_COLS).execute()
    data = response.data
    if not data:
        raise NotFoundError("Member skill could not be created.")
    return data[0]


def list_member_skills(
    db: Client, shg_id: str, member_id: str, user_id: str
) -> list[dict[str, Any]]:
    """List a member's skills. Available to any same-SHG user.

    Requirements 2.4, 2.10.
    """
    _assert_same_shg_access(db, shg_id, user_id)
    _get_member_in_shg(db, shg_id, member_id)

    response = (
        db.table("member_skills")
        .select(_SKILL_COLS)
        .eq("shg_member_id", member_id)
        .order("created_at")
        .execute()
    )
    return response.data or []


def delete_member_skill(
    db: Client, shg_id: str, member_id: str, skill_id: str, leader_id: str
) -> None:
    """Remove a skill from a member. Leader-only.

    Raises ``NotFoundError`` if the skill does not belong to the given member.
    """
    _assert_shg_leader(db, shg_id, leader_id)
    _get_member_in_shg(db, shg_id, member_id)

    existing = (
        db.table("member_skills")
        .select("id")
        .eq("id", skill_id)
        .eq("shg_member_id", member_id)
        .maybe_single()
        .execute()
    )
    if existing.data is None:
        raise NotFoundError(f"Skill '{skill_id}' not found for member '{member_id}'.")

    db.table("member_skills").delete().eq("id", skill_id).execute()


# --- Availability ------------------------------------------------------------


def add_member_availability(
    db: Client,
    shg_id: str,
    member_id: str,
    payload: MemberAvailabilityCreate,
    leader_id: str,
) -> dict[str, Any]:
    """Add an availability window to a member. Leader-only.

    Requirements 2.6, 2.7.
    """
    _assert_shg_leader(db, shg_id, leader_id)
    _get_member_in_shg(db, shg_id, member_id)

    row: dict[str, Any] = {
        "shg_member_id": member_id,
        "available_from": payload.available_from.isoformat(),
        "available_to": payload.available_to.isoformat(),
        "status": payload.status,
    }
    if payload.note is not None:
        row["note"] = payload.note

    response = db.table("member_availability").insert(row).select(_AVAIL_COLS).execute()
    data = response.data
    if not data:
        raise NotFoundError("Member availability could not be created.")
    return data[0]


def list_member_availability(
    db: Client, shg_id: str, member_id: str, user_id: str
) -> list[dict[str, Any]]:
    """List a member's availability windows. Available to any same-SHG user.

    Requirements 2.6, 2.7, 2.10.
    """
    _assert_same_shg_access(db, shg_id, user_id)
    _get_member_in_shg(db, shg_id, member_id)

    response = (
        db.table("member_availability")
        .select(_AVAIL_COLS)
        .eq("shg_member_id", member_id)
        .order("available_from")
        .execute()
    )
    return response.data or []


def delete_member_availability(
    db: Client, shg_id: str, member_id: str, availability_id: str, leader_id: str
) -> None:
    """Remove an availability window from a member. Leader-only.

    Raises ``NotFoundError`` if the window does not belong to the given member.
    """
    _assert_shg_leader(db, shg_id, leader_id)
    _get_member_in_shg(db, shg_id, member_id)

    existing = (
        db.table("member_availability")
        .select("id")
        .eq("id", availability_id)
        .eq("shg_member_id", member_id)
        .maybe_single()
        .execute()
    )
    if existing.data is None:
        raise NotFoundError(
            f"Availability window '{availability_id}' not found for member '{member_id}'."
        )

    db.table("member_availability").delete().eq("id", availability_id).execute()


# ---------------------------------------------------------------------------
# Member CRUD — Requirements 2.2, 2.3, 2.9, 2.10
# ---------------------------------------------------------------------------

# Columns returned for member responses — kept in sync with ``MemberResponse``.
_MEMBER_COLUMNS: tuple[str, ...] = (
    "id",
    "shg_id",
    "profile_id",
    "display_name",
    "daily_capacity",
    "availability",
    "quality_score",
    "workload_score",
    "joined_at",
    "deleted_at",
    "created_at",
    "updated_at",
)


def _member_select() -> str:
    """Comma-joined column list for member Supabase ``select()`` calls."""
    return ",".join(_MEMBER_COLUMNS)


def _fetch_member(db: Client, shg_id: str, member_id: str) -> dict[str, Any]:
    """Fetch the full member row, verifying it belongs to *shg_id* and is active.

    Raises ``NotFoundError`` if the member does not exist, is soft-deleted, or
    belongs to a different SHG. A single not-found message is used so the
    response does not leak cross-SHG existence.
    """
    response = (
        db.table("shg_members")
        .select(_member_select())
        .eq("shg_id", str(shg_id))
        .eq("id", str(member_id))
        .is_("deleted_at", "null")
        .maybe_single()
        .execute()
    )
    if response.data is None:
        raise NotFoundError(f"Member '{member_id}' not found in SHG '{shg_id}'.")
    return response.data


def list_members(db: Client, shg_id: str, user_id: str) -> list[dict[str, Any]]:
    """List all non-deleted members of an SHG, ordered by join date.

    Requirement 2.2: returns the active members of the SHG.
    Requirement 2.10: only members of the same SHG may read member records.
    The service-role client bypasses RLS, so ``_assert_same_shg_access``
    provides the primary access control.

    Raises ``NotFoundError`` if the SHG does not exist and ``ForbiddenError`` if
    the caller is neither the SHG's leader nor one of its members.
    """
    _assert_same_shg_access(db, shg_id, user_id)
    response = (
        db.table("shg_members")
        .select(_member_select())
        .eq("shg_id", str(shg_id))
        .is_("deleted_at", "null")
        .order("joined_at")
        .execute()
    )
    return response.data or []


def get_member(
    db: Client, shg_id: str, member_id: str, user_id: str
) -> dict[str, Any]:
    """Fetch a single non-deleted member of an SHG.

    Requirement 2.10: only members of the same SHG may read member records.

    Raises ``NotFoundError`` if the SHG or member does not exist and
    ``ForbiddenError`` if the caller is not a member of the SHG.
    """
    _assert_same_shg_access(db, shg_id, user_id)
    return _fetch_member(db, shg_id, member_id)


def create_member(
    db: Client, shg_id: str, payload: MemberCreate, leader_id: str
) -> dict[str, Any]:
    """Add a member to an SHG. Leader-only.

    Requirement 2.2: enforces a maximum of 15 active (non-soft-deleted)
    members per SHG.
    Requirement 2.3: ``display_name`` and ``daily_capacity`` greater than zero
    are required (enforced by the ``MemberCreate`` schema).

    Raises ``NotFoundError`` if the SHG does not exist, ``ForbiddenError`` if
    the caller is not this SHG's leader, and ``ConflictError`` if the SHG
    already has 15 active members.
    """
    _assert_shg_leader(db, shg_id, leader_id)

    # Enforce the 15-member cap on active (non-deleted) members (Requirement 2.2).
    count_response = (
        db.table("shg_members")
        .select("id", count="exact")
        .eq("shg_id", str(shg_id))
        .is_("deleted_at", "null")
        .execute()
    )
    active_count = count_response.count or 0
    if active_count >= MAX_MEMBERS_PER_SHG:
        raise ConflictError(
            f"An SHG may have at most {MAX_MEMBERS_PER_SHG} active members; "
            f"this SHG already has {active_count}."
        )

    row: dict[str, Any] = {
        "shg_id": str(shg_id),
        "display_name": payload.display_name,
        "daily_capacity": payload.daily_capacity,
    }
    # profile_id is optional — only set it when the caller links an auth user.
    if payload.profile_id is not None:
        row["profile_id"] = str(payload.profile_id)

    response = db.table("shg_members").insert(row).select(_member_select()).execute()
    data = response.data
    if not data:
        raise NotFoundError("Member could not be created.")
    log.info("member_created", shg_id=str(shg_id), member_id=data[0]["id"])
    return data[0]


def update_member(
    db: Client,
    shg_id: str,
    member_id: str,
    payload: MemberUpdate,
    leader_id: str,
) -> dict[str, Any]:
    """Update a member's details. Leader-only.

    Only fields explicitly set in *payload* are written; omitted fields keep
    their current values.

    Raises ``NotFoundError`` if the SHG or member does not exist and
    ``ForbiddenError`` if the caller is not this SHG's leader.
    """
    _assert_shg_leader(db, shg_id, leader_id)

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        # Nothing to change — return the current record unchanged.
        return _fetch_member(db, shg_id, member_id)

    response = (
        db.table("shg_members")
        .update(updates)
        .eq("id", str(member_id))
        .eq("shg_id", str(shg_id))
        .is_("deleted_at", "null")
        .select(_member_select())
        .execute()
    )
    data = response.data
    if not data:
        raise NotFoundError(f"Member '{member_id}' not found in SHG '{shg_id}'.")
    return data[0]


def delete_member(
    db: Client, shg_id: str, member_id: str, leader_id: str
) -> dict[str, Any]:
    """Soft-delete a member by setting ``deleted_at``. Leader-only.

    Requirement 2.9: a deleted member is soft-deleted so historical data
    (tasks, payout lines, performance metrics) is retained. Hard-delete is
    never performed through this endpoint.

    Raises ``NotFoundError`` if the SHG or member does not exist and
    ``ForbiddenError`` if the caller is not this SHG's leader. A member that
    is already soft-deleted is treated as not found.
    """
    _assert_shg_leader(db, shg_id, leader_id)

    response = (
        db.table("shg_members")
        .update({"deleted_at": datetime.now(timezone.utc).isoformat()})
        .eq("id", str(member_id))
        .eq("shg_id", str(shg_id))
        .is_("deleted_at", "null")
        .select(_member_select())
        .execute()
    )
    data = response.data
    if not data:
        raise NotFoundError(f"Member '{member_id}' not found in SHG '{shg_id}'.")
    log.info("member_soft_deleted", shg_id=str(shg_id), member_id=member_id)
    return data[0]
