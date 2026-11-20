"""
ASHA Demo Seeder
Seeds clean demo users via Supabase GoTrue Admin API and populates demo data.
"""

import os
import sys
from datetime import date, timedelta
from dotenv import load_dotenv
from supabase import create_client

load_dotenv(".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    sys.exit(1)

admin_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
anon_client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

DEMO_USERS = [
    {
        "email": "leader@asha.demo",
        "password": "AshaDemo123!",
        "full_name": "Lakshmi Devi",
        "phone_number": "+919876543210",
        "role": "leader",
        "preferred_language": "en"
    },
    {
        "email": "member@asha.demo",
        "password": "AshaDemo123!",
        "full_name": "Meena Kumari",
        "phone_number": "+919876543211",
        "role": "member",
        "preferred_language": "hi"
    },
    {
        "email": "approver@asha.demo",
        "password": "AshaDemo123!",
        "full_name": "Ananya Sharma",
        "phone_number": "+919876543212",
        "role": "approver",
        "preferred_language": "en"
    },
    {
        "email": "buyer@asha.demo",
        "password": "AshaDemo123!",
        "full_name": "Ramesh Kumar",
        "phone_number": "+919876543213",
        "role": "buyer",
        "preferred_language": "en"
    }
]

def clean_public_tables():
    print("--- 1. Cleaning public tables ---")
    tables = [
        "audit_events", "task_assignments", "tasks", "order_items", "orders",
        "buyers", "member_availability", "member_skills", "shg_members", "shgs", "profiles"
    ]
    for table in tables:
        try:
            admin_client.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            print(f"  ✓ Cleaned {table}")
        except Exception as e:
            print(f"  ! Skipped/Error on {table}: {e}")

def get_or_create_demo_auth_users():
    print("\n--- 2. Fetching or creating demo auth users via Supabase Admin SDK ---")
    created_users = {}
    for user_info in DEMO_USERS:
        email = user_info["email"]
        password = user_info["password"]
        try:
            # First try to create
            user_res = admin_client.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": user_info["full_name"]}
            })
            uid = user_res.id if hasattr(user_res, "id") else user_res.user.id
            created_users[email] = str(uid)
            print(f"  ✓ Created auth user {email} (UUID: {uid})")
        except Exception as e:
            # If user already exists in auth.users, fetch id
            try:
                login_res = anon_client.auth.sign_in_with_password({"email": email, "password": password})
                uid = login_res.user.id
                created_users[email] = str(uid)
                print(f"  ✓ Found existing auth user {email} (UUID: {uid})")
            except Exception as e2:
                print(f"  ✗ Failed for {email}: {e} / {e2}")
    return created_users

