"""SHG module — self-help group CRUD endpoints.

All endpoints require authentication via ``get_current_user``. Create and
update operations are restricted to the ``leader`` role via
``require_role("leader")``.

Routes are registered under the shared ``/api/v1`` prefix added in
``main.py``. The literal ``/shgs/me`` route is declared *before* the dynamic
``/shgs/{shg_id}`` route so FastAPI matches the static path first.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request, status
from supabase import Client

from app.core.dependencies import get_current_user, get_db, require_role
from app.core.schemas import SuccessResponse, success_response
from app.core.security import CurrentUser
from app.modules.shg.schemas import (
    DeleteResult,
    MemberAvailabilityCreate,
    MemberAvailabilityResponse,
    MemberCreate,
    MemberResponse,
    MemberSkillCreate,
    MemberSkillResponse,
    MemberUpdate,
    SHGCreate,
    SHGResponse,
    SHGUpdate,
)
from app.modules.shg.service import (
    add_member_availability,
    add_member_skill,
    create_member,
    create_shg,
    delete_member,
    delete_member_availability,
    delete_member_skill,
    get_member,
    get_my_shg,
    get_shg,
    list_member_availability,
    list_member_skills,
    list_members,
    update_member,
    update_shg,
)

router = APIRouter()


@router.post(
    "/shgs",
    response_model=SuccessResponse[SHGResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new SHG",
    description=(
        "Create a new self-help group. The authenticated Leader becomes the "
        "SHG's leader. Requires the ``leader`` role."
    ),
)
async def create_shg_endpoint(
    payload: SHGCreate,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(require_role("leader")),
) -> SuccessResponse[SHGResponse]:
    """Create an SHG — the caller becomes its leader."""
    data = create_shg(db, payload, user.user_id)
    return success_response(SHGResponse.model_validate(data), request)


@router.get(
    "/shgs/me",
    response_model=SuccessResponse[SHGResponse],
    summary="Get the current user's SHG",
    description=(
        "Resolve the SHG the authenticated user belongs to, either as its "
        "leader or as a member. Returns 404 if the user is not in any SHG."
    ),
)
async def get_my_shg_endpoint(
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SuccessResponse[SHGResponse]:
    """Return the SHG for the authenticated user based on their membership."""
    data = get_my_shg(db, user.user_id)
    return success_response(SHGResponse.model_validate(data), request)


@router.get(
    "/shgs/{shg_id}",
    response_model=SuccessResponse[SHGResponse],
    summary="Get SHG details",
)
async def get_shg_endpoint(
    shg_id: UUID,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SuccessResponse[SHGResponse]:
    """Fetch a single SHG by id."""
    data = get_shg(db, str(shg_id))
    return success_response(SHGResponse.model_validate(data), request)


@router.put(
    "/shgs/{shg_id}",
    response_model=SuccessResponse[SHGResponse],
    summary="Update SHG details",
    description=(
        "Update an existing SHG. Only the SHG's own leader may update it. "
        "Requires the ``leader`` role."
    ),
)
async def update_shg_endpoint(
    shg_id: UUID,
    payload: SHGUpdate,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(require_role("leader")),
) -> SuccessResponse[SHGResponse]:
    """Update SHG details — restricted to this SHG's leader."""
    data = update_shg(db, str(shg_id), payload, user.user_id)
    return success_response(SHGResponse.model_validate(data), request)


# ---------------------------------------------------------------------------
# Member CRUD — Requirements 2.2, 2.3, 2.9, 2.10
# ---------------------------------------------------------------------------


