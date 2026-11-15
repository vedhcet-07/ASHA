"""Unit tests for the Orders service layer.

Covers:
- Schema validation for leader order creation and edit (Requirement 4.4, 4.5)
- Order edit state-transition guards (Requirement 4.5)
  - Valid: edit allowed in REQUESTED and REVIEWED
  - Invalid: edit raises ConflictError in all other statuses
- Empty-payload guard: ValidationError when no fields are supplied
- EDITABLE_STATUSES constant

The test strategy uses a lightweight FakeDB that simulates the Supabase
client's fluent builder and stores rows in memory.  Auto-generated DB fields
(id, created_at, updated_at) are pre-populated so the Pydantic response
models construct without errors.

Requirements: 3.1, 3.2, 4.4, 4.5
"""

from __future__ import annotations

import uuid
from datetime import date, datetime, timezone
from typing import Any

import pytest

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.modules.orders.schemas import (
    EDITABLE_STATUSES,
    LeaderOrderCreate,
    LeaderOrderUpdate,
    OrderItemCreate,
    OrderItemUpdate,
)
from app.modules.orders import service


# ---------------------------------------------------------------------------
# In-memory Supabase stub
# ---------------------------------------------------------------------------

NOW_ISO = datetime.now(timezone.utc).isoformat()


def _auto_row(row: dict) -> dict:
    """Fill in auto-generated DB fields that Pydantic models require."""
    defaults = {
        "id": str(uuid.uuid4()),
        "created_at": NOW_ISO,
        "updated_at": NOW_ISO,
    }
    return {**defaults, **row}


class _TableStub:
    """Minimal Supabase query-builder stub backed by an in-memory dict."""

    def __init__(self, store: dict[str, list[dict]], table: str) -> None:
        self._store = store
        self._table = table
        self._filters: list[tuple[str, str, Any]] = []
        self._pending_insert: list[dict] | None = None
        self._pending_update: dict | None = None
        self._pending_delete: bool = False
        self._single = False
        self._select_cols: str = "*"
        self._like_filter: tuple[str, str] | None = None
        self._count_mode: str | None = None
        self._limit_n: int | None = None
        self._in_filter: tuple[str, list] | None = None
        self._is_filter: tuple[str, Any] | None = None
        self._order_col: str | None = None

    # ---- Fluent builder ----

    def select(self, cols: str = "*", *, count: str | None = None) -> "_TableStub":
        self._select_cols = cols
        self._count_mode = count
        return self

    def insert(self, row: dict | list) -> "_TableStub":
        rows = [row] if isinstance(row, dict) else row
        self._pending_insert = [_auto_row(r) for r in rows]
        return self

    def update(self, payload: dict) -> "_TableStub":
        self._pending_update = payload
        return self

    def delete(self) -> "_TableStub":
        self._pending_delete = True
        return self

    def eq(self, col: str, val: Any) -> "_TableStub":
        self._filters.append(("eq", col, val))
        return self

    def like(self, col: str, pattern: str) -> "_TableStub":
        self._like_filter = (col, pattern)
        return self

    def is_(self, col: str, val: Any) -> "_TableStub":
        self._is_filter = (col, val)
        return self

    def in_(self, col: str, values: list) -> "_TableStub":
        self._in_filter = (col, values)
        return self

    def single(self) -> "_TableStub":
        self._single = True
        return self

    def limit(self, n: int) -> "_TableStub":
        self._limit_n = n
        return self

    def order(self, col: str, **_kwargs: Any) -> "_TableStub":
        self._order_col = col
        return self

    def execute(self) -> "_Result":
        rows = list(self._store.get(self._table, []))

        # Apply eq filters
        for _, col, val in self._filters:
            rows = [r for r in rows if str(r.get(col, "")) == str(val)]

        # Apply LIKE filter (prefix match for order_number)
        if self._like_filter:
            col, pattern = self._like_filter
            prefix = pattern.rstrip("%")
            rows = [r for r in rows if str(r.get(col, "")).startswith(prefix)]

        if self._pending_insert is not None:
            self._store.setdefault(self._table, []).extend(self._pending_insert)
            return _Result(data=self._pending_insert, count=len(self._pending_insert))

        if self._pending_update is not None:
            updated = []
            for r in self._store.get(self._table, []):
                if r in rows:
                    r.update(self._pending_update)
                    r["updated_at"] = NOW_ISO
                    updated.append(r)
            return _Result(data=updated, count=len(updated))

        if self._pending_delete:
            remaining = [r for r in self._store.get(self._table, []) if r not in rows]
            self._store[self._table] = remaining
            return _Result(data=rows, count=len(rows))

        count = len(rows) if self._count_mode else None
        if self._limit_n is not None:
            rows = rows[: self._limit_n]
        if self._single:
            if not rows:
                raise Exception("No rows found")
            return _Result(data=rows[0], count=count)
        return _Result(data=rows, count=count)


