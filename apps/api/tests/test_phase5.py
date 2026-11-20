"""
Phase 5 Tests — Payout Engine, Approval Flow, Reports, Notifications
Covers: payout calculations, edge cases, schema validation, route registration
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.rules.payout import (
    calculate_payout_sheet, calculate_line_payout,
    TaskPayoutInput, PayoutSheetResult,
)
from app.modules.payouts.schemas import (
    RequestChangesRequest, TaskRateInput,
    ApprovePayoutRequest, RejectPayoutRequest,
)
from pydantic import ValidationError

client = TestClient(app)


# ─────────────────────────────────────────────────────
# PAYOUT LINE CALCULATIONS
# ─────────────────────────────────────────────────────

def _task(accepted=10, rework=0, rejected=0, rate=20.0, basis="PER_PIECE", hours=0.0):
    return TaskPayoutInput(
        task_id="t1", member_id="m1", member_name="Lakshmi",
        allocated_quantity=20, completed_quantity=accepted + rework + rejected,
        accepted_quantity=accepted, rework_quantity=rework,
        rejected_quantity=rejected, payment_basis=basis, rate=rate, hours=hours,
    )


class TestPayoutLineCalculation:
    def test_per_piece_basic(self):
        line = calculate_line_payout(_task(accepted=10, rate=20.0))
        assert line.payable_amount == 200.0

    def test_only_accepted_is_paid(self):
        # 8 accepted, 5 rework, 2 rejected — only 8 paid
        line = calculate_line_payout(_task(accepted=8, rework=5, rejected=2, rate=20.0))
        assert line.payable_amount == 160.0

    def test_rework_not_paid(self):
        line = calculate_line_payout(_task(accepted=0, rework=10, rate=20.0))
        assert line.payable_amount == 0.0

    def test_rejected_not_paid(self):
        line = calculate_line_payout(_task(accepted=0, rejected=10, rate=20.0))
        assert line.payable_amount == 0.0

    def test_per_hour_basis(self):
        line = calculate_line_payout(_task(accepted=10, rate=100.0, basis="PER_HOUR", hours=5.0))
        assert line.payable_amount == 500.0  # 5 hours × ₹100

    def test_fixed_basis(self):
        line = calculate_line_payout(_task(accepted=10, rate=500.0, basis="FIXED"))
        assert line.payable_amount == 500.0

    def test_zero_rate_gives_zero_payout(self):
        line = calculate_line_payout(_task(accepted=10, rate=0.0))
        assert line.payable_amount == 0.0

    def test_explanation_included(self):
        line = calculate_line_payout(_task(accepted=10, rate=20.0))
        assert "10" in line.explanation
        assert "20" in line.explanation

    def test_rework_mentioned_in_explanation(self):
        line = calculate_line_payout(_task(accepted=8, rework=3, rate=20.0))
        assert "rework" in line.explanation.lower()

    def test_rounding_to_two_decimals(self):
        line = calculate_line_payout(_task(accepted=3, rate=33.333))
        # 3 × 33.333 = 99.999 → rounded to 100.0
        assert line.payable_amount == round(3 * 33.333, 2)


# ─────────────────────────────────────────────────────
# PAYOUT SHEET CALCULATIONS
# ─────────────────────────────────────────────────────

class TestPayoutSheetCalculation:
    def _make_tasks(self):
        return [
            TaskPayoutInput("t1", "m1", "Lakshmi", 25, 20, 18, 2, 0, "PER_PIECE", 20.0),
            TaskPayoutInput("t2", "m2", "Meena",   20, 15, 15, 0, 0, "PER_PIECE", 20.0),
            TaskPayoutInput("t3", "m3", "Radha",   30, 28, 25, 3, 0, "PER_PIECE", 20.0),
        ]

    def test_total_payable_sum(self):
        sheet = calculate_payout_sheet(self._make_tasks())
        expected = (18 + 15 + 25) * 20.0
        assert sheet.total_payable_amount == expected

    def test_total_accepted_quantity(self):
        sheet = calculate_payout_sheet(self._make_tasks())
        assert sheet.total_accepted_quantity == 18 + 15 + 25

    def test_line_count(self):
        sheet = calculate_payout_sheet(self._make_tasks())
        assert len(sheet.lines) == 3

    def test_zero_payout_generates_warning(self):
        tasks = [TaskPayoutInput("t1", "m1", "Lakshmi", 10, 10, 0, 10, 0, "PER_PIECE", 20.0)]
        sheet = calculate_payout_sheet(tasks)
        assert any("₹0" in w or "0" in w for w in sheet.warnings)

    def test_rework_pending_generates_warning(self):
        tasks = [TaskPayoutInput("t1", "m1", "Lakshmi", 10, 10, 8, 2, 0, "PER_PIECE", 20.0)]
        sheet = calculate_payout_sheet(tasks)
        assert any("rework" in w.lower() for w in sheet.warnings)

    def test_zero_rate_generates_warning(self):
        tasks = [TaskPayoutInput("t1", "m1", "Lakshmi", 10, 10, 10, 0, 0, "PER_PIECE", 0.0)]
        sheet = calculate_payout_sheet(tasks)
        assert any("rate" in w.lower() or "₹0" in w for w in sheet.warnings)

    def test_empty_tasks_gives_zero(self):
        sheet = calculate_payout_sheet([])
        assert sheet.total_payable_amount == 0.0
        assert sheet.total_accepted_quantity == 0

    def test_mixed_payment_bases(self):
        tasks = [
            TaskPayoutInput("t1", "m1", "A", 10, 10, 10, 0, 0, "PER_PIECE", 20.0),
            TaskPayoutInput("t2", "m2", "B", 5, 5, 0, 0, 0, "PER_HOUR", 100.0, hours=4.0),
        ]
        sheet = calculate_payout_sheet(tasks)
        assert sheet.total_payable_amount == 10 * 20.0 + 4.0 * 100.0


# ─────────────────────────────────────────────────────
# PAYOUT SCHEMA VALIDATION
# ─────────────────────────────────────────────────────

class TestPayoutSchemas:
    def test_request_changes_requires_note(self):
        with pytest.raises(ValidationError):
            RequestChangesRequest(payout_sheet_id="p1", note="")

    def test_request_changes_strips_whitespace_note(self):
        with pytest.raises(ValidationError):
            RequestChangesRequest(payout_sheet_id="p1", note="   ")

    def test_negative_rate_rejected(self):
        with pytest.raises(ValidationError):
            TaskRateInput(task_id="t1", rate=-5.0)

    def test_zero_rate_allowed(self):
        r = TaskRateInput(task_id="t1", rate=0.0)
        assert r.rate == 0.0

    def test_valid_payment_bases(self):
        for basis in ["PER_PIECE", "PER_HOUR", "FIXED"]:
            r = TaskRateInput(task_id="t1", rate=10.0, payment_basis=basis)
            assert r.payment_basis == basis


# ─────────────────────────────────────────────────────
# PAYOUT ROUTE REGISTRATION
# ─────────────────────────────────────────────────────

class TestPayoutRoutes:
    def test_calculate_payout(self):
        res = client.post("/api/v1/orders/fake-id/payout/calculate")
        assert res.status_code in (401, 422)

    def test_get_payout_sheet(self):
        res = client.get("/api/v1/orders/fake-id/payout")
        assert res.status_code == 401

    def test_member_payout_line(self):
        res = client.get("/api/v1/member/payouts/fake-sheet-id")
        assert res.status_code == 401

    def test_member_earnings(self):
        res = client.get("/api/v1/member/earnings")
        assert res.status_code == 401

    def test_submit_payout(self):
        res = client.post("/api/v1/orders/fake-id/payout/submit")
        assert res.status_code in (401, 422)

    def test_approve_payout(self):
        res = client.post("/api/v1/orders/fake-id/payout/approve")
        assert res.status_code in (401, 422)

    def test_reject_payout(self):
        res = client.post("/api/v1/orders/fake-id/payout/reject")
        assert res.status_code in (401, 422)

    def test_request_changes(self):
        res = client.post("/api/v1/orders/fake-id/payout/request-changes")
        assert res.status_code in (401, 422)

    def test_payout_explanation(self):
        res = client.get("/api/v1/orders/fake-id/payout/explanation")
        assert res.status_code == 401

    def test_reports_summary(self):
        res = client.get("/api/v1/reports/summary")
        assert res.status_code == 401

    def test_notifications(self):
        res = client.get("/api/v1/notifications")
        assert res.status_code == 401

    def test_mark_notification_read(self):
        res = client.post("/api/v1/notifications/fake-id/read")
        assert res.status_code == 401


# ─────────────────────────────────────────────────────
# APPROVAL FLOW BUSINESS RULES
# ─────────────────────────────────────────────────────

class TestApprovalBusinessRules:
    def test_approval_requires_explicit_action(self):
        """Verify approve endpoint exists and needs auth — no auto-approval."""
        res = client.post("/api/v1/orders/fake-id/payout/approve", json={})
        assert res.status_code in (401, 422)

    def test_cannot_approve_without_auth(self):
        res = client.post("/api/v1/orders/fake-id/payout/approve",
            json={"payout_sheet_id": "ps1"})
        assert res.status_code == 401

    def test_cannot_submit_without_auth(self):
        res = client.post("/api/v1/orders/fake-id/payout/submit",
            json={"payout_sheet_id": "ps1"})
        assert res.status_code == 401

    def test_payout_privacy_member_route_requires_auth(self):
        """Member payout line must require auth — never exposed without login."""
        res = client.get("/api/v1/member/payouts/fake-sheet")
        assert res.status_code == 401

    def test_exact_18_accepted_pieces_at_20_inr(self):
        """Phase 1 check: 18 accepted pieces × ₹20 = ₹360 exactly."""
        line = calculate_line_payout(_task(accepted=18, rework=2, rejected=0, rate=20.0))
        assert line.payable_amount == 360.0
        assert "18 accepted units × ₹20.00 = ₹360.00" in line.explanation

    def test_recalculation_does_not_double_earnings(self):
        """Running calculation multiple times on same input is idempotent and deterministic."""
        tasks = [
            TaskPayoutInput("t1", "m1", "Lakshmi", 20, 18, 18, 0, 0, "PER_PIECE", 20.0),
        ]
        res1 = calculate_payout_sheet(tasks)
        res2 = calculate_payout_sheet(tasks)
        assert res1.total_payable_amount == 360.0
        assert res2.total_payable_amount == 360.0
        assert res1.total_payable_amount == res2.total_payable_amount

    def test_payout_sheet_route_requires_auth(self):
        """Leader/approver payout sheet route requires auth."""
        res = client.get("/api/v1/orders/fake-id/payout")
        assert res.status_code == 401
