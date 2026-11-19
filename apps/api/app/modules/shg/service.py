import uuid
from typing import List, Dict, Any

_demo_members: List[Dict[str, Any]] = [
    {"id": "mem-01", "member_name": "Lakshmi Gowda", "phone_number": "+91 9876543201", "daily_capacity": 15, "weekly_capacity": 75, "availability_status": "available", "past_acceptance_rate": 96.5, "skills": [{"skill": "STITCHING", "proficiency": 5}, {"skill": "TAILORING", "proficiency": 4}]},
    {"id": "mem-02", "member_name": "Meena Devi", "phone_number": "+91 9876543202", "daily_capacity": 12, "weekly_capacity": 60, "availability_status": "available", "past_acceptance_rate": 92.0, "skills": [{"skill": "STITCHING", "proficiency": 4}, {"skill": "EMBROIDERY", "proficiency": 3}]},
    {"id": "mem-03", "member_name": "Radha Bai", "phone_number": "+91 9876543203", "daily_capacity": 20, "weekly_capacity": 100, "availability_status": "available", "past_acceptance_rate": 98.0, "skills": [{"skill": "PACKING", "proficiency": 5}, {"skill": "DELIVERY", "proficiency": 4}]},
    {"id": "mem-04", "member_name": "Saraswati Rao", "phone_number": "+91 9876543204", "daily_capacity": 10, "weekly_capacity": 50, "availability_status": "available", "past_acceptance_rate": 94.0, "skills": [{"skill": "CUTTING", "proficiency": 5}, {"skill": "TAILORING", "proficiency": 4}]},
    {"id": "mem-05", "member_name": "Devi Kumari", "phone_number": "+91 9876543205", "daily_capacity": 8, "weekly_capacity": 40, "availability_status": "available", "past_acceptance_rate": 90.0, "skills": [{"skill": "EMBROIDERY", "proficiency": 5}]},
    {"id": "mem-06", "member_name": "Anitha Murthy", "phone_number": "+91 9876543206", "daily_capacity": 25, "weekly_capacity": 125, "availability_status": "available", "past_acceptance_rate": 99.0, "skills": [{"skill": "QUALITY_CHECK", "proficiency": 5}]},
    {"id": "mem-07", "member_name": "Kavitha S", "phone_number": "+91 9876543207", "daily_capacity": 12, "weekly_capacity": 60, "availability_status": "available", "past_acceptance_rate": 91.0, "skills": [{"skill": "STITCHING", "proficiency": 4}]},
    {"id": "mem-08", "member_name": "Suma Shetty", "phone_number": "+91 9876543208", "daily_capacity": 15, "weekly_capacity": 75, "availability_status": "available", "past_acceptance_rate": 93.0, "skills": [{"skill": "CUTTING", "proficiency": 4}, {"skill": "STITCHING", "proficiency": 3}]},
    {"id": "mem-09", "member_name": "Geetha Rani", "phone_number": "+91 9876543209", "daily_capacity": 10, "weekly_capacity": 50, "availability_status": "partially_available", "past_acceptance_rate": 88.0, "skills": [{"skill": "STITCHING", "proficiency": 3}, {"skill": "PACKING", "proficiency": 4}]},
    {"id": "mem-10", "member_name": "Padma V", "phone_number": "+91 9876543210", "daily_capacity": 14, "weekly_capacity": 70, "availability_status": "available", "past_acceptance_rate": 95.0, "skills": [{"skill": "TAILORING", "proficiency": 5}]},
    {"id": "mem-11", "member_name": "Nirmala K", "phone_number": "+91 9876543211", "daily_capacity": 8, "weekly_capacity": 40, "availability_status": "available", "past_acceptance_rate": 89.0, "skills": [{"skill": "EMBROIDERY", "proficiency": 4}, {"skill": "STITCHING", "proficiency": 3}]},
    {"id": "mem-12", "member_name": "Bharathi N", "phone_number": "+91 9876543212", "daily_capacity": 20, "weekly_capacity": 100, "availability_status": "available", "past_acceptance_rate": 97.0, "skills": [{"skill": "PACKING", "proficiency": 5}, {"skill": "QUALITY_CHECK", "proficiency": 4}]}
]

def list_shg_members() -> List[Dict[str, Any]]:
    return _demo_members

def add_shg_member(data: Dict[str, Any]) -> Dict[str, Any]:
    new_mem = {
        "id": f"mem-{uuid.uuid4().hex[:6]}",
        "member_name": data["member_name"],
        "phone_number": data.get("phone_number"),
        "daily_capacity": data.get("daily_capacity", 10),
        "weekly_capacity": data.get("weekly_capacity", 50),
        "availability_status": data.get("availability_status", "available"),
        "past_acceptance_rate": 95.0,
        "skills": data.get("skills", [])
    }
    _demo_members.append(new_mem)
    return new_mem