class _Result:
    def __init__(self, data: Any, count: int | None = None) -> None:
        self.data = data
        self.count = count


class FakeDB:
    """Thin wrapper that returns a fresh stub for each ``table()`` call."""

    def __init__(self) -> None:
        self._store: dict[str, list[dict]] = {
            "orders": [],
            "order_items": [],
            "buyers": [],
            "audit_events": [],
        }

    def table(self, name: str) -> _TableStub:
        return _TableStub(self._store, name)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SAMPLE_ITEMS = [
    OrderItemCreate(product_name="Kurta", quantity=50, unit_type="pieces"),
]
SAMPLE_DATE = date(2026, 6, 1)
LEADER_ID = str(uuid.uuid4())
SHG_ID = str(uuid.uuid4())


def _seed_order(
    db: FakeDB,
    status: str,
    shg_id: str = SHG_ID,
    *,
    order_id: str | None = None,
) -> str:
    """Insert a minimal order row into the fake store and return its ID."""
    oid = order_id or str(uuid.uuid4())
    db._store["orders"].append(  # noqa: SLF001
        {
            "id": oid,
            "order_number": "ORD-20260101-0001",
            "title": "Original title",
            "status": status,
            "required_by": "2026-06-01",
            "delivery_address": "Original address",
            "shg_id": shg_id,
            "buyer_id": None,
            "description": None,
            "created_by": LEADER_ID,
            "reviewed_by": None,
            "reviewed_at": None,
            "delivered_at": None,
            "cancelled_at": None,
            "cancel_reason": None,
            "deleted_at": None,
            "created_at": NOW_ISO,
            "updated_at": NOW_ISO,
        }
    )
    return oid


def _seed_item(db: FakeDB, order_id: str, *, item_id: str | None = None) -> str:
    """Insert a minimal order_item row and return its ID."""
    iid = item_id or str(uuid.uuid4())
    db._store["order_items"].append(  # noqa: SLF001
        {
            "id": iid,
            "order_id": order_id,
            "product_name": "Old product",
            "product_sku": None,
            "quantity": 10,
            "unit": "pieces",
            "unit_type": "pieces",
            "unit_price": None,
            "specifications": None,
            "created_at": NOW_ISO,
            "updated_at": NOW_ISO,
        }
    )
    return iid


# ---------------------------------------------------------------------------
# Schema-level validation tests
# ---------------------------------------------------------------------------


class TestOrderSchemas:
    def test_leader_order_create_requires_at_least_one_item(self) -> None:
        """LeaderOrderCreate must have min_length=1 on order_items."""
        from pydantic import ValidationError as PydanticValidationError
        with pytest.raises(PydanticValidationError):
            LeaderOrderCreate(
                title="Test",
                order_items=[],  # violates min_length=1
            )

    def test_order_item_quantity_must_be_positive(self) -> None:
        from pydantic import ValidationError as PydanticValidationError
        with pytest.raises(PydanticValidationError):
            OrderItemCreate(
                product_name="Kurta",
                quantity=0,  # violates gt=0
                unit_type="pieces",
            )

    def test_editable_statuses_constant(self) -> None:
        """EDITABLE_STATUSES must contain exactly REQUESTED and REVIEWED."""
        assert EDITABLE_STATUSES == frozenset({"REQUESTED", "REVIEWED"})