@router.post(
    "/shgs/{shg_id}/members",
    response_model=SuccessResponse[MemberResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add a member to an SHG",
    description=(
        "Add a new member to the given SHG. Requires the ``leader`` role and "
        "that the caller is this SHG's leader. Accepts a display name, a daily "
        "capacity greater than zero, and an optional profile_id linking the "
        "member to an auth user. Enforces a 15-member cap per SHG "
        "(Requirement 2.2)."
    ),
)
async def create_member_endpoint(
    shg_id: UUID,
    payload: MemberCreate,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(require_role("leader")),
) -> SuccessResponse[MemberResponse]:
    """Add a member — restricted to this SHG's leader."""
    data = create_member(db, str(shg_id), payload, user.user_id)
    return success_response(MemberResponse.model_validate(data), request)


@router.get(
    "/shgs/{shg_id}/members",
    response_model=SuccessResponse[list[MemberResponse]],
    summary="List members of an SHG",
    description=(
        "List all non-deleted members of the given SHG. Available to any "
        "authenticated member of the same SHG (Requirement 2.10)."
    ),
)
async def list_members_endpoint(
    shg_id: UUID,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SuccessResponse[list[MemberResponse]]:
    """List active members of an SHG."""
    data = list_members(db, str(shg_id), user.user_id)
    return success_response(
        [MemberResponse.model_validate(row) for row in data], request
    )


@router.get(
    "/shgs/{shg_id}/members/{member_id}",
    response_model=SuccessResponse[MemberResponse],
    summary="Get a single member",
    description=(
        "Fetch a single member of the given SHG by id. Available to any "
        "authenticated member of the same SHG (Requirement 2.10)."
    ),
)
async def get_member_endpoint(
    shg_id: UUID,
    member_id: UUID,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SuccessResponse[MemberResponse]:
    """Fetch one member of an SHG."""
    data = get_member(db, str(shg_id), str(member_id), user.user_id)
    return success_response(MemberResponse.model_validate(data), request)


@router.put(
    "/shgs/{shg_id}/members/{member_id}",
    response_model=SuccessResponse[MemberResponse],
    summary="Update a member",
    description=(
        "Update a member's display name and/or daily capacity. Requires the "
        "``leader`` role and that the caller is this SHG's leader."
    ),
)
async def update_member_endpoint(
    shg_id: UUID,
    member_id: UUID,
    payload: MemberUpdate,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(require_role("leader")),
) -> SuccessResponse[MemberResponse]:
    """Update a member — restricted to this SHG's leader."""
    data = update_member(db, str(shg_id), str(member_id), payload, user.user_id)
    return success_response(MemberResponse.model_validate(data), request)


@router.delete(
    "/shgs/{shg_id}/members/{member_id}",
    response_model=SuccessResponse[MemberResponse],
    summary="Soft-delete a member",
    description=(
        "Soft-delete a member by setting ``deleted_at``; historical data is "
        "retained (Requirement 2.9). Requires the ``leader`` role and that the "
        "caller is this SHG's leader."
    ),
)
async def delete_member_endpoint(
    shg_id: UUID,
    member_id: UUID,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(require_role("leader")),
) -> SuccessResponse[MemberResponse]:
    """Soft-delete a member — restricted to this SHG's leader."""
    data = delete_member(db, str(shg_id), str(member_id), user.user_id)
    return success_response(MemberResponse.model_validate(data), request)


# ---------------------------------------------------------------------------
# Member skills — Requirements 2.4, 2.5
# ---------------------------------------------------------------------------


@router.post(
    "/shgs/{shg_id}/members/{member_id}/skills",
    response_model=SuccessResponse[MemberSkillResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add a skill to a member",
    description=(
        "Assign a skill from the catalogue to an SHG member with a proficiency "
        "level (1–5). A member may hold each skill at most once. Requires the "
        "``leader`` role."
    ),
)
async def add_member_skill_endpoint(
    shg_id: UUID,
    member_id: UUID,
    payload: MemberSkillCreate,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(require_role("leader")),
) -> SuccessResponse[MemberSkillResponse]:
    """Add a skill to a member — restricted to this SHG's leader."""
    data = add_member_skill(db, str(shg_id), str(member_id), payload, user.user_id)
    return success_response(MemberSkillResponse.model_validate(data), request)


@router.get(
    "/shgs/{shg_id}/members/{member_id}/skills",
    response_model=SuccessResponse[list[MemberSkillResponse]],
    summary="List a member's skills",
    description="List all skills assigned to a member. Available to same-SHG users.",
)
async def list_member_skills_endpoint(
    shg_id: UUID,
    member_id: UUID,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SuccessResponse[list[MemberSkillResponse]]:
    """List a member's skills — available to any same-SHG user."""
    data = list_member_skills(db, str(shg_id), str(member_id), user.user_id)
    return success_response(
        [MemberSkillResponse.model_validate(row) for row in data], request
    )


@router.delete(
    "/shgs/{shg_id}/members/{member_id}/skills/{skill_id}",
    response_model=SuccessResponse[DeleteResult],
    summary="Remove a skill from a member",
    description="Delete a member skill entry. Requires the ``leader`` role.",
)
async def delete_member_skill_endpoint(
    shg_id: UUID,
    member_id: UUID,
    skill_id: UUID,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(require_role("leader")),
) -> SuccessResponse[DeleteResult]:
    """Remove a skill from a member — restricted to this SHG's leader."""
    delete_member_skill(db, str(shg_id), str(member_id), str(skill_id), user.user_id)
    return success_response(DeleteResult(deleted=True, id=skill_id), request)


# ---------------------------------------------------------------------------
# Member availability — Requirements 2.6, 2.7
# ---------------------------------------------------------------------------


@router.post(
    "/shgs/{shg_id}/members/{member_id}/availability",
    response_model=SuccessResponse[MemberAvailabilityResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Add an availability window to a member",
    description=(
        "Record a date-ranged availability window for a member with a status "
        "and optional note. Requires the ``leader`` role."
    ),
)
async def add_member_availability_endpoint(
    shg_id: UUID,
    member_id: UUID,
    payload: MemberAvailabilityCreate,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(require_role("leader")),
) -> SuccessResponse[MemberAvailabilityResponse]:
    """Add an availability window — restricted to this SHG's leader."""
    data = add_member_availability(
        db, str(shg_id), str(member_id), payload, user.user_id
    )
    return success_response(MemberAvailabilityResponse.model_validate(data), request)


@router.get(
    "/shgs/{shg_id}/members/{member_id}/availability",
    response_model=SuccessResponse[list[MemberAvailabilityResponse]],
    summary="List a member's availability windows",
    description=(
        "List all availability windows for a member. Available to same-SHG users."
    ),
)
async def list_member_availability_endpoint(
    shg_id: UUID,
    member_id: UUID,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SuccessResponse[list[MemberAvailabilityResponse]]:
    """List a member's availability windows — available to any same-SHG user."""
    data = list_member_availability(db, str(shg_id), str(member_id), user.user_id)
    return success_response(
        [MemberAvailabilityResponse.model_validate(row) for row in data], request
    )


@router.delete(
    "/shgs/{shg_id}/members/{member_id}/availability/{availability_id}",
    response_model=SuccessResponse[DeleteResult],
    summary="Remove an availability window from a member",
    description="Delete a member availability window. Requires the ``leader`` role.",
)
async def delete_member_availability_endpoint(
    shg_id: UUID,
    member_id: UUID,
    availability_id: UUID,
    request: Request,
    db: Client = Depends(get_db),
    user: CurrentUser = Depends(require_role("leader")),
) -> SuccessResponse[DeleteResult]:
    """Remove an availability window — restricted to this SHG's leader."""
    delete_member_availability(
        db, str(shg_id), str(member_id), str(availability_id), user.user_id
    )
    return success_response(DeleteResult(deleted=True, id=availability_id), request)
