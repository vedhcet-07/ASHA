from fastapi import APIRouter, Depends
from app.core.security import verify_token, require_role
from app.modules.shg.schemas import SHGMemberCreate, SHGMemberUpdate, AddSkillRequest, SetAvailabilityRequest
from app.modules.shg.service import list_shg_members, add_shg_member, _demo_members
from app.core.errors import NotFoundError

router = APIRouter(prefix="/shgs/current", tags=["SHG"])

@router.get("")
def get_current_shg(user=Depends(verify_token)):
    return {
        "success": True,
        "data": {
            "id": "shg-001",
            "name": "Shakti Women's Self-Help Group",
            "district": "Bengaluru Urban",
            "state": "Karnataka",
            "default_currency": "INR",
            "minimum_margin_percent": 15.0,
            "total_members": len(_demo_members)
        }
    }

@router.get("/members")
def get_members(user=Depends(verify_token)):
    members = list_shg_members()
    return {"success": True, "data": members, "meta": {"count": len(members)}}

@router.post("/members")
def add_member(req: SHGMemberCreate, user=Depends(require_role("leader"))):
    new_mem = add_shg_member(req.model_dump())
    return {"success": True, "data": new_mem}

@router.get("/members/{member_id}")
def get_member(member_id: str, user=Depends(verify_token)):
    for m in _demo_members:
        if m["id"] == member_id:
            return {"success": True, "data": m}
    raise NotFoundError("Member not found")

@router.patch("/members/{member_id}")
def update_member(member_id: str, req: SHGMemberUpdate, user=Depends(require_role("leader"))):
    for m in _demo_members:
        if m["id"] == member_id:
            if req.member_name is not None: m["member_name"] = req.member_name
            if req.phone_number is not None: m["phone_number"] = req.phone_number
            if req.daily_capacity is not None: m["daily_capacity"] = req.daily_capacity
            if req.weekly_capacity is not None: m["weekly_capacity"] = req.weekly_capacity
            if req.availability_status is not None: m["availability_status"] = req.availability_status
            return {"success": True, "data": m}
    raise NotFoundError("Member not found")

@router.post("/members/{member_id}/skills")
def add_skill(member_id: str, req: AddSkillRequest, user=Depends(require_role("leader"))):
    for m in _demo_members:
        if m["id"] == member_id:
            m.setdefault("skills", []).append(req.model_dump())
            return {"success": True, "data": m}
    raise NotFoundError("Member not found")

@router.post("/members/{member_id}/availability")
def set_availability(member_id: str, req: SetAvailabilityRequest, user=Depends(require_role("leader"))):
    for m in _demo_members:
        if m["id"] == member_id:
            m["availability_status"] = req.status
            return {"success": True, "data": m}
    raise NotFoundError("Member not found")