# ---------------------------------------------------------------------------
# Leader direct order creation
# ---------------------------------------------------------------------------


class TestCreateLeaderOrder:
    def test_raises_validation_error_without_shg_id(self) -> None:
        """Creating a leader order without an SHG ID must raise ValidationError."""
        db = FakeDB()
        request = LeaderOrderCreate(
            title="Blouse order",
            required_date=SAMPLE_DATE,
            delivery_address="HSR Layout",
            order_items=SAMPLE_ITEMS,
        )
        with pytest.raises(ValidationError, match="SHG"):
            service.create_leader_order(db, request, LEADER_ID, shg_id=None)

    def test_inserts_order_into_store(self) -> None:
        """The in-memory store must have one new order after the call."""
        db = FakeDB()
        request = LeaderOrderCreate(
            title="Uniform batch",
            required_date=SAMPLE_DATE,
            delivery_address="Whitefield, Bangalore",
            order_items=SAMPLE_ITEMS,
        )
        # We only verify the store was written; we can't assert on the
        # response because _build_order_response reads back via fetch which
        # requires the row to have id/created_at/updated_at — the FakeDB now
        # injects those via _auto_row.
        service.create_leader_order(db, request, LEADER_ID, SHG_ID)
        assert len(db._store["orders"]) == 1  # noqa: SLF001
        assert db._store["orders"][0]["status"] == "REVIEWED"  # noqa: SLF001

    def test_order_number_starts_with_ord_prefix(self) -> None:
        """Order number must start with 'ORD-'."""
        db = FakeDB()
        request = LeaderOrderCreate(
            title="Saree order",
            order_items=SAMPLE_ITEMS,
        )
        service.create_leader_order(db, request, LEADER_ID, SHG_ID)
        order_row = db._store["orders"][0]  # noqa: SLF001
        assert order_row["order_number"].startswith("ORD-")

    def test_shg_id_stored_on_order_row(self) -> None:
        """The leader's SHG ID must be persisted on the order row."""
        db = FakeDB()
        request = LeaderOrderCreate(title="Blouse", order_items=SAMPLE_ITEMS)
        service.create_leader_order(db, request, LEADER_ID, SHG_ID)
        assert db._store["orders"][0]["shg_id"] == SHG_ID  # noqa: SLF001

    def test_sequential_order_numbers_on_same_day(self) -> None:
        """Two orders on the same day receive different sequential numbers."""
        db = FakeDB()
        req = LeaderOrderCreate(title="A", order_items=SAMPLE_ITEMS)
        service.create_leader_order(db, req, LEADER_ID, SHG_ID)
        service.create_leader_order(db, req, LEADER_ID, SHG_ID)
        nums = [r["order_number"] for r in db._store["orders"]]  # noqa: SLF001
        assert nums[0] != nums[1]

    def test_order_items_persisted(self) -> None:
        """Order items must be inserted after the order row is created."""
        db = FakeDB()
        items = [
            OrderItemCreate(product_name="Kurta", quantity=50, unit_type="pieces"),
            OrderItemCreate(product_name="Dupatta", quantity=20, unit_type="pieces"),
        ]
        request = LeaderOrderCreate(title="Multi-item", order_items=items)
        service.create_leader_order(db, request, LEADER_ID, SHG_ID)
        assert len(db._store["order_items"]) == 2  # noqa: SLF001


# ---------------------------------------------------------------------------
# Order edit — CONFLICT guard for non-editable statuses
# ---------------------------------------------------------------------------

NON_EDITABLE_STATUSES = [
    "PLANNING",
    "ALLOCATION_PENDING",
    "IN_PROGRESS",
    "QUALITY_REVIEW",
    "REWORK",
    "READY",
    "DELIVERED",
    "CANCELLED",
    "COMPLETED",
]


