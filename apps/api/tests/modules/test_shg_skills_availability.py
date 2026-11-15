"""Unit tests for member skills and availability (SHG module).

Two layers:

1. **Schema tests** — pure validation of the Pydantic request/response models
   (skill enum, proficiency bounds, availability date ordering, response
   coercion from Supabase rows). No database and no doubles.

2. **Service tests** — the business logic of the service functions is
   exercised against an in-memory Supabase test double (``FakeSupabase``).
   The double genuinely stores, filters, orders, and deletes rows, so the
   tests validate real service behaviour: leader authorisation, same-SHG
   access, member-in-SHG verification, UNIQUE(shg_member_id, skill)
   enforcement, and not-found handling.

Validates: Requirements 2.4, 2.5, 2.6, 2.7, 2.10
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any

import pytest
from pydantic import ValidationError

from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.modules.shg.schemas import (
    DeleteResult,
    MemberAvailabilityCreate,
    MemberAvailabilityResponse,
    MemberSkillCreate,
    MemberSkillResponse,
)
from app.modules.shg.service import (
    add_member_availability,
    add_member_skill,
    delete_member_availability,
    delete_member_skill,
    list_member_availability,
    list_member_skills,
)


# ===========================================================================
# Schema tests
# ===========================================================================


# --- MemberSkillCreate ------------------------------------------------------


def test_member_skill_create_accepts_valid_input() -> None:
    """Requirement 2.4, 2.5: a catalogue skill with proficiency 1–5 is valid."""
    skill = MemberSkillCreate(skill="STITCHING", proficiency=3)
    assert skill.skill == "STITCHING"
    assert skill.proficiency == 3


def test_member_skill_create_rejects_unknown_skill() -> None:
    """Requirement 2.4: skills outside the catalogue enum are rejected."""
    with pytest.raises(ValidationError):
        MemberSkillCreate(skill="WEAVING", proficiency=3)  # type: ignore[arg-type]


@pytest.mark.parametrize("proficiency", [0, 6, -1, 100])
def test_member_skill_create_rejects_proficiency_out_of_bounds(proficiency: int) -> None:
    """Requirement 2.5: proficiency must be between 1 and 5 inclusive."""
    with pytest.raises(ValidationError):
        MemberSkillCreate(skill="CUTTING", proficiency=proficiency)


@pytest.mark.parametrize("proficiency", [1, 5])
def test_member_skill_create_accepts_boundary_proficiency(proficiency: int) -> None:
    """The boundaries 1 and 5 are valid."""
    skill = MemberSkillCreate(skill="CUTTING", proficiency=proficiency)
    assert skill.proficiency == proficiency


def test_member_skill_create_requires_both_fields() -> None:
    with pytest.raises(ValidationError):
        MemberSkillCreate(skill="CUTTING")  # type: ignore[call-arg]
    with pytest.raises(ValidationError):
        MemberSkillCreate(proficiency=3)  # type: ignore[call-arg]


# --- MemberAvailabilityCreate -----------------------------------------------


def test_member_availability_create_accepts_valid_input() -> None:
    """Requirement 2.7: start date, end date, status, and optional note."""
    window = MemberAvailabilityCreate(
        available_from=date(2026, 1, 1),
        available_to=date(2026, 1, 31),
        status="partially_available",
        note="Travelling mid-month",
    )
    assert window.available_from == date(2026, 1, 1)
    assert window.status == "partially_available"
    assert window.note == "Travelling mid-month"


def test_member_availability_create_note_is_optional() -> None:
    window = MemberAvailabilityCreate(
        available_from=date(2026, 1, 1),
        available_to=date(2026, 1, 31),
        status="available",
    )
    assert window.note is None


def test_member_availability_create_rejects_end_before_start() -> None:
    """The end date must not precede the start date (mirrors the DB CHECK)."""
    with pytest.raises(ValidationError):
        MemberAvailabilityCreate(
            available_from=date(2026, 2, 1),
            available_to=date(2026, 1, 1),
            status="available",
        )


def test_member_availability_create_accepts_equal_dates() -> None:
    """A single-day window (equal start/end) is allowed by ``>=``."""
    window = MemberAvailabilityCreate(
        available_from=date(2026, 1, 1),
        available_to=date(2026, 1, 1),
        status="unavailable",
    )
    assert window.available_from == window.available_to


def test_member_availability_create_rejects_unknown_status() -> None:
    """Requirement 2.6: status must be one of the availability_status enum."""
    with pytest.raises(ValidationError):
        MemberAvailabilityCreate(
            available_from=date(2026, 1, 1),
            available_to=date(2026, 1, 2),
            status="busy",  # type: ignore[arg-type]
        )


def test_member_availability_create_requires_dates_and_status() -> None:
    with pytest.raises(ValidationError):
        MemberAvailabilityCreate(  # type: ignore[call-arg]
            available_to=date(2026, 1, 2),
            status="available",
        )
    with pytest.raises(ValidationError):
        MemberAvailabilityCreate(  # type: ignore[call-arg]
            available_from=date(2026, 1, 1),
            status="available",
        )
    with pytest.raises(ValidationError):
        MemberAvailabilityCreate(  # type: ignore[call-arg]
            available_from=date(2026, 1, 1),
            available_to=date(2026, 1, 2),
        )


# --- Response models --------------------------------------------------------


def _skill_row() -> dict[str, Any]:
    """A ``member_skills`` row as PostgREST returns it (strings)."""
    return {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "shg_member_id": "660e8400-e29b-41d4-a716-446655440000",
        "skill": "EMBROIDERY",
        "proficiency": 4,
        "created_at": "2026-01-15T10:30:00.000000+00:00",
        "updated_at": "2026-01-15T10:30:00.000000+00:00",
    }


def test_member_skill_response_parses_supabase_row() -> None:
    from uuid import UUID

    response = MemberSkillResponse.model_validate(_skill_row())
    assert response.id == UUID("550e8400-e29b-41d4-a716-446655440000")
    assert response.shg_member_id == UUID("660e8400-e29b-41d4-a716-446655440000")
    assert response.skill == "EMBROIDERY"
    assert response.proficiency == 4
    assert isinstance(response.created_at, datetime)
    assert response.created_at.tzinfo is not None


def test_member_skill_response_ignores_extra_columns() -> None:
    row = _skill_row()
    row["unexpected_column"] = "ignored"
    response = MemberSkillResponse.model_validate(row)
    assert response.skill == "EMBROIDERY"


def _availability_row() -> dict[str, Any]:
    """A ``member_availability`` row as PostgREST returns it (strings)."""
    return {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "shg_member_id": "660e8400-e29b-41d4-a716-446655440000",
        "available_from": "2026-01-01",
        "available_to": "2026-01-31",
        "status": "partially_available",
        "note": "Travelling mid-month",
        "created_at": "2026-01-15T10:30:00.000000+00:00",
        "updated_at": "2026-01-15T10:30:00.000000+00:00",
    }


def test_member_availability_response_parses_supabase_row() -> None:
    from uuid import UUID

    response = MemberAvailabilityResponse.model_validate(_availability_row())
    assert response.id == UUID("770e8400-e29b-41d4-a716-446655440000")
    assert response.shg_member_id == UUID("660e8400-e29b-41d4-a716-446655440000")
    assert response.available_from == date(2026, 1, 1)
    assert response.available_to == date(2026, 1, 31)
    assert response.status == "partially_available"
    assert response.note == "Travelling mid-month"
    assert isinstance(response.created_at, datetime)


def test_member_availability_response_allows_null_note() -> None:
    row = _availability_row()
    row["note"] = None
    response = MemberAvailabilityResponse.model_validate(row)
    assert response.note is None


def test_delete_result_defaults() -> None:
    from uuid import UUID

    result = DeleteResult(id=UUID("550e8400-e29b-41d4-a716-446655440000"))
    assert result.deleted is True


# ===========================================================================
# In-memory Supabase test double
# ===========================================================================


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class _Result:
    """Mimics the object returned by ``.execute()`` — exposes ``.data``."""

    def __init__(self, data: Any) -> None:
        self.data = data


class _SelectQuery:
    """Supports the PostgREST select/filter/order/single chain used by services."""

    def __init__(self, store: dict[str, list[dict[str, Any]]], table: str) -> None:
        self._store = store
        self._table = table
        self._eq_filters: list[tuple[str, str]] = []
        self._is_null: list[tuple[str, str]] = []
        self._order: tuple[str, bool] | None = None
        self._limit: int | None = None
        self._maybe_single = False

    def eq(self, column: str, value: Any) -> "_SelectQuery":
        self._eq_filters.append((column, str(value)))
        return self

    def is_(self, column: str, value: str) -> "_SelectQuery":
        self._is_null.append((column, value))
        return self

    def order(self, column: str, *, desc: bool = False) -> "_SelectQuery":
        self._order = (column, desc)
        return self

    def limit(self, count: int) -> "_SelectQuery":
        self._limit = count
        return self

    def maybe_single(self) -> "_SelectQuery":
        self._maybe_single = True
        return self

    def single(self) -> "_SelectQuery":
        self._maybe_single = True
        return self

    def _matches(self, row: dict[str, Any]) -> bool:
        for column, value in self._eq_filters:
            if str(row.get(column)) != value:
                return False
        for column, spec in self._is_null:
            cell = row.get(column)
            if spec == "null" and cell is not None:
                return False
            if spec == "not.null" and cell is None:
                return False
        return True

    def _filtered(self) -> list[dict[str, Any]]:
        rows = [r for r in self._store.get(self._table, []) if self._matches(r)]
        if self._order is not None:
            column, desc = self._order
            rows.sort(key=lambda r: str(r.get(column) or ""), reverse=desc)
        if self._limit is not None:
            rows = rows[: self._limit]
        return rows

    def execute(self) -> _Result:
        rows = self._filtered()
        if self._maybe_single:
            return _Result(rows[0] if rows else None)
        return _Result(rows)


class _InsertQuery:
    """Supports ``insert(row).select(...).execute()``."""

    def __init__(
        self, store: dict[str, list[dict[str, Any]]], table: str, row: dict[str, Any]
    ) -> None:
        self._store = store
        self._table = table
        self._row = dict(row)

    def select(self, _columns: str = "*") -> "_InsertQuery":
        return self

    def execute(self) -> _Result:
        row = dict(self._row)
        row.setdefault("id", str(uuid.uuid4()))
        row.setdefault("created_at", _now_iso())
        row.setdefault("updated_at", _now_iso())
        self._store.setdefault(self._table, []).append(row)
        return _Result([row])


class _DeleteQuery:
    """Supports ``delete().eq(...).execute()``."""

    def __init__(self, store: dict[str, list[dict[str, Any]]], table: str) -> None:
        self._store = store
        self._table = table
        self._eq_filters: list[tuple[str, str]] = []

    def eq(self, column: str, value: Any) -> "_DeleteQuery":
        self._eq_filters.append((column, str(value)))
        return self

    def execute(self) -> _Result:
        def matches(row: dict[str, Any]) -> bool:
            return all(str(row.get(c)) == v for c, v in self._eq_filters)

        remaining = [r for r in self._store.get(self._table, []) if not matches(r)]
        self._store[self._table] = remaining
        return _Result([])


class _TableProxy:
    """Returned by ``FakeSupabase.table(name)``."""

    def __init__(self, store: dict[str, list[dict[str, Any]]], table: str) -> None:
        self._store = store
        self._table = table

    def insert(self, row: dict[str, Any]) -> _InsertQuery:
        return _InsertQuery(self._store, self._table, row)

    def select(self, _columns: str = "*") -> _SelectQuery:
        return _SelectQuery(self._store, self._table)

    def delete(self) -> _DeleteQuery:
        return _DeleteQuery(self._store, self._table)


class FakeSupabase:
    """Minimal in-memory stand-in for the Supabase service-role client.

    Only the ``table(...).{insert,select,delete}().<chain>.execute()`` surface
    used by the SHG service is implemented. The store is a dict of table name to
    list of row dicts; filters and ordering are applied for real, so the tests
    exercise genuine service behaviour.
    """

    def __init__(self, store: dict[str, list[dict[str, Any]]] | None = None) -> None:
        self._store = store if store is not None else {}

    def table(self, name: str) -> _TableProxy:
        return _TableProxy(self._store, name)


# ===========================================================================
# Fixtures
# ===========================================================================

SHG_ID = "11111111-1111-1111-1111-111111111111"
LEADER_ID = "22222222-2222-2222-2222-222222222222"
MEMBER_ID = "33333333-3333-3333-3333-333333333333"
MEMBER_PROFILE_ID = "44444444-4444-4444-4444-444444444444"
OUTSIDER_ID = "55555555-5555-5555-5555-555555555555"


def _seed_store() -> dict[str, list[dict[str, Any]]]:
    """Seed an SHG with one active member and empty skills/availability."""
    return {
        "shgs": [
            {
                "id": SHG_ID,
                "name": "Bharat Mahila SHG",
                "registration_number": None,
                "address": None,
                "district": "Bengaluru",
                "state": "Karnataka",
                "leader_id": LEADER_ID,
                "minimum_margin_percent": 10.00,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
        ],
        "shg_members": [
            {
                "id": MEMBER_ID,
                "shg_id": SHG_ID,
                "profile_id": MEMBER_PROFILE_ID,
                "display_name": "Lakshmi",
                "daily_capacity": 10,
                "availability": "available",
                "joined_at": _now_iso(),
                "deleted_at": None,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
        ],
        "member_skills": [],
        "member_availability": [],
    }


def _db() -> FakeSupabase:
    return FakeSupabase(_seed_store())


# ===========================================================================
# Service tests — skills
# ===========================================================================


def test_add_member_skill_success() -> None:
    db = _db()
    payload = MemberSkillCreate(skill="STITCHING", proficiency=4)
    result = add_member_skill(db, SHG_ID, MEMBER_ID, payload, LEADER_ID)

    assert result["shg_member_id"] == MEMBER_ID
    assert result["skill"] == "STITCHING"
    assert result["proficiency"] == 4
    # The row was actually persisted in the in-memory store.
    assert len(db._store["member_skills"]) == 1
    assert db._store["member_skills"][0]["skill"] == "STITCHING"


def test_add_member_skill_forbidden_when_not_leader() -> None:
    db = _db()
    payload = MemberSkillCreate(skill="CUTTING", proficiency=2)
    with pytest.raises(ForbiddenError):
        add_member_skill(db, SHG_ID, MEMBER_ID, payload, OUTSIDER_ID)
    # No row should have been written.
    assert db._store["member_skills"] == []


def test_add_member_skill_member_not_in_shg() -> None:
    db = _db()
    payload = MemberSkillCreate(skill="CUTTING", proficiency=2)
    missing_member = "99999999-9999-9999-9999-999999999999"
    with pytest.raises(NotFoundError):
        add_member_skill(db, SHG_ID, missing_member, payload, LEADER_ID)
    assert db._store["member_skills"] == []


def test_add_member_skill_duplicate_conflict() -> None:
    """Requirement: UNIQUE(shg_member_id, skill) — adding the same skill twice."""
    db = _db()
    payload = MemberSkillCreate(skill="TAILORING", proficiency=3)
    add_member_skill(db, SHG_ID, MEMBER_ID, payload, LEADER_ID)

    second = MemberSkillCreate(skill="TAILORING", proficiency=5)
    with pytest.raises(ConflictError):
        add_member_skill(db, SHG_ID, MEMBER_ID, second, LEADER_ID)
    # Only one row persisted.
    assert len(db._store["member_skills"]) == 1


def test_add_member_skill_different_skills_allowed() -> None:
    """A member may hold multiple distinct skills."""
    db = _db()
    add_member_skill(db, SHG_ID, MEMBER_ID, MemberSkillCreate(skill="CUTTING", proficiency=2), LEADER_ID)
    add_member_skill(db, SHG_ID, MEMBER_ID, MemberSkillCreate(skill="STITCHING", proficiency=4), LEADER_ID)
    assert len(db._store["member_skills"]) == 2


def test_list_member_skills_returns_member_skills() -> None:
    db = _db()
    add_member_skill(db, SHG_ID, MEMBER_ID, MemberSkillCreate(skill="PACKING", proficiency=1), LEADER_ID)
    add_member_skill(db, SHG_ID, MEMBER_ID, MemberSkillCreate(skill="DELIVERY", proficiency=2), LEADER_ID)

    # The leader of the SHG may list.
    skills = list_member_skills(db, SHG_ID, MEMBER_ID, LEADER_ID)
    assert len(skills) == 2
    assert {s["skill"] for s in skills} == {"PACKING", "DELIVERY"}


def test_list_member_skills_same_shg_member_can_read() -> None:
    """Requirement 2.10: a same-SHG member may read another member's skills."""
    db = _db()
    add_member_skill(db, SHG_ID, MEMBER_ID, MemberSkillCreate(skill="PACKING", proficiency=1), LEADER_ID)

    # A user who is a member of this SHG (by profile_id) is granted access.
    skills = list_member_skills(db, SHG_ID, MEMBER_ID, MEMBER_PROFILE_ID)
    assert len(skills) == 1


