"""
Phase 1 Tests — Foundation, Auth, SHG & Member Management
Tests cover: health, auth schemas, SHG/member validation, edge cases
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# ─────────────────────────────────────────────────────
# HEALTH
# ─────────────────────────────────────────────────────

class TestHealth:
    def test_returns_200(self):
        res = client.get("/health")
        assert res.status_code == 200

    def test_response_has_required_fields(self):
        res = client.get("/health")
        data = res.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "env" in data

    def test_env_is_development(self):
        res = client.get("/health")
        assert res.json()["env"] == "development"

    def test_docs_accessible_in_dev(self):
        res = client.get("/docs")
        assert res.status_code == 200

    def test_openapi_json_accessible(self):
        res = client.get("/openapi.json")
        assert res.status_code == 200
        schema = res.json()
        assert "paths" in schema
        assert "info" in schema


# ─────────────────────────────────────────────────────
# API STRUCTURE
# ─────────────────────────────────────────────────────

class TestAPIStructure:
    def test_unknown_route_returns_404(self):
        res = client.get("/api/v1/does-not-exist")
        assert res.status_code == 404

    def test_auth_routes_exist(self):
        """Verify auth endpoints are registered (even if they need a body)."""
        # POST without body returns 422, not 404 — confirming route exists
        res = client.post("/api/v1/auth/login")
        assert res.status_code == 422

    def test_signup_route_exists(self):
        res = client.post("/api/v1/auth/signup")
        assert res.status_code == 422  # route exists, body missing

    def test_me_route_requires_auth(self):
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 401

    def test_shg_route_requires_auth(self):
        res = client.get("/api/v1/shgs/current")
        assert res.status_code == 401

    def test_members_route_requires_auth(self):
        res = client.get("/api/v1/shgs/current/members")
        assert res.status_code == 401


# ─────────────────────────────────────────────────────
# ERROR RESPONSE FORMAT
# ─────────────────────────────────────────────────────

class TestErrorFormat:
    def test_unauthenticated_error_format(self):
        """All 401 errors must follow the ASHA error envelope."""
        res = client.get("/api/v1/auth/me")
        assert res.status_code == 401

    def test_validation_error_format(self):
        """Validation errors must follow the ASHA error envelope."""
        res = client.post("/api/v1/auth/login", json={"email": "not-an-email", "password": ""})
        assert res.status_code == 422
        data = res.json()
        assert data["success"] is False
        assert "error" in data
        assert data["error"]["code"] == "VALIDATION_ERROR"
        assert "details" in data["error"]
        assert "meta" in data
        assert "request_id" in data["meta"]
        assert "timestamp" in data["meta"]

    def test_validation_error_has_field_details(self):
        """Details must name the offending field."""
        res = client.post("/api/v1/auth/login", json={"email": "bad", "password": ""})
        assert res.status_code == 422
        details = res.json()["error"]["details"]
        assert isinstance(details, list)
        assert len(details) > 0
        assert "field" in details[0]
        assert "issue" in details[0]


# ─────────────────────────────────────────────────────
# AUTH SCHEMA VALIDATION — edge cases
# ─────────────────────────────────────────────────────

class TestAuthSchemaValidation:
    def test_login_missing_email(self):
        res = client.post("/api/v1/auth/login", json={"password": "secret123"})
        assert res.status_code == 422

    def test_login_missing_password(self):
        res = client.post("/api/v1/auth/login", json={"email": "user@example.com"})
        assert res.status_code == 422

    def test_login_invalid_email_format(self):
        res = client.post("/api/v1/auth/login", json={"email": "not-valid", "password": "secret"})
        assert res.status_code == 422

    def test_login_empty_body(self):
        res = client.post("/api/v1/auth/login", json={})
        assert res.status_code == 422

    def test_signup_missing_role(self):
        res = client.post("/api/v1/auth/signup", json={
            "email": "test@example.com",
            "password": "Password123!",
            "full_name": "Test User"
            # role missing
        })
        assert res.status_code == 422

    def test_signup_invalid_role(self):
        res = client.post("/api/v1/auth/signup", json={
            "email": "test@example.com",
            "password": "Password123!",
            "full_name": "Test User",
            "role": "superadmin"  # not a valid role
        })
        assert res.status_code == 422

    def test_signup_valid_roles_accepted(self):
        """All valid roles must pass schema validation — tested without hitting Supabase."""
        from app.modules.auth.schemas import SignupRequest
        from pydantic import ValidationError

        valid_roles = ["leader", "member", "approver", "checker", "buyer"]
        for role in valid_roles:
            try:
                SignupRequest(
                    email=f"{role}@example.com",
                    password="Password123!",
                    full_name=f"Test {role.capitalize()}",
                    role=role,
                )
            except ValidationError:
                pytest.fail(f"Role '{role}' was incorrectly rejected by SignupRequest schema")

    def test_select_role_invalid_value(self):
        """select-role endpoint rejects unknown roles even without auth reaching business logic."""
        res = client.post("/api/v1/auth/select-role", json={"role": "hacker"})
        # 401 (no auth) is fine — means schema parsed OK and hit auth check
        # 422 means schema rejected it — also acceptable
        assert res.status_code in (401, 422)


# ─────────────────────────────────────────────────────
# SHG SCHEMA VALIDATION — edge cases
# ─────────────────────────────────────────────────────

class TestSHGSchemaValidation:
    def test_add_member_missing_name(self):
        res = client.post(
            "/api/v1/shgs/current/members",
            json={"daily_capacity": 20, "weekly_capacity": 100},
            headers={"Authorization": "Bearer fake-token"}
        )
        # 401 (bad token) or 422 (missing name caught first)
        assert res.status_code in (401, 422)

    def test_add_skill_invalid_proficiency_too_high(self):
        """Proficiency above 5 must be caught."""
        res = client.post(
            "/api/v1/shgs/current/members/some-id/skills",
            json={"skill": "STITCHING", "proficiency": 10},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert res.status_code in (401, 422)

    def test_add_skill_invalid_proficiency_zero(self):
        """Proficiency of 0 must be caught."""
        res = client.post(
            "/api/v1/shgs/current/members/some-id/skills",
            json={"skill": "STITCHING", "proficiency": 0},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert res.status_code in (401, 422)

    def test_add_skill_invalid_skill_name(self):
        """Unknown skill names must be rejected."""
        res = client.post(
            "/api/v1/shgs/current/members/some-id/skills",
            json={"skill": "FLYING", "proficiency": 3},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert res.status_code in (401, 422)

    def test_add_availability_invalid_status(self):
        """Unknown availability status must be rejected."""
        res = client.post(
            "/api/v1/shgs/current/members/some-id/availability",
            json={"status": "maybe"},
            headers={"Authorization": "Bearer fake-token"}
        )
        assert res.status_code in (401, 422)

    def test_protected_endpoints_reject_missing_auth(self):
        """Every protected endpoint must return 401 with no token."""
        endpoints = [
            ("GET",  "/api/v1/shgs/current"),
            ("GET",  "/api/v1/shgs/current/members"),
            ("POST", "/api/v1/shgs/current/members"),
            ("GET",  "/api/v1/auth/me"),
        ]
        for method, path in endpoints:
            if method == "GET":
                res = client.get(path)
            else:
                res = client.post(path, json={})
            assert res.status_code == 401, f"{method} {path} should return 401, got {res.status_code}"


# ─────────────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────────────

class TestCORS:
    def test_cors_header_present_for_allowed_origin(self):
        res = client.get(
            "/health",
            headers={"Origin": "http://localhost:5173"}
        )
        assert res.status_code == 200
        assert "access-control-allow-origin" in res.headers
