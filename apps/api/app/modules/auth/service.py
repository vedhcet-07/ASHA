import uuid
from typing import Dict, Any
from app.modules.auth.schemas import SignupRequest, LoginRequest
from app.core.dependencies import get_supabase_client

# In-memory mock for dev / fallback
_mock_users: Dict[str, Dict[str, Any]] = {
    "leader@demo.asha": {
        "id": "11111111-1111-1111-1111-111111111111",
        "email": "leader@demo.asha",
        "full_name": "Lakshmi Gowda",
        "phone_number": "+91 9876543210",
        "role": "leader",
        "preferred_language": "en",
        "shg_id": "shg-001"
    },
    "member@demo.asha": {
        "id": "22222222-2222-2222-2222-222222222222",
        "email": "member@demo.asha",
        "full_name": "Meena Devi",
        "phone_number": "+91 9876543211",
        "role": "member",
        "preferred_language": "en",
        "shg_id": "shg-001"
    },
    "buyer@demo.asha": {
        "id": "33333333-3333-3333-3333-333333333333",
        "email": "buyer@demo.asha",
        "full_name": "Ramesh Patel",
        "phone_number": "+91 9876543212",
        "role": "buyer",
        "preferred_language": "en",
        "shg_id": None
    }
}

def authenticate_user(req: LoginRequest) -> Dict[str, Any]:
    supabase = get_supabase_client()
    if supabase:
        try:
            res = supabase.auth.sign_in_with_password({"email": req.email, "password": req.password})
            if res.user:
                return {
                    "access_token": res.session.access_token,
                    "user": {"id": res.user.id, "email": res.user.email}
                }
        except Exception:
            pass

    # Dev demo fallback
    user = _mock_users.get(req.email)
    if user:
        return {
            "access_token": f"mock-token-{user['role']}",
            "user": user
        }
    # Allow any login in demo
    new_user = {
        "id": str(uuid.uuid4()),
        "email": req.email,
        "full_name": req.email.split("@")[0].capitalize(),
        "role": "leader",
        "preferred_language": "en",
        "shg_id": "shg-001"
    }
    _mock_users[req.email] = new_user
    return {"access_token": f"mock-token-leader", "user": new_user}

def register_user(req: SignupRequest) -> Dict[str, Any]:
    uid = str(uuid.uuid4())
    user_data = {
        "id": uid,
        "email": req.email,
        "full_name": req.full_name,
        "phone_number": req.phone_number,
        "role": req.role,
        "preferred_language": req.preferred_language,
        "shg_id": "shg-001" if req.role != "buyer" else None
    }
    _mock_users[req.email] = user_data
    return {"access_token": f"mock-token-{req.role}", "user": user_data}
