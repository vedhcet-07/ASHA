"""Unit tests for SHG member CRUD service functions.

Tests cover the business logic of ``create_member``, ``list_members``,
``get_member``, ``update_member``, and ``delete_member`` against an in-memory
Supabase test double (``FakeMemberSupabase``).

The double genuinely stores, filters, and updates rows, so the tests
validate real service behaviour: leader authorisation, 15-member cap,
soft-delete, same-SHG access control, and not-found handling.

Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import pytest
from pydantic import ValidationError

from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.modules.shg.schemas import (
    MAX_MEMBERS_PER_SHG,
    MemberCreate,
    MemberResponse,
    MemberUpdate,
)
from app.modules.shg.service import (
    create_member,
    delete_member,
    get_member,
    list_members,
    update_member,
)


# ===========================================================================
# Schema tests — MemberCreate / MemberUpdate / MemberResponse
# ===========================================================================


def test_member_create_requires_display_name() -> None:
    """Requirement 2.3: display_name is required."""
    with pytest.raises(ValidationError):
        MemberCreate(daily_capacity=5)  # type: ignore[call-arg]


def test_member_create_requires_daily_capacity() -> None:
    """Requirement 2.3: daily_capacity is required."""
    with pytest.raises(ValidationError):
        MemberCreate(display_name="Priya")  # type: ignore[call-arg]


def test_member_create_rejects_zero_capacity() -> None:
    """Requirement 2.3: daily_capacity must be greater than zero."""
    with pytest.raises(ValidationError):
        MemberCreate(display_name="Priya", daily_capacity=0)


def test_member_create_rejects_negative_capacity() -> None:
    with pytest.raises(ValidationError):
        MemberCreate(display_name="Priya", daily_capacity=-1)


def test_member_create_accepts_minimum_valid_capacity() -> None:
    member = MemberCreate(display_name="Priya", daily_capacity=1)
    assert member.daily_capacity == 1


def test_member_create_profile_id_optional() -> None:
    member = MemberCreate(display_name="Priya", daily_capacity=5)
    assert member.profile_id is None


def test_member_create_accepts_profile_id() -> None:
    pid = uuid.uuid4()
    member = MemberCreate(display_name="Priya", daily_capacity=5, profile_id=pid)
    assert member.profile_id == pid


def test_member_create_name_cannot_be_empty() -> None:
    with pytest.raises(ValidationError):
        MemberCreate(display_name="", daily_capacity=5)


def test_member_update_all_fields_optional() -> None:
    """An empty update body is valid — service returns unchanged member."""
    update = MemberUpdate()
    assert update.display_name is None
    assert update.daily_capacity is None


def test_member_update_exclude_unset_only_contains_set_fields() -> None:
    update = MemberUpdate(display_name="New Name")
    dumped = update.model_dump(exclude_unset=True)
    assert dumped == {"display_name": "New Name"}


def test_member_update_rejects_zero_capacity() -> None:
    with pytest.raises(ValidationError):
        MemberUpdate(daily_capacity=0)


def _member_response_row() -> dict[str, Any]:
    return {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "shg_id": "660e8400-e29b-41d4-a716-446655440000",
        "profile_id": None,
        "display_name": "Lakshmi",
        "daily_capacity": 10,
        "availability": "available",
        "quality_score": "0.00",
        "workload_score": "0.00",
        "joined_at": "2026-01-15T10:30:00.000000+00:00",
        "deleted_at": None,
        "created_at": "2026-01-15T10:30:00.000000+00:00",
        "updated_at": "2026-01-15T10:30:00.000000+00:00",
    }


def test_member_response_parses_supabase_row() -> None:
    response = MemberResponse.model_validate(_member_response_row())
    assert response.id == uuid.UUID("550e8400-e29b-41d4-a716-446655440000")
    assert response.display_name == "Lakshmi"
    assert response.daily_capacity == 10
    assert response.availability == "available"
    assert response.deleted_at is None
    assert isinstance(response.created_at, datetime)
    assert response.created_at.tzinfo is not None


def test_member_response_ignores_extra_columns() -> None:
    row = _member_response_row()
    row["unexpected_column"] = "ignored"
    response = MemberResponse.model_validate(row)
    assert response.display_name == "Lakshmi"


def test_member_response_allows_null_profile_id() -> None:
    row = _member_response_row()
    row["profile_id"] = None
    response = MemberResponse.model_validate(row)
    assert response.profile_id is None


def test_member_response_allows_non_null_deleted_at() -> None:
    row = _member_response_row()
    row["deleted_at"] = "2026-02-01T00:00:00.000000+00:00"
    response = MemberResponse.model_validate(row)
    assert response.deleted_at is not None
    assert isinstance(response.deleted_at, datetime)


# ===========================================================================
# In-memory Supabase test double
# ===========================================================================


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class _Result:
    def __init__(self, data: Any, count: int | None = None) -> None:
        self.data = data
        self.count = count


class _SelectQuery:
    def __init__(self, store: dict[str, list[dict[str, Any]]], table: str) -> None:
        self._store = store
        self._table = table
        self._eq_filters: list[tuple[str, str]] = []
        self._is_null: list[tuple[str, str]] = []
        self._order_col: str | None = None
        self._limit_count: int | None = None
        self._maybe_single = False
        self._count: str | None = None

    def select(self, _cols: str = "*", *, count: str | None = None) -> "_SelectQuery":
        self._count = count
        return self

    def eq(self, column: str, value: Any) -> "_SelectQuery":
        self._eq_filters.append((column, str(value)))
        return self

    def is_(self, column: str, value: str) -> "_SelectQuery":
        self._is_null.append((column, value))
        return self

    def order(self, column: str, *, desc: bool = False) -> "_SelectQuery":
        self._order_col = column
        return self

    def limit(self, count: int) -> "_SelectQuery":
        self._limit_count = count
        return self

    def maybe_single(self) -> "_SelectQuery":
        self._maybe_single = True
        return self

    def _matches(self, row: dict[str, Any]) -> bool:
        for col, val in self._eq_filters:
            if str(row.get(col)) != val:
                return False
        for col, spec in self._is_null:
            cell = row.get(col)
            if spec == "null" and cell is not None:
                return False
            if spec == "not.null" and cell is None:
                return False
        return True

    def _filtered(self) -> list[dict[str, Any]]:
        rows = [r for r in self._store.get(self._table, []) if self._matches(r)]
        if self._order_col is not None:
            rows.sort(key=lambda r: str(r.get(self._order_col) or ""))
        if self._limit_count is not None:
            rows = rows[: self._limit_count]
        return rows

    def execute(self) -> _Result:
        rows = self._filtered()
        count = len(rows) if self._count == "exact" else None
        if self._maybe_single:
            return _Result(rows[0] if rows else None, count)
        return _Result(rows, count)


class _UpdateQuery:
    def __init__(
        self,
        store: dict[str, list[dict[str, Any]]],
        table: str,
        updates: dict[str, Any],
    ) -> None:
        self._store = store
        self._table = table
        self._updates = updates
        self._eq_filters: list[tuple[str, str]] = []
        self._is_null: list[tuple[str, str]] = []

    def eq(self, column: str, value: Any) -> "_UpdateQuery":
        self._eq_filters.append((column, str(value)))
        return self

    def is_(self, column: str, value: str) -> "_UpdateQuery":
        self._is_null.append((column, value))
        return self

    def select(self, _cols: str = "*") -> "_UpdateQuery":
        return self

    def _matches(self, row: dict[str, Any]) -> bool:
        for col, val in self._eq_filters:
            if str(row.get(col)) != val:
                return False
        for col, spec in self._is_null:
            cell = row.get(col)
            if spec == "null" and cell is not None:
                return False
        return True

    def execute(self) -> _Result:
        updated = []
        for row in self._store.get(self._table, []):
            if self._matches(row):
                row.update(self._updates)
                row["updated_at"] = _now_iso()
                updated.append(row)
        return _Result(updated if updated else [])


class _InsertQuery:
    def __init__(
        self, store: dict[str, list[dict[str, Any]]], table: str, row: dict[str, Any]
    ) -> None:
        self._store = store
        self._table = table
        self._row = dict(row)

    def select(self, _cols: str = "*") -> "_InsertQuery":
        return self

    def execute(self) -> _Result:
        row = dict(self._row)
        row.setdefault("id", str(uuid.uuid4()))
        row.setdefault("availability", "available")
        row.setdefault("quality_score", "0.00")
        row.setdefault("workload_score", "0.00")
        row.setdefault("joined_at", _now_iso())
        row.setdefault("deleted_at", None)
        row.setdefault("created_at", _now_iso())
        row.setdefault("updated_at", _now_iso())
        self._store.setdefault(self._table, []).append(row)
        return _Result([row])


class _TableProxy:
    def __init__(self, store: dict[str, list[dict[str, Any]]], table: str) -> None:
        self._store = store
        self._table = table

    def insert(self, row: dict[str, Any]) -> _InsertQuery:
        return _InsertQuery(self._store, self._table, row)

    def select(self, cols: str = "*", *, count: str | None = None) -> _SelectQuery:
        q = _SelectQuery(self._store, self._table)
        q.select(cols, count=count)
        return q

    def update(self, updates: dict[str, Any]) -> _UpdateQuery:
        return _UpdateQuery(self._store, self._table, updates)


class FakeMemberSupabase:
    """Minimal in-memory stand-in for the Supabase service-role client used by
    the SHG member service functions."""

    def __init__(self, store: dict[str, list[dict[str, Any]]] | None = None) -> None:
        self._store: dict[str, list[dict[str, Any]]] = store if store is not None else {}

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


def _base_store() -> dict[str, list[dict[str, Any]]]:
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
                "minimum_margin_percent": "10.00",
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
        ],
        "shg_members": [],
    }


def _store_with_one_member() -> dict[str, list[dict[str, Any]]]:
    store = _base_store()
    store["shg_members"] = [
        {
            "id": MEMBER_ID,
            "shg_id": SHG_ID,
            "profile_id": MEMBER_PROFILE_ID,
            "display_name": "Lakshmi",
            "daily_capacity": 10,
            "availability": "available",
            "quality_score": "0.00",
            "workload_score": "0.00",
            "joined_at": _now_iso(),
            "deleted_at": None,
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
    ]
    return store


def _db_empty() -> FakeMemberSupabase:
    return FakeMemberSupabase(_base_store())


def _db_one_member() -> FakeMemberSupabase:
    return FakeMemberSupabase(_store_with_one_member())


# ===========================================================================
# create_member
# ===========================================================================


def test_create_member_success() -> None:
    """Requirement 2.3: leader can add a member with display_name and daily_capacity."""
    db = _db_empty()
    payload = MemberCreate(display_name="Kamala", daily_capacity=8)
    result = create_member(db, SHG_ID, payload, LEADER_ID)

    assert result["display_name"] == "Kamala"
    assert result["daily_capacity"] == 8
    assert result["shg_id"] == SHG_ID
    assert result["deleted_at"] is None
    # Persisted in the store.
    assert len(db._store["shg_members"]) == 1


def test_create_member_with_profile_id() -> None:
    """profile_id is optional — when provided it links the member to an auth user."""
    db = _db_empty()
    pid = str(uuid.uuid4())
    payload = MemberCreate(display_name="Kamala", daily_capacity=8, profile_id=pid)
    result = create_member(db, SHG_ID, payload, LEADER_ID)
    assert result["profile_id"] == pid


def test_create_member_without_profile_id_stores_none() -> None:
    db = _db_empty()
    payload = MemberCreate(display_name="Roja", daily_capacity=5)
    result = create_member(db, SHG_ID, payload, LEADER_ID)
    assert result.get("profile_id") is None


def test_create_member_forbidden_when_not_leader() -> None:
    """Only the SHG's leader can add members."""
    db = _db_empty()
    payload = MemberCreate(display_name="Kamala", daily_capacity=5)
    with pytest.raises(ForbiddenError):
        create_member(db, SHG_ID, payload, OUTSIDER_ID)
    assert db._store["shg_members"] == []