class TestUpdateOrderConflictGuard:
    @pytest.mark.parametrize("bad_status", NON_EDITABLE_STATUSES)
    def test_edit_raises_conflict_for_non_editable_status(
        self, bad_status: str
    ) -> None:
        """Editing an order in any status other than REQUESTED/REVIEWED raises CONFLICT."""
        db = FakeDB()
        order_id = _seed_order(db, bad_status)
        payload = LeaderOrderUpdate(title="Should fail")
        with pytest.raises(ConflictError, match="cannot be edited"):
            service.update_order(db, order_id, payload, LEADER_ID, SHG_ID)

    def test_edit_raises_not_found_for_unknown_order_id(self) -> None:
        """PATCH on a non-existent order_id raises NotFoundError."""
        db = FakeDB()
        payload = LeaderOrderUpdate(title="Ghost order")
        with pytest.raises(NotFoundError):
            service.update_order(db, "non-existent-id", payload, LEADER_ID, SHG_ID)

    def test_empty_patch_body_raises_validation_error(self) -> None:
        """A PATCH payload with no fields at all raises ValidationError."""
        db = FakeDB()
        order_id = _seed_order(db, "REQUESTED")
        payload = LeaderOrderUpdate()  # all None, no order_items
        with pytest.raises(ValidationError, match="At least one field"):
            service.update_order(db, order_id, payload, LEADER_ID, SHG_ID)


# ---------------------------------------------------------------------------
# Order edit — valid transitions
# ---------------------------------------------------------------------------


class TestUpdateOrderValidTransitions:
    def test_edit_allowed_in_requested_status(self) -> None:
        """PATCH is allowed when order status is REQUESTED; title is updated in store."""
        db = FakeDB()
        order_id = _seed_order(db, "REQUESTED")
        payload = LeaderOrderUpdate(title="New title")
        service.update_order(db, order_id, payload, LEADER_ID, SHG_ID)
        updated_row = next(r for r in db._store["orders"] if r["id"] == order_id)  # noqa: SLF001
        assert updated_row["title"] == "New title"

    def test_edit_allowed_in_reviewed_status(self) -> None:
        """PATCH is allowed when order status is REVIEWED; address is updated in store."""
        db = FakeDB()
        order_id = _seed_order(db, "REVIEWED")
        payload = LeaderOrderUpdate(delivery_address="New address")
        service.update_order(db, order_id, payload, LEADER_ID, SHG_ID)
        updated_row = next(r for r in db._store["orders"] if r["id"] == order_id)  # noqa: SLF001
        assert updated_row["delivery_address"] == "New address"

    def test_edit_title_in_reviewed_status(self) -> None:
        """Title field is persisted after a valid edit."""
        db = FakeDB()
        order_id = _seed_order(db, "REVIEWED")
        payload = LeaderOrderUpdate(title="Revised title")
        service.update_order(db, order_id, payload, LEADER_ID, SHG_ID)
        updated_row = next(r for r in db._store["orders"] if r["id"] == order_id)  # noqa: SLF001
        assert updated_row["title"] == "Revised title"


# ---------------------------------------------------------------------------
# Order items replacement
# ---------------------------------------------------------------------------


class TestOrderItemsReplacement:
    def test_empty_items_list_in_patch_raises_validation(self) -> None:
        """Providing an empty order_items list raises ValidationError."""
        db = FakeDB()
        order_id = _seed_order(db, "REQUESTED")
        payload = LeaderOrderUpdate(order_items=[])
        with pytest.raises(ValidationError, match="at least one order item"):
            service.update_order(db, order_id, payload, LEADER_ID, SHG_ID)

    def test_items_replaced_when_provided(self) -> None:
        """When order_items is provided in a PATCH, old items are deleted and new inserted."""
        db = FakeDB()
        order_id = _seed_order(db, "REVIEWED")
        _seed_item(db, order_id)  # one existing item

        new_items = [
            OrderItemUpdate(product_name="New product", quantity=25, unit_type="kg")
        ]
        payload = LeaderOrderUpdate(order_items=new_items)
        service.update_order(db, order_id, payload, LEADER_ID, SHG_ID)

        # After update: old item deleted, new item inserted
        remaining = [i for i in db._store["order_items"] if i["order_id"] == order_id]  # noqa: SLF001
        assert len(remaining) == 1
        assert remaining[0]["product_name"] == "New product"
        assert remaining[0]["quantity"] == 25