def test_list_member_skills_forbidden_for_outsider() -> None:
    """Requirement 2.10: a user outside the SHG cannot read member skills."""
    db = _db()
    add_member_skill(db, SHG_ID, MEMBER_ID, MemberSkillCreate(skill="PACKING", proficiency=1), LEADER_ID)
    with pytest.raises(ForbiddenError):
        list_member_skills(db, SHG_ID, MEMBER_ID, OUTSIDER_ID)


def test_list_member_skills_member_not_in_shg() -> None:
    db = _db()
    missing_member = "99999999-9999-9999-9999-999999999999"
    with pytest.raises(NotFoundError):
        list_member_skills(db, SHG_ID, missing_member, LEADER_ID)


def test_delete_member_skill_success() -> None:
    db = _db()
    added = add_member_skill(db, SHG_ID, MEMBER_ID, MemberSkillCreate(skill="ACCOUNTING", proficiency=3), LEADER_ID)
    skill_id = added["id"]

    delete_member_skill(db, SHG_ID, MEMBER_ID, skill_id, LEADER_ID)
    assert db._store["member_skills"] == []


def test_delete_member_skill_not_found() -> None:
    db = _db()
    add_member_skill(db, SHG_ID, MEMBER_ID, MemberSkillCreate(skill="ACCOUNTING", proficiency=3), LEADER_ID)
    wrong_skill_id = "00000000-0000-0000-0000-000000000000"
    with pytest.raises(NotFoundError):
        delete_member_skill(db, SHG_ID, MEMBER_ID, wrong_skill_id, LEADER_ID)
    # The original skill is untouched.
    assert len(db._store["member_skills"]) == 1


