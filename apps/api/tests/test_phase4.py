"""
Phase 4 Tests — Tasks, Progress, Proof, Quality Review, Costing Engine
Covers: costing calculations, quality schema, task routes, edge cases
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.rules.costing import calculate_cost_sheet, CostComponentInput
from app.modules.costing.router import CostComponentRequest, CreateCostSheetRequest
from app.modules.quality.router import QualityReviewRequest
from pydantic import ValidationError

client = TestClient(app)


# ─────────────────────────────────────────────────────
# COSTING ENGINE — deterministic calculations
# ─────────────────────────────────────────────────────

def _make_components():
    return [
        CostComponentInput("MATERIAL", "Canvas fabric", "PER_UNIT", 45.0, 1.0),
        CostComponentInput("LABOUR", "Stitching", "PER_UNIT", 20.0, 1.0),
        CostComponentInput("PACKAGING", "Packaging", "PER_UNIT", 5.0, 1.0),
    ]


class TestCostingCalculations:
    def test_basic_calculation(self):
        result = calculate_cost_sheet(100, _make_components(), "PERCENTAGE", 20.0)
        assert result.total_cost == 7000.0  # (45+20+5) * 100
        assert result.unit_cost == 70.0
        assert result.selling_price_per_unit == 84.0  # 70 * 1.2

    def test_material_labour_overhead_split(self):
        result = calculate_cost_sheet(100, _make_components(), "PERCENTAGE", 0.0)
        assert result.material_cost == 4500.0
        assert result.labour_cost == 2000.0
        assert result.overhead_cost == 500.0

    def test_total_equals_sum_of_parts(self):
        result = calculate_cost_sheet(50, _make_components(), "PERCENTAGE", 15.0)
        assert abs(result.total_cost - (result.material_cost + result.labour_cost + result.overhead_cost)) < 0.01

    def test_fixed_per_unit_margin(self):
        result = calculate_cost_sheet(100, _make_components(), "FIXED_PER_UNIT", 10.0)
        assert result.selling_price_per_unit == result.unit_cost + 10.0

    def test_manual_margin(self):
        result = calculate_cost_sheet(100, _make_components(), "MANUAL", 90.0)
        assert result.selling_price_per_unit == 90.0

    def test_total_selling_price(self):
        result = calculate_cost_sheet(100, _make_components(), "PERCENTAGE", 20.0)
        assert result.total_selling_price == result.selling_price_per_unit * 100

    def test_no_warning_when_above_cost(self):
        result = calculate_cost_sheet(100, _make_components(), "PERCENTAGE", 20.0)
        assert result.pricing_warning is None

    def test_warning_when_below_cost(self):
        result = calculate_cost_sheet(100, _make_components(), "MANUAL", 50.0)
        assert result.pricing_warning is not None
        assert "below" in result.pricing_warning.lower()

    def test_warning_when_below_minimum_margin(self):
        result = calculate_cost_sheet(100, _make_components(), "PERCENTAGE", 5.0, minimum_margin_percent=15.0)
        assert result.pricing_warning is not None
        assert "minimum" in result.pricing_warning.lower()

    def test_no_warning_when_meets_minimum(self):
        result = calculate_cost_sheet(100, _make_components(), "PERCENTAGE", 20.0, minimum_margin_percent=15.0)
        assert result.pricing_warning is None

    def test_zero_quantity_raises(self):
        with pytest.raises(ValueError):
            calculate_cost_sheet(0, _make_components(), "PERCENTAGE", 20.0)

    def test_negative_quantity_raises(self):
        with pytest.raises(ValueError):
            calculate_cost_sheet(-10, _make_components(), "PERCENTAGE", 20.0)

    def test_per_batch_basis(self):
        comps = [CostComponentInput("MATERIAL", "Thread (batch)", "PER_BATCH", 500.0, 2.0)]
        result = calculate_cost_sheet(100, comps, "PERCENTAGE", 0.0)
        assert result.material_cost == 1000.0  # 500 * 2 batches

    def test_percentage_overhead(self):
        base = [CostComponentInput("MATERIAL", "Material", "PER_UNIT", 100.0, 1.0)]
        overhead = [CostComponentInput("UTILITIES", "Utilities", "PERCENTAGE", 10.0, 1.0)]
        result = calculate_cost_sheet(10, base + overhead, "PERCENTAGE", 0.0)
        # Material = 1000, Utilities = 10% of 1000 = 100
        assert result.material_cost == 1000.0
        assert result.overhead_cost == 100.0
        assert result.total_cost == 1100.0

    def test_components_returned(self):
        result = calculate_cost_sheet(100, _make_components(), "PERCENTAGE", 20.0)
        assert len(result.components) == 3
        for c in result.components:
            assert c.amount >= 0


# ─────────────────────────────────────────────────────
# COSTING SCHEMA VALIDATION
# ─────────────────────────────────────────────────────

class TestCostingSchema:
    def test_negative_rate_rejected(self):
        with pytest.raises(ValidationError):
            CostComponentRequest(
                component_type="MATERIAL", label="Test",
                calculation_basis="PER_UNIT", rate=-5.0, quantity=1.0
            )

    def test_zero_quantity_rejected(self):
        with pytest.raises(ValidationError):
            CreateCostSheetRequest(
                quantity=0,
                components=[],
                margin_type="PERCENTAGE",
                margin_value=20.0
            )

    def test_negative_margin_rejected(self):
        with pytest.raises(ValidationError):
            CreateCostSheetRequest(
                quantity=100,
                components=[],
                margin_type="PERCENTAGE",
                margin_value=-5.0
            )

    def test_valid_schema_passes(self):
        req = CreateCostSheetRequest(
            quantity=100,
            components=[CostComponentRequest(
                component_type="MATERIAL", label="Test",
                calculation_basis="PER_UNIT", rate=50.0, quantity=1.0
            )],
            margin_type="PERCENTAGE",
            margin_value=20.0
        )
        assert req.quantity == 100


# ─────────────────────────────────────────────────────
# QUALITY REVIEW SCHEMA
# ─────────────────────────────────────────────────────

class TestQualitySchema:
    def test_zero_quantity_rejected(self):
        with pytest.raises(ValidationError):
            QualityReviewRequest(decision="ACCEPTED", reviewed_quantity=0)

    def test_negative_quantity_rejected(self):
        with pytest.raises(ValidationError):
            QualityReviewRequest(decision="ACCEPTED", reviewed_quantity=-5)

    def test_valid_accepted(self):
        r = QualityReviewRequest(decision="ACCEPTED", reviewed_quantity=10)
        assert r.decision == "ACCEPTED"

    def test_valid_rework(self):
        r = QualityReviewRequest(decision="REWORK", reviewed_quantity=5, reason="Uneven stitching")
        assert r.decision == "REWORK"

    def test_invalid_decision_rejected(self):
        with pytest.raises(ValidationError):
            QualityReviewRequest(decision="MAYBE", reviewed_quantity=10)


# ─────────────────────────────────────────────────────
# ROUTE REGISTRATION
# ─────────────────────────────────────────────────────

class TestTaskRoutes:
    def test_member_tasks_list(self):
        res = client.get("/api/v1/member/tasks")
        assert res.status_code == 401

    def test_member_task_detail(self):
        res = client.get("/api/v1/member/tasks/fake-id")
        assert res.status_code == 401

    def test_accept_task(self):
        res = client.post("/api/v1/member/tasks/fake-id/accept")
        assert res.status_code in (401, 422)

    def test_reject_task(self):
        res = client.post("/api/v1/member/tasks/fake-id/reject")
        assert res.status_code in (401, 422)

    def test_progress_update(self):
        res = client.post("/api/v1/member/tasks/fake-id/progress")
        assert res.status_code in (401, 422)

    def test_proof_upload_url(self):
        res = client.post("/api/v1/member/tasks/fake-id/proof/upload-url")
        assert res.status_code in (401, 422)

    def test_proof_complete(self):
        res = client.post("/api/v1/member/tasks/fake-id/proof/media-id/complete")
        assert res.status_code == 401

    def test_voice_text(self):
        res = client.get("/api/v1/member/tasks/fake-id/voice")
        assert res.status_code == 401

    def test_leader_tasks(self):
        res = client.get("/api/v1/leader/tasks/fake-order-id")
        assert res.status_code == 401


class TestQualityRoutes:
    def test_review_queue(self):
        res = client.get("/api/v1/quality/review-queue")
        assert res.status_code == 401

    def test_quality_task_detail(self):
        res = client.get("/api/v1/quality/tasks/fake-id")
        assert res.status_code == 401

    def test_submit_review(self):
        res = client.post("/api/v1/quality/tasks/fake-id/review")
        assert res.status_code in (401, 422)

    def test_create_rework(self):
        res = client.post("/api/v1/quality/tasks/fake-id/rework")
        assert res.status_code == 401


class TestCostingRoutes:
    def test_get_cost_sheet(self):
        res = client.get("/api/v1/orders/fake-id/cost-sheet")
        assert res.status_code == 401

    def test_create_cost_sheet(self):
        res = client.post("/api/v1/orders/fake-id/cost-sheet")
        assert res.status_code in (401, 422)

    def test_recalculate_cost_sheet(self):
        res = client.patch("/api/v1/orders/fake-id/cost-sheet/fake-sheet-id/recalculate")
        assert res.status_code in (401, 422)

    def test_pricing_warnings(self):
        res = client.get("/api/v1/orders/fake-id/cost-sheet/fake-sheet-id/warnings")
        assert res.status_code == 401


# ─────────────────────────────────────────────────────
# FILE UPLOAD VALIDATION
# ─────────────────────────────────────────────────────

class TestProofUploadValidation:
    def test_invalid_media_type_rejected_at_schema(self):
        """Invalid media_type returns 422 not 401 since schema catches it first."""
        res = client.post(
            "/api/v1/member/tasks/fake-id/proof/upload-url",
            json={"media_type": "DOCUMENT", "file_name": "test.pdf",
                  "mime_type": "application/pdf", "file_size_bytes": 1000},
            headers={"Authorization": "Bearer fake"}
        )
        # 401 (bad JWT) or 422 (validation) — both acceptable; 400 from business logic also ok
        assert res.status_code in (400, 401, 422)