def seed_profiles_and_entities(users):
    print("\n--- 3. Creating profiles and SHG records ---")
    if "leader@asha.demo" not in users or "member@asha.demo" not in users:
        print("Error: Missing leader or member auth users. Aborting entity seed.")
        return

    # 3a. Insert profiles
    for user_info in DEMO_USERS:
        email = user_info["email"]
        if email not in users:
            continue
        uid = users[email]
        profile_data = {
            "id": uid,
            "full_name": user_info["full_name"],
            "phone_number": user_info["phone_number"],
            "role": user_info["role"],
            "preferred_language": user_info["preferred_language"]
        }
        admin_client.table("profiles").upsert(profile_data).execute()
        print(f"  ✓ Created profile for {user_info['full_name']} ({user_info['role']})")

    leader_id = users["leader@asha.demo"]
    member_id = users["member@asha.demo"]
    buyer_user_id = users.get("buyer@asha.demo")

    # 3b. Insert SHG
    shg_id = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
    shg_data = {
        "id": shg_id,
        "name": "Annapurna Mahila Bachat Gat",
        "district": "Pune",
        "state": "Maharashtra",
        "created_by": leader_id
    }
    admin_client.table("shgs").upsert(shg_data).execute()
    print(f"  ✓ Created SHG: {shg_data['name']}")

    # 3c. Insert core SHG Members
    leader_member_id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0001"
    artisan_member_id = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb0002"
    core_members = [
        {
            "id": leader_member_id,
            "shg_id": shg_id,
            "profile_id": leader_id,
            "member_name": "Lakshmi Devi",
            "phone_number": "+919876543210",
            "daily_capacity": 8,
            "weekly_capacity": 40,
            "availability_status": "available",
            "is_active": True
        },
        {
            "id": artisan_member_id,
            "shg_id": shg_id,
            "profile_id": member_id,
            "member_name": "Meena Kumari",
            "phone_number": "+919876543211",
            "daily_capacity": 6,
            "weekly_capacity": 30,
            "availability_status": "available",
            "is_active": True
        }
    ]
    admin_client.table("shg_members").upsert(core_members).execute()

    # 3d. Additional 10 members
    additional_members = [
        ("Sunita Patil", "+919876543214"),
        ("Kavita Shinde", "+919876543215"),
        ("Rekha More", "+919876543216"),
        ("Sangeeta Jadhav", "+919876543217"),
        ("Pooja Kadam", "+919876543218"),
        ("Anita Bhosle", "+919876543219"),
        ("Sarita Gaikwad", "+919876543220"),
        ("Vandana Pawar", "+919876543221"),
        ("Chhaya Kamble", "+919876543222"),
        ("Usha Thorat", "+919876543223")
    ]
    extra_records = []
    for idx, (m_name, m_phone) in enumerate(additional_members, start=3):
        extra_records.append({
            "id": f"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbb{idx:04d}",
            "shg_id": shg_id,
            "member_name": m_name,
            "phone_number": m_phone,
            "daily_capacity": 6,
            "weekly_capacity": 30,
            "availability_status": "available",
            "is_active": True
        })
    admin_client.table("shg_members").upsert(extra_records).execute()
    print("  ✓ Created 12 SHG members")

    # 3e. Skills for core artisan
    skills_data = [
        {"shg_member_id": artisan_member_id, "skill": "STITCHING", "proficiency": 5},
        {"shg_member_id": artisan_member_id, "skill": "CUTTING", "proficiency": 4}
    ]
    admin_client.table("member_skills").upsert(skills_data).execute()
    print("  ✓ Assigned skills to Meena Kumari")

    # 3f. Buyer
    buyer_id = "cccccccc-cccc-cccc-cccc-cccccccccccc"
    if buyer_user_id:
        buyer_data = {
            "id": buyer_id,
            "profile_id": buyer_user_id,
            "buyer_name": "Ramesh Kumar",
            "organization_name": "FabIndia Crafts Pvt Ltd",
            "phone_number": "+919876543213",
            "email": "buyer@asha.demo"
        }
        admin_client.table("buyers").upsert(buyer_data).execute()
        print("  ✓ Created buyer organization (FabIndia Crafts)")

    # 3g. Demo Order ORD-2026-001
    order_id = "dddddddd-dddd-dddd-dddd-dddddddddddd"
    order_due_date = (date.today() + timedelta(days=14)).isoformat()
    order_data = {
        "id": order_id,
        "shg_id": shg_id,
        "buyer_id": buyer_id,
        "order_number": "ORD-2026-001",
        "title": "Custom Printed Jute Bags (500 units)",
        "description": "Premium jute tote bags with reinforced handles for retail distribution.",
        "required_by_date": order_due_date,
        "delivery_address": "FabIndia Central Warehouse, Unit 4, Pune 411001",
        "status": "IN_PROGRESS",
        "created_by": leader_id
    }
    admin_client.table("orders").upsert(order_data).execute()
    print(f"  ✓ Created demo order: {order_data['order_number']}")

    # 3h. Order item
    order_item_id = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
    order_item_data = {
        "id": order_item_id,
        "order_id": order_id,
        "product_name": "Premium Printed Jute Tote Bag",
        "quantity": 500,
        "unit_type": "piece",
        "specifications": {"dimensions": "14x16 inches", "handle": "padded cotton rope", "print": "eco-friendly water-based"},
        "agreed_unit_price": 150.00
    }
    admin_client.table("order_items").upsert(order_item_data).execute()

    # 3i. Task
    task_id = "ffffffff-ffff-ffff-ffff-ffffffffffff"
    task_data = {
        "id": task_id,
        "order_id": order_id,
        "order_item_id": order_item_id,
        "task_name": "Stitch and Assemble 50 Jute Bags",
        "task_type": "PIECE_BASED",
        "required_skill": "STITCHING",
        "allocated_quantity": 50,
        "completed_quantity": 20,
        "accepted_quantity": 20,
        "due_date": (date.today() + timedelta(days=7)).isoformat(),
        "status": "IN_PROGRESS"
    }
    admin_client.table("tasks").upsert(task_data).execute()

    # 3j. Task assignment to Meena Kumari
    assignment_data = {
        "id": "11223344-5566-7788-99aa-bbccddeeff00",
        "task_id": task_id,
        "shg_member_id": artisan_member_id,
        "allocated_quantity": 50,
        "accepted_quantity": 20,
        "member_response": "ACCEPTED"
    }
    admin_client.table("task_assignments").upsert(assignment_data).execute()
    print("  ✓ Created task and assignment for Meena Kumari (20 completed / 50 allocated)")

def verify_logins():
    print("\n--- 4. Verifying logins for all 4 demo personas ---")
    all_ok = True
    for user_info in DEMO_USERS:
        email = user_info["email"]
        password = user_info["password"]
        role = user_info["role"]
        try:
            res = anon_client.auth.sign_in_with_password({"email": email, "password": password})
            print(f"  ✓ [{role.upper()}] {email} -> Login Successful! (User ID: {res.user.id})")
        except Exception as e:
            print(f"  ✗ [{role.upper()}] {email} -> Login Failed: {e}")
            all_ok = False
    return all_ok

if __name__ == "__main__":
    clean_public_tables()
    users = get_or_create_demo_auth_users()
    seed_profiles_and_entities(users)
    success = verify_logins()
    if success:
        print("\n=======================================================")
        print("🎉 DEMO SEEDING COMPLETED SUCCESSFULLY!")
        print("All personas ready to log in:")
        print("  - Leader:   leader@asha.demo   / AshaDemo123!")
        print("  - Member:   member@asha.demo   / AshaDemo123!")
        print("  - Approver: approver@asha.demo / AshaDemo123!")
        print("  - Buyer:    buyer@asha.demo    / AshaDemo123!")
        print("=======================================================")
    else:
        print("\nSome logins failed. Please check the logs above.")