def test_delete_member_skill_forbidden_when_not_leader() -> None:
    db = _db()
    added = add_member_skill(db, SHG_ID, MEMBER_ID, MemberSkillCreate(skill="ACCOUNTING", proficiency=3), LEADER_ID)
    with pytest.raises(ForbiddenError):
        delete_member_skill(db, SHG_ID, MEMBER_ID, added["id"], OUTSIDER_ID)
    assert len(db._store["member_skills"]) == 1


# ===========================================================================
# Service tests — availability
# ===========================================================================


def test_add_member_availability_success() -> None:
    db = _db()
    payload = MemberAvailabilityCreate(
        available_from=date(2026, 1, 1),
        available_to=date(2026, 1, 31),
        status="partially_available",
        note="Travelling mid-month",
    )
    result = add_member_availability(db, SHG_ID, MEMBER_ID, payload, LEADER_ID)

    assert result["shg_member_id"] == MEMBER_ID
    assert result["available_from"] == "2026-01-01"
    assert result["available_to"] == "2026-01-31"
    assert result["status"] == "partially_available"
    assert result["note"] == "Travelling mid-month"
    assert len(db._store["member_availability"]) == 1


def test_add_member_availability_without_note() -> None:
    db = _db()
    payload = MemberAvailabilityCreate(
        available_from=date(2026, 2, 1),
        available_to=date(2026, 2, 28),
        status="available",
    )
    result = add_member_availability(db, SHG_ID, MEMBER_ID, payload, LEADER_ID)
    assert result["note"] is None
    assert result["status"] == "available"


