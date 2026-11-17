"""
Phase 3 Tests — AI Planning & Fair Allocation Engine
Covers: allocation scoring, edge cases, schema validation, route registration
All allocation tests are deterministic — no AI calls needed.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.rules.allocation import (
    propose_allocation, score_member, MemberProfile,
    WEIGHTS, AVAILABILITY_SCORES,
)
from app.modules.planning.schemas import (
    ProposeAllocationRequest, AdjustAllocationRequest, ConfirmAllocationRequest,
)
from pydantic import ValidationError

client = TestClient(app)


# ─────────────────────────────────────────────────────
# ALLOCATION WEIGHTS
# ─────────────────────────────────────────────────────

class TestAllocationWeights:
    def test_weights_sum_to_one(self):
        total = sum(WEIGHTS.values())
        assert abs(total - 1.0) < 1e-9

    def test_skill_is_largest_weight(self):
        assert WEIGHTS["skill"] == max(WEIGHTS.values())

    def test_all_weight_keys_present(self):
        for key in ["skill", "capacity", "availability", "workload", "quality"]:
            assert key in WEIGHTS

    def test_availability_scores_valid(self):
        assert AVAILABILITY_SCORES["available"] == 1.0
        assert AVAILABILITY_SCORES["unavailable"] == 0.0
        assert 0 < AVAILABILITY_SCORES["partially_available"] < 1.0


# ─────────────────────────────────────────────────────
# MEMBER SCORING
# ─────────────────────────────────────────────────────

def _make_member(**overrides) -> MemberProfile:
    defaults = dict(
        id="mem-1", name="Lakshmi",
        skills=[{"skill": "STITCHING", "proficiency": 5}],
        daily_capacity=25, weekly_capacity=125,
        availability_status="available",
        current_workload=0,
        past_acceptance_rate=95.0,
        past_rework_rate=2.0,
        past_on_time_rate=92.0,
    )
    defaults.update(overrides)
    return MemberProfile(**defaults)


class TestMemberScoring:
    def test_score_in_zero_to_one_range(self):
        m = _make_member()
        score, _ = score_member(m, "STITCHING", 20)
        assert 0.0 <= score <= 1.0

    def test_matching_skill_scores_higher_than_no_skill(self):
        m = _make_member()
        score_with, _ = score_member(m, "STITCHING", 20)
        score_without, _ = score_member(m, "CUTTING", 20)
        assert score_with > score_without

    def test_unavailable_member_scores_lower(self):
        available = _make_member(availability_status="available")
        unavailable = _make_member(availability_status="unavailable")
        s_av, _ = score_member(available, "STITCHING", 20)
        s_un, _ = score_member(unavailable, "STITCHING", 20)
        assert s_av > s_un

    def test_high_workload_lowers_score(self):
        low = _make_member(current_workload=0)
        high = _make_member(current_workload=120)
        s_low, _ = score_member(low, "STITCHING", 20)
        s_high, _ = score_member(high, "STITCHING", 20)
        assert s_low > s_high

    def test_better_quality_history_scores_higher(self):
        good = _make_member(past_acceptance_rate=98.0, past_rework_rate=0.5, past_on_time_rate=97.0)
        poor = _make_member(past_acceptance_rate=60.0, past_rework_rate=25.0, past_on_time_rate=55.0)
        s_good, _ = score_member(good, None, 20)
        s_poor, _ = score_member(poor, None, 20)
        assert s_good > s_poor

    def test_components_returned(self):
        m = _make_member()
        _, components = score_member(m, "STITCHING", 20)
        for key in ["skill", "capacity", "availability", "workload", "quality"]:
            assert key in components
            assert 0.0 <= components[key] <= 1.0


# ─────────────────────────────────────────────────────
# ALLOCATION PROPOSAL
# ─────────────────────────────────────────────────────

class TestAllocationProposal:
    def _make_members(self, n=5) -> list[MemberProfile]:
        names = ["Lakshmi", "Meena", "Radha", "Saraswati", "Devi"]
        skills = ["STITCHING", "STITCHING", "PACKING", "TAILORING", "EMBROIDERY"]
        return [
            _make_member(id=f"mem-{i}", name=names[i],
                skills=[{"skill": skills[i], "proficiency": 4}])
            for i in range(n)
        ]

    def test_total_allocated_equals_requested(self):
        members = self._make_members(5)
        proposal = propose_allocation(members, 100, "STITCHING")
        total = sum(a.allocated_quantity for a in proposal.allocations)
        assert total == 100

    def test_no_members_returns_unallocated(self):
        proposal = propose_allocation([], 100)
        assert proposal.unallocated == 100
        assert len(proposal.allocations) == 0

    def test_skilled_members_get_more_work(self):
        skilled = _make_member(id="s", name="Skilled",
            skills=[{"skill": "STITCHING", "proficiency": 5}])
        unskilled = _make_member(id="u", name="Unskilled",
            skills=[{"skill": "PACKING", "proficiency": 3}])
        proposal = propose_allocation([skilled, unskilled], 100, "STITCHING")
        s_alloc = next(a for a in proposal.allocations if a.member_id == "s")
        u_alloc = next(a for a in proposal.allocations if a.member_id == "u")
        assert s_alloc.allocated_quantity >= u_alloc.allocated_quantity

    def test_unavailable_members_excluded(self):
        available = _make_member(id="a", name="Available", availability_status="available")
        unavailable = _make_member(id="u", name="Unavailable", availability_status="unavailable")
        proposal = propose_allocation([available, unavailable], 50)
        member_ids = [a.member_id for a in proposal.allocations]
        assert "u" not in member_ids

    def test_all_unavailable_falls_back(self):
        all_unavailable = [
            _make_member(id=f"m{i}", name=f"M{i}", availability_status="unavailable")
            for i in range(3)
        ]
        proposal = propose_allocation(all_unavailable, 30)
        # Should fall back and still allocate
        assert len(proposal.warnings) > 0

    def test_allocations_sorted_by_score_descending(self):
        members = self._make_members(5)
        proposal = propose_allocation(members, 100, "STITCHING")
        scores = [a.score for a in proposal.allocations]
        assert scores == sorted(scores, reverse=True)

    def test_no_negative_allocations(self):
        members = self._make_members(5)
        proposal = propose_allocation(members, 100)
        for a in proposal.allocations:
            assert a.allocated_quantity >= 0

    def test_capacity_constraint_respected(self):
        # Member with daily_capacity=5 should not get more than 35 units (7 days)
        limited = _make_member(id="limited", name="Limited",
            daily_capacity=5, weekly_capacity=25,
            skills=[{"skill": "STITCHING", "proficiency": 5}])
        proposal = propose_allocation([limited], 100, "STITCHING")
        alloc = proposal.allocations[0]
        assert alloc.allocated_quantity <= 35

    def test_single_member_gets_all(self):
        member = _make_member(daily_capacity=200, weekly_capacity=1000)
        proposal = propose_allocation([member], 50)
        assert proposal.allocations[0].allocated_quantity == 50

    def test_reasons_populated(self):
        members = self._make_members(3)
        proposal = propose_allocation(members, 60, "STITCHING")
        for alloc in proposal.allocations:
            assert len(alloc.reasons) > 0

    def test_missing_skill_generates_warning(self):
        members = [_make_member(skills=[{"skill": "PACKING", "proficiency": 3}])]
        proposal = propose_allocation(members, 10, "STITCHING")
        assert any("skill" in w.lower() or "STITCHING" in w for w in proposal.warnings)


# ─────────────────────────────────────────────────────
# PLANNING SCHEMA VALIDATION
# ─────────────────────────────────────────────────────

class TestPlanningSchemas:
    def test_adjust_requires_reason(self):
        with pytest.raises(ValidationError):
            AdjustAllocationRequest(
                task_id="t1", member_id="m1", new_quantity=10, reason=""
            )

    def test_propose_defaults_to_fair_balanced(self):
        req = ProposeAllocationRequest(task_id="t1")
        assert req.strategy == "FAIR_BALANCED"

    def test_confirm_requires_task_id(self):
        with pytest.raises(ValidationError):
            ConfirmAllocationRequest(allocations=[])


# ─────────────────────────────────────────────────────
# ROUTE REGISTRATION
# ─────────────────────────────────────────────────────

class TestPlanningRoutes:
    def test_generate_plan_route_exists(self):
        res = client.post("/api/v1/orders/fake-id/plan/generate")
        assert res.status_code == 401

    def test_get_draft_route_exists(self):
        res = client.get("/api/v1/orders/fake-id/plan/drafts/draft-id")
        assert res.status_code == 401

    def test_confirm_plan_route_exists(self):
        res = client.post("/api/v1/orders/fake-id/plan/confirm")
        assert res.status_code in (401, 422)

    def test_get_plan_route_exists(self):
        res = client.get("/api/v1/orders/fake-id/plan")
        assert res.status_code == 401

    def test_propose_allocation_route_exists(self):
        res = client.post("/api/v1/orders/fake-id/allocation/propose")
        assert res.status_code in (401, 422)

    def test_confirm_allocation_route_exists(self):
        res = client.post("/api/v1/orders/fake-id/allocation/confirm")
        assert res.status_code in (401, 422)

    def test_adjust_allocation_route_exists(self):
        res = client.patch("/api/v1/orders/fake-id/allocation/adjust")
        assert res.status_code in (401, 422)

    def test_explanation_route_exists(self):
        res = client.get("/api/v1/orders/fake-id/allocation/explanation")
        assert res.status_code == 401

    def test_create_tasks_from_plan_route_exists(self):
        res = client.post("/api/v1/orders/fake-id/tasks/create-from-plan")
        assert res.status_code == 401
