"""SHG and member management routes."""

from fastapi import APIRouter, HTTPException, status

from app.core.dependencies import SupabaseClient, CurrentToken, success_response
from app.core.errors import AshaAPIError
from .schemas import (
    CreateSHGRequest,
    UpdateSHGRequest,
    AddMemberRequest,
    UpdateMemberRequest,
    AddSkillRequest,
    AddAvailabilityRequest,
)

router = APIRouter(tags=["shg"])


# ─────────────────────────────────────
# SHG endpoints
# ─────────────────────────────────────

@router.get("/shgs/current")
async def get_current_shg(token: CurrentToken, db: SupabaseClient):
    """Get the SHG the current user belongs to."""
    shg_id = _get_user_shg_id(token.sub, db)
    result = db.table("shgs").select("*").eq("id", shg_id).single().execute()
    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="SHG not found", status_code=404)
    return success_response(result.data)


@router.post("/shgs", status_code=status.HTTP_201_CREATED)
async def create_shg(body: CreateSHGRequest, token: CurrentToken, db: SupabaseClient):
    """Leader creates a new SHG."""
    _require_role(token, db, "leader")

    shg_data = {
        **body.model_dump(exclude_none=True),
        "created_by": token.sub,
    }
    result = db.table("shgs").insert(shg_data).execute()
    shg = result.data[0]

    return success_response(shg)


@router.patch("/shgs/current")
async def update_shg(body: UpdateSHGRequest, token: CurrentToken, db: SupabaseClient):
    """Leader updates SHG settings."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise AshaAPIError(code="VALIDATION_ERROR", message="Nothing to update")
    result = db.table("shgs").update(updates).eq("id", shg_id).single().execute()
    return success_response(result.data)


# ─────────────────────────────────────
# Member endpoints
# ─────────────────────────────────────

@router.get("/shgs/current/members")
async def list_members(token: CurrentToken, db: SupabaseClient):
    """List all active members in the current SHG."""
    shg_id = _get_user_shg_id(token.sub, db)
    result = (
        db.table("shg_members")
        .select("*, member_skills(*)")
        .eq("shg_id", shg_id)
        .is_("deleted_at", "null")
        .order("member_name")
        .execute()
    )
    return success_response(result.data)


@router.post("/shgs/current/members", status_code=status.HTTP_201_CREATED)
async def add_member(body: AddMemberRequest, token: CurrentToken, db: SupabaseClient):
    """Leader adds a new member to the SHG."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)

    member_data = {
        **body.model_dump(exclude_none=True),
        "shg_id": shg_id,
    }
    result = db.table("shg_members").insert(member_data).execute()
    return success_response(result.data[0])


@router.get("/shgs/current/members/{member_id}")
async def get_member(member_id: str, token: CurrentToken, db: SupabaseClient):
    """Get a specific member's details."""
    shg_id = _get_user_shg_id(token.sub, db)
    result = (
        db.table("shg_members")
        .select("*, member_skills(*), member_availability(*)")
        .eq("id", member_id)
        .eq("shg_id", shg_id)
        .is_("deleted_at", "null")
        .single()
        .execute()
    )
    if not result.data:
        raise AshaAPIError(code="NOT_FOUND", message="Member not found", status_code=404)
    return success_response(result.data)


@router.patch("/shgs/current/members/{member_id}")
async def update_member(
    member_id: str,
    body: UpdateMemberRequest,
    token: CurrentToken,
    db: SupabaseClient,
):
    """Leader updates a member's profile."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    _verify_member_in_shg(member_id, shg_id, db)

    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise AshaAPIError(code="VALIDATION_ERROR", message="Nothing to update")

    result = (
        db.table("shg_members")
        .update(updates)
        .eq("id", member_id)
        .eq("shg_id", shg_id)
        .single()
        .execute()
    )
    return success_response(result.data)


@router.delete("/shgs/current/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member(member_id: str, token: CurrentToken, db: SupabaseClient):
    """Leader soft-deletes a member."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    _verify_member_in_shg(member_id, shg_id, db)

    from datetime import datetime, timezone
    db.table("shg_members").update(
        {"deleted_at": datetime.now(timezone.utc).isoformat(), "is_active": False}
    ).eq("id", member_id).eq("shg_id", shg_id).execute()


# ─────────────────────────────────────
# Skills endpoints
# ─────────────────────────────────────

@router.post("/shgs/current/members/{member_id}/skills", status_code=status.HTTP_201_CREATED)
async def add_skill(
    member_id: str,
    body: AddSkillRequest,
    token: CurrentToken,
    db: SupabaseClient,
):
    """Leader adds a skill to a member."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    _verify_member_in_shg(member_id, shg_id, db)

    if not 1 <= body.proficiency <= 5:
        raise AshaAPIError(
            code="VALIDATION_ERROR",
            message="Proficiency must be between 1 and 5",
        )

    result = (
        db.table("member_skills")
        .upsert(
            {"shg_member_id": member_id, "skill": body.skill, "proficiency": body.proficiency},
            on_conflict="shg_member_id,skill",
        )
        .execute()
    )
    return success_response(result.data[0])


@router.delete(
    "/shgs/current/members/{member_id}/skills/{skill_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_skill(
    member_id: str, skill_id: str, token: CurrentToken, db: SupabaseClient
):
    """Leader removes a skill from a member."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    _verify_member_in_shg(member_id, shg_id, db)

    db.table("member_skills").delete().eq("id", skill_id).eq(
        "shg_member_id", member_id
    ).execute()


# ─────────────────────────────────────
# Availability endpoints
# ─────────────────────────────────────

@router.post(
    "/shgs/current/members/{member_id}/availability",
    status_code=status.HTTP_201_CREATED,
)
async def add_availability(
    member_id: str,
    body: AddAvailabilityRequest,
    token: CurrentToken,
    db: SupabaseClient,
):
    """Leader adds an availability window for a member."""
    _require_role(token, db, "leader")
    shg_id = _get_user_shg_id(token.sub, db)
    _verify_member_in_shg(member_id, shg_id, db)

    avail_data = {
        **body.model_dump(exclude_none=True),
        "shg_member_id": member_id,
    }
    result = db.table("member_availability").insert(avail_data).execute()

    # Update the member's current availability status
    db.table("shg_members").update(
        {"availability_status": body.status}
    ).eq("id", member_id).execute()

    return success_response(result.data[0])


# ─────────────────────────────────────
# Helpers
# ─────────────────────────────────────

def _get_user_shg_id(user_id: str, db) -> str:
    result = (
        db.table("shg_members")
        .select("shg_id")
        .eq("profile_id", user_id)
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )
    if not result.data:
        raise AshaAPIError(
            code="NOT_FOUND",
            message="You are not a member of any SHG",
            status_code=404,
        )
    return result.data[0]["shg_id"]


def _require_role(token, db, required_role: str) -> None:
    result = (
        db.table("profiles").select("role").eq("id", token.sub).single().execute()
    )
    if not result.data or result.data["role"] != required_role:
        raise AshaAPIError(
            code="FORBIDDEN",
            message=f"This action requires the '{required_role}' role",
            status_code=403,
        )


def _verify_member_in_shg(member_id: str, shg_id: str, db) -> None:
    result = (
        db.table("shg_members")
        .select("id")
        .eq("id", member_id)
        .eq("shg_id", shg_id)
        .is_("deleted_at", "null")
        .single()
        .execute()
    )
    if not result.data:
        raise AshaAPIError(
            code="NOT_FOUND",
            message="Member not found in your SHG",
            status_code=404,
        )