def test_add_member_availability_forbidden_when_not_leader() -> None:
    db = _db()
    payload = MemberAvailabilityCreate(
        available_from=date(2026, 1, 1),
        available_to=date(2026, 1, 31),
        status="unavailable",
    )
    with pytest.raises(ForbiddenError):
        add_member_availability(db, SHG_ID, MEMBER_ID, payload, OUTSIDER_ID)
    assert db._store["member_availability"] == []


def test_add_member_availability_member_not_in_shg() -> None:
    db = _db()
    payload = MemberAvailabilityCreate(
        available_from=date(2026, 1, 1),
        available_to=date(2026, 1, 31),
        status="available",
    )
    missing_member = "99999999-9999-9999-9999-999999999999"
    with pytest.raises(NotFoundError):
        add_member_availability(db, SHG_ID, missing_member, payload, LEADER_ID)


def test_list_member_availability_returns_windows_ordered() -> None:
    db = _db()
    add_member_availability(
        db,
        SHG_ID,
        MEMBER_ID,
        MemberAvailabilityCreate(date(2026, 3, 1), date(2026, 3, 10), "available"),
        LEADER_ID,
    )
    add_member_availability(
        db,
        SHG_ID,
        MEMBER_ID,
        MemberAvailabilityCreate(date(2026, 1, 1), date(2026, 1, 15), "unavailable"),
        LEADER_ID,
    )

    windows = list_member_availability(db, SHG_ID, MEMBER_ID, LEADER_ID)
    assert len(windows) == 2
    # Ordered by available_from ascending.
    assert windows[0]["available_from"] == "2026-01-01"
    assert windows[1]["available_from"] == "2026-03-01"


