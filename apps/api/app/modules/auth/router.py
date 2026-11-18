"""Auth routes: signup, login, logout, me, select-role."""

from fastapi import APIRouter, HTTPException, status
from supabase import AuthApiError

from app.core.dependencies import SupabaseClient, SupabaseAnonClient, CurrentToken, success_response
from app.core.errors import AshaAPIError
from .schemas import (
    SignupRequest,
    LoginRequest,
    SelectRoleRequest,
    UpdateProfileRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, auth_db: SupabaseAnonClient, db: SupabaseClient):
    """
    Create a new user account and profile.
    auth_db uses the publishable key for Supabase Auth.
    db uses the service role key for inserting the profile record.
    """
    try:
        auth_response = auth_db.auth.sign_up(
            {"email": body.email, "password": body.password}
        )
    except AuthApiError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not auth_response.user:
        raise HTTPException(status_code=400, detail="Signup failed")

    user_id = auth_response.user.id

    # Insert profile using service-role client (bypasses RLS for initial insert)
    profile_data = {
        "id": user_id,
        "full_name": body.full_name,
        "phone_number": body.phone_number,
        "role": body.role,
        "preferred_language": body.preferred_language,
    }
    db.table("profiles").insert(profile_data).execute()

    return success_response(
        {
            "user_id": user_id,
            "email": body.email,
            "message": "Account created. Please check your email to confirm your account.",
        }
    )


@router.post("/login")
async def login(body: LoginRequest, auth_db: SupabaseAnonClient, db: SupabaseClient):
    """
    Login with email and password.
    auth_db uses the publishable key — required by Supabase for sign_in_with_password.
    db uses the service role key to fetch the profile.
    """
    try:
        auth_response = auth_db.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except AuthApiError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        ) from exc

    if not auth_response.session or not auth_response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Login failed"
        )

    user_id = auth_response.user.id
    access_token = auth_response.session.access_token

    # Fetch profile using service-role client
    profile_result = (
        db.table("profiles").select("*").eq("id", user_id).single().execute()
    )

    if not profile_result.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    return success_response(
        {
            "access_token": access_token,
            "token_type": "bearer",
            "profile": profile_result.data,
        }
    )


@router.post("/logout")
async def logout(token: CurrentToken, auth_db: SupabaseAnonClient):
    """End the current session."""
    try:
        auth_db.auth.sign_out()
    except Exception:
        pass  # Best effort
    return success_response({"message": "Logged out"})


@router.get("/me")
async def get_me(token: CurrentToken, db: SupabaseClient):
    """Get current user profile, role, and SHG membership."""
    profile_result = (
        db.table("profiles").select("*").eq("id", token.sub).single().execute()
    )

    if not profile_result.data:
        raise AshaAPIError(
            code="NOT_FOUND",
            message="Profile not found. Please complete your profile.",
            status_code=404,
        )

    profile = profile_result.data

    # Check SHG membership
    membership_result = (
        db.table("shg_members")
        .select("id, shg_id, shgs(id, name)")
        .eq("profile_id", token.sub)
        .is_("deleted_at", "null")
        .limit(1)
        .execute()
    )

    shg_info = None
    if membership_result.data:
        member = membership_result.data[0]
        shg_info = {
            "member_id": member["id"],
            "shg_id": member["shg_id"],
            "shg_name": member.get("shgs", {}).get("name") if member.get("shgs") else None,
        }

    return success_response(
        {
            "profile": profile,
            "shg": shg_info,
        }
    )


@router.patch("/me")
async def update_me(
    body: UpdateProfileRequest, token: CurrentToken, db: SupabaseClient
):
    """Update current user's profile."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise AshaAPIError(code="VALIDATION_ERROR", message="Nothing to update")

    result = (
        db.table("profiles")
        .update(updates)
        .eq("id", token.sub)
        .single()
        .execute()
    )

    return success_response(result.data)


@router.post("/select-role")
async def select_role(
    body: SelectRoleRequest, token: CurrentToken, db: SupabaseClient
):
    """Update the active role for a user."""
    result = (
        db.table("profiles")
        .update({"role": body.role})
        .eq("id", token.sub)
        .single()
        .execute()
    )

    return success_response({"role": body.role, "profile": result.data})
