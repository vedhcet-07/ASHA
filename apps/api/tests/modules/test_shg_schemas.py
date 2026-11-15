"""Unit tests for the SHG module Pydantic schemas.

These tests validate the request/response models in isolation — no Supabase
connection and no mocks. They cover the fields that ``POST /shgs`` and
``PUT /shgs/{shg_id}`` accept (Requirement 2.1) and confirm ``SHGResponse``
can be built from a Supabase row (JSON strings coerced to ``UUID``,
``datetime``, and ``Decimal``).

Validates: Requirements 2.1
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

import pytest
from pydantic import ValidationError

from app.modules.shg.schemas import SHGCreate, SHGResponse, SHGUpdate


# ---------------------------------------------------------------------------
# SHGCreate
# ---------------------------------------------------------------------------


def test_shg_create_requires_name() -> None:
    """``name`` is the only required field."""
    with pytest.raises(ValidationError) as exc_info:
        SHGCreate()  # type: ignore[call-arg]
    assert "name" in str(exc_info.value)


def test_shg_create_name_cannot_be_empty() -> None:
    with pytest.raises(ValidationError):
        SHGCreate(name="")


def test_shg_create_optional_fields_default_to_none() -> None:
    """Requirement 2.1: name is required; district, state, registration
    number are accepted and default to None when omitted."""
    shg = SHGCreate(name="Bharat Mahila SHG")
    assert shg.name == "Bharat Mahila SHG"
    assert shg.district is None
    assert shg.state is None
    assert shg.registration_number is None
    assert shg.address is None
    assert shg.minimum_margin_percent is None


def test_shg_create_accepts_all_fields() -> None:
    shg = SHGCreate(
        name="Bharat Mahila SHG",
        district="Bengaluru",
        state="Karnataka",
        registration_number="REG-1234",
        address="MG Road, Bengaluru",
        minimum_margin_percent=Decimal("12.50"),
    )
    assert shg.district == "Bengaluru"
    assert shg.state == "Karnataka"
    assert shg.registration_number == "REG-1234"
    assert shg.minimum_margin_percent == Decimal("12.50")


@pytest.mark.parametrize("bad_value", [-0.01, 100.01, Decimal("-1"), Decimal("101")])
def test_shg_create_rejects_out_of_range_margin(bad_value) -> None:
    with pytest.raises(ValidationError):
        SHGCreate(name="X", minimum_margin_percent=bad_value)


# ---------------------------------------------------------------------------
# SHGUpdate
# ---------------------------------------------------------------------------


def test_shg_update_all_fields_optional() -> None:
    """An empty update body is valid."""
    update = SHGUpdate()
    assert update.name is None
    assert update.minimum_margin_percent is None


def test_shg_update_exclude_unset_only_includes_set_fields() -> None:
    """``exclude_unset`` must omit fields the client did not send so the
    service only writes provided fields (and can clear a field with null)."""
    update = SHGUpdate(name="New Name", district=None)
    dumped = update.model_dump(exclude_unset=True)
    # Both name and district were explicitly set (district to None → clear it).
    assert dumped == {"name": "New Name", "district": None}


def test_shg_update_exclude_unset_omits_absent_fields() -> None:
    update = SHGUpdate(name="New Name")
    dumped = update.model_dump(exclude_unset=True)
    assert dumped == {"name": "New Name"}


# ---------------------------------------------------------------------------
# SHGResponse — built from a Supabase row
# ---------------------------------------------------------------------------


def _supabase_row() -> dict:
    """A row as postgrest returns it: UUIDs/timestamps as ISO strings and the
    margin as a number."""
    return {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Bharat Mahila SHG",
        "registration_number": "REG-1234",
        "address": "MG Road, Bengaluru",
        "district": "Bengaluru",
        "state": "Karnataka",
        "leader_id": "660e8400-e29b-41d4-a716-446655440000",
        "minimum_margin_percent": 10.00,
        "created_at": "2026-01-15T10:30:00.000000+00:00",
        "updated_at": "2026-01-15T10:30:00.000000+00:00",
    }


def test_shg_response_parses_supabase_row() -> None:
    """The response model coerces JSON strings into the typed fields."""
    response = SHGResponse.model_validate(_supabase_row())
    assert response.id == UUID("550e8400-e29b-41d4-a716-446655440000")
    assert response.leader_id == UUID("660e8400-e29b-41d4-a716-446655440000")
    assert response.name == "Bharat Mahila SHG"
    assert response.minimum_margin_percent == Decimal("10.00")
    assert isinstance(response.created_at, datetime)
    # Coerced timestamps are timezone-aware.
    assert response.created_at.tzinfo is not None
    assert response.created_at.utcoffset() == timezone.utc.utcoffset(None)


def test_shg_response_ignores_extra_columns() -> None:
    """Supabase ``select *`` would return columns not on the model; they must
    be silently ignored rather than raise."""
    row = _supabase_row()
    row["unexpected_column"] = "ignored"
    response = SHGResponse.model_validate(row)
    assert response.name == "Bharat Mahila SHG"