def test_list_member_availability_forbidden_for_outsider() -> None:
    db = _db()
    add_member_availability(
        db,
        SHG_ID,
        MEMBER_ID,
        MemberAvailabilityCreate(date(2026, 1, 1), date(2026, 1, 15), "available"),
        LEADER_ID,
    )
    with pytest.raises(ForbiddenError):
        list_member_availability(db, SHG_ID, MEMBER_ID, OUTSIDER_ID)


def test_delete_member_availability_success() -> None:
    db = _db()
    added = add_member_availability(
        db,
        SHG_ID,
        MEMBER_ID,
        MemberAvailabilityCreate(date(2026, 1, 1), date(2026, 1, 15), "available"),
        LEADER_ID,
    )
    availability_id = added["id"]

    delete_member_availability(db, SHG_ID, MEMBER_ID, availability_id, LEADER_ID)
    assert db._store["member_availability"] == []


def test_delete_member_availability_not_found() -> None:
    db = _db()
    add_member_availability(
        db,
        SHG_ID,
        MEMBER_ID,
        MemberAvailabilityCreate(date(2026, 1, 1), date(2026, 1, 15), "available"),
        LEADER_ID,
    )
    wrong_id = "00000000-0000-0000-0000-000000000000"
    with pytest.raises(NotFoundError):
        delete_member_availability(db, SHG_ID, MEMBER_ID, wrong_id, LEADER_ID)
    assert len(db._store["member_availability"]) == 1


def test_delete_member_availability_forbidden_when_not_leader() -> None:
    db = _db()
    added = add_member_availability(
        db,
        SHG_ID,
        MEMBER_ID,
        MemberAvailabilityCreate(date(2026, 1, 1), date(2026, 1, 15), "available"),
        LEADER_ID,
    )
    with pytest.raises(ForbiddenError):
        delete_member_availability(db, SHG_ID, MEMBER_ID, added["id"], OUTSIDER_ID)


# ===========================================================================
# Non-existent SHG
# ===========================================================================


def test_add_member_skill_shg_not_found() -> None:
    """Operating on a non-existent SHG returns NOT_FOUND, not forbidden."""
    db = _db()
    missing_shg = "00000000-0000-0000-0000-000000000000"
    with pytest.raises(NotFoundError):
        add_member_skill(
            db,
            missing_shg,
            MEMBER_ID,
            MemberSkillCreate(skill="CUTTING", proficiency=1),
            LEADER_ID,
        )
