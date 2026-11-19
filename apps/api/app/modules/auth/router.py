from fastapi import APIRouter, Depends
from app.modules.auth.schemas import SignupRequest, LoginRequest, SelectRoleRequest, UpdateProfileRequest
from app.modules.auth.service import authenticate_user, register_user, _mock_users
from app.core.security import verify_token

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup")
def signup(req: SignupRequest):
    res = register_user(req)
    return {"success": True, "data": res}

@router.post("/login")
def login(req: LoginRequest):
    res = authenticate_user(req)
    return {"success": True, "data": res}

@router.post("/logout")
def logout(user=Depends(verify_token)):
    return {"success": True, "data": {"message": "Logged out successfully"}}

@router.get("/me")
def get_me(user=Depends(verify_token)):
    email = user.get("email", "leader@demo.asha")
    profile = _mock_users.get(email, {
        "id": user.get("sub", "dev-user-id"),
        "email": email,
        "full_name": "Lakshmi Gowda",
        "role": user.get("role", "leader"),
        "preferred_language": "en",
        "shg_id": "shg-001"
    })
    return {"success": True, "data": profile}

@router.patch("/me")
def update_profile(req: UpdateProfileRequest, user=Depends(verify_token)):
    email = user.get("email", "leader@demo.asha")
    profile = _mock_users.setdefault(email, {})
    if req.full_name: profile["full_name"] = req.full_name
    if req.phone_number: profile["phone_number"] = req.phone_number
    if req.preferred_language: profile["preferred_language"] = req.preferred_language
    return {"success": True, "data": profile}

@router.post("/select-role")
def select_role(req: SelectRoleRequest, user=Depends(verify_token)):
    email = user.get("email", "leader@demo.asha")
    if email in _mock_users:
        _mock_users[email]["role"] = req.role
    return {"success": True, "data": {"active_role": req.role}}