def test_create_member_shg_not_found() -> None:
    """Adding a member to a non-existent SHG raises NotFoundError."""
    db = _db_empty()
    missing_shg = "00000000-0000-0000-0000-000000000000"
    payload = MemberCreate(display_name="Kamala", daily_capacity=5)
    with pytest.raises(NotFoundError):
        create_member(db, missing_shg, payload, LEADER_ID)
    assert db._store["shg_members"] == []


def test_create_member_enforces_15_member_cap() -> None:
    """Requirement 2.2: an SHG may have at most 15 active members."""
    store = _base_store()
    for i in range(MAX_MEMBERS_PER_SHG):
        store["shg_members"].append(
            {
                "id": str(uuid.uuid4()),
                "shg_id": SHG_ID,
                "profile_id": None,
                "display_name": f"Member {i + 1}",
                "daily_capacity": 5,
                "availability": "available",
                "quality_score": "0.00",
                "workload_score": "0.00",
                "joined_at": _now_iso(),
                "deleted_at": None,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
        )
    db = FakeMemberSupabase(store)

    with pytest.raises(ConflictError):
        create_member(db, SHG_ID, MemberCreate(display_name="Extra", daily_capacity=1), LEADER_ID)

    # Still 15 members — 16th was rejected.
    active = [m for m in db._store["shg_members"] if m["deleted_at"] is None]
    assert len(active) == MAX_MEMBERS_PER_SHG


def test_create_member_soft_deleted_do_not_count_toward_cap() -> None:
    """Soft-deleted members do not count against the 15-member cap."""
    store = _base_store()
    # 14 active + 1 soft-deleted = only 14 active.
    for i in range(14):
        store["shg_members"].append(
            {
                "id": str(uuid.uuid4()),
                "shg_id": SHG_ID,
                "profile_id": None,
                "display_name": f"Member {i + 1}",
                "daily_capacity": 5,
                "availability": "available",
                "quality_score": "0.00",
                "workload_score": "0.00",
                "joined_at": _now_iso(),
                "deleted_at": None,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
        )
    store["shg_members"].append(
        {
            "id": str(uuid.uuid4()),
            "shg_id": SHG_ID,
            "profile_id": None,
            "display_name": "Deleted Member",
            "daily_capacity": 5,
            "availability": "available",
            "quality_score": "0.00",
            "workload_score": "0.00",
            "joined_at": _now_iso(),
            "deleted_at": _now_iso(),  # soft-deleted
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
    )
    db = FakeMemberSupabase(store)

    # Adding a 15th active member should succeed.
    result = create_member(db, SHG_ID, MemberCreate(display_name="New Active", daily_capacity=3), LEADER_ID)
    assert result["display_name"] == "New Active"
    active = [m for m in db._store["shg_members"] if m["deleted_at"] is None]
    assert len(active) == MAX_MEMBERS_PER_SHG


# ===========================================================================
# list_members
# ===========================================================================


def test_list_members_returns_active_members() -> None:
    """Requirement 2.2: only non-deleted members are returned."""
    db = _db_one_member()
    members = list_members(db, SHG_ID, LEADER_ID)
    assert len(members) == 1
    assert members[0]["display_name"] == "Lakshmi"


def test_list_members_excludes_soft_deleted() -> None:
    store = _store_with_one_member()
    # Soft-delete the existing member.
    store["shg_members"][0]["deleted_at"] = _now_iso()
    db = FakeMemberSupabase(store)
    members = list_members(db, SHG_ID, LEADER_ID)
    assert members == []


def test_list_members_empty_shg() -> None:
    db = _db_empty()
    members = list_members(db, SHG_ID, LEADER_ID)
    assert members == []


def test_list_members_forbidden_for_outsider() -> None:
    """Requirement 2.10: a user outside the SHG cannot list members."""
    db = _db_one_member()
    with pytest.raises(ForbiddenError):
        list_members(db, SHG_ID, OUTSIDER_ID)


def test_list_members_allowed_for_same_shg_member() -> None:
    """Requirement 2.10: a same-SHG member may list members."""
    db = _db_one_member()
    # MEMBER_PROFILE_ID is linked to the existing member row.
    members = list_members(db, SHG_ID, MEMBER_PROFILE_ID)
    assert len(members) == 1


# ===========================================================================
# get_member
# ===========================================================================


def test_get_member_success() -> None:
    db = _db_one_member()
    member = get_member(db, SHG_ID, MEMBER_ID, LEADER_ID)
    assert member["id"] == MEMBER_ID
    assert member["display_name"] == "Lakshmi"


def test_get_member_not_found() -> None:
    db = _db_one_member()
    missing = "00000000-0000-0000-0000-000000000000"
    with pytest.raises(NotFoundError):
        get_member(db, SHG_ID, missing, LEADER_ID)


def test_get_member_soft_deleted_raises_not_found() -> None:
    store = _store_with_one_member()
    store["shg_members"][0]["deleted_at"] = _now_iso()
    db = FakeMemberSupabase(store)
    with pytest.raises(NotFoundError):
        get_member(db, SHG_ID, MEMBER_ID, LEADER_ID)


def test_get_member_forbidden_for_outsider() -> None:
    db = _db_one_member()
    with pytest.raises(ForbiddenError):
        get_member(db, SHG_ID, MEMBER_ID, OUTSIDER_ID)


def test_get_member_allowed_for_same_shg_member() -> None:
    """Requirement 2.10: a same-SHG member may read another member."""
    db = _db_one_member()
    member = get_member(db, SHG_ID, MEMBER_ID, MEMBER_PROFILE_ID)
    assert member["id"] == MEMBER_ID


def test_get_member_wrong_shg_raises_not_found() -> None:
    """A member from another SHG cannot be fetched via this SHG's id."""
    db = _db_one_member()
    wrong_shg = "00000000-0000-0000-0000-000000000001"
    with pytest.raises((NotFoundError, ForbiddenError)):
        get_member(db, wrong_shg, MEMBER_ID, LEADER_ID)


# ===========================================================================
# update_member
# ===========================================================================


def test_update_member_display_name() -> None:
    db = _db_one_member()
    payload = MemberUpdate(display_name="Kamala")
    result = update_member(db, SHG_ID, MEMBER_ID, payload, LEADER_ID)
    assert result["display_name"] == "Kamala"


def test_update_member_daily_capacity() -> None:
    db = _db_one_member()
    payload = MemberUpdate(daily_capacity=20)
    result = update_member(db, SHG_ID, MEMBER_ID, payload, LEADER_ID)
    assert result["daily_capacity"] == 20


def test_update_member_empty_payload_returns_unchanged() -> None:
    """An empty update payload returns the current member record unchanged."""
    db = _db_one_member()
    payload = MemberUpdate()
    result = update_member(db, SHG_ID, MEMBER_ID, payload, LEADER_ID)
    assert result["display_name"] == "Lakshmi"
    assert result["daily_capacity"] == 10


def test_update_member_forbidden_when_not_leader() -> None:
    db = _db_one_member()
    with pytest.raises(ForbiddenError):
        update_member(db, SHG_ID, MEMBER_ID, MemberUpdate(display_name="X"), OUTSIDER_ID)
    # The member name was not changed.
    unchanged = db._store["shg_members"][0]
    assert unchanged["display_name"] == "Lakshmi"


def test_update_member_not_found() -> None:
    db = _db_one_member()
    missing = "00000000-0000-0000-0000-000000000000"
    with pytest.raises(NotFoundError):
        update_member(db, SHG_ID, missing, MemberUpdate(display_name="X"), LEADER_ID)


def test_update_member_soft_deleted_raises_not_found() -> None:
    store = _store_with_one_member()
    store["shg_members"][0]["deleted_at"] = _now_iso()
    db = FakeMemberSupabase(store)
    with pytest.raises(NotFoundError):
        update_member(db, SHG_ID, MEMBER_ID, MemberUpdate(display_name="X"), LEADER_ID)


# ===========================================================================
# delete_member (soft-delete)
# ===========================================================================


def test_delete_member_sets_deleted_at() -> None:
    """Requirement 2.9: soft-delete sets deleted_at and retains the row."""
    db = _db_one_member()
    result = delete_member(db, SHG_ID, MEMBER_ID, LEADER_ID)
    assert result["deleted_at"] is not None
    # The row still exists in the store (not hard-deleted).
    assert len(db._store["shg_members"]) == 1


def test_delete_member_row_still_in_store_after_delete() -> None:
    """Historical data is retained (Requirement 2.9)."""
    db = _db_one_member()
    delete_member(db, SHG_ID, MEMBER_ID, LEADER_ID)
    rows = db._store["shg_members"]
    assert len(rows) == 1
    assert rows[0]["id"] == MEMBER_ID
    assert rows[0]["deleted_at"] is not None


def test_delete_member_forbidden_when_not_leader() -> None:
    db = _db_one_member()
    with pytest.raises(ForbiddenError):
        delete_member(db, SHG_ID, MEMBER_ID, OUTSIDER_ID)
    # deleted_at must remain None.
    assert db._store["shg_members"][0]["deleted_at"] is None


def test_delete_member_not_found() -> None:
    db = _db_one_member()
    missing = "00000000-0000-0000-0000-000000000000"
    with pytest.raises(NotFoundError):
        delete_member(db, SHG_ID, missing, LEADER_ID)


def test_delete_member_already_deleted_raises_not_found() -> None:
    """A member that is already soft-deleted is treated as not found."""
    store = _store_with_one_member()
    store["shg_members"][0]["deleted_at"] = _now_iso()
    db = FakeMemberSupabase(store)
    with pytest.raises(NotFoundError):
        delete_member(db, SHG_ID, MEMBER_ID, LEADER_ID)


def test_deleted_member_excluded_from_active_count() -> None:
    """After soft-deleting a member the 15-member cap allows a new member."""
    store = _base_store()
    for i in range(MAX_MEMBERS_PER_SHG):
        store["shg_members"].append(
            {
                "id": str(uuid.uuid4()),
                "shg_id": SHG_ID,
                "profile_id": None,
                "display_name": f"Member {i + 1}",
                "daily_capacity": 5,
                "availability": "available",
                "quality_score": "0.00",
                "workload_score": "0.00",
                "joined_at": _now_iso(),
                "deleted_at": None,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
        )
    db = FakeMemberSupabase(store)

    # Soft-delete member #0.
    first_member_id = db._store["shg_members"][0]["id"]
    delete_member(db, SHG_ID, first_member_id, LEADER_ID)

    # Now 14 active members remain → adding a new one should succeed.
    result = create_member(
        db, SHG_ID, MemberCreate(display_name="Replacement", daily_capacity=3), LEADER_ID
    )
    assert result["display_name"] == "Replacement"
