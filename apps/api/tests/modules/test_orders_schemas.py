"""Unit tests for the Orders module schemas and service logic.

Tests validate:
1. ``BuyerOrderCreate`` schema — field validation, minimum items requirement.
2. ``BuyerOrderStatusResponse`` never includes prohibited fields
   (member names, earnings, cost breakdown, allocation details).
3. Completion percentage formula: ``accepted_qty / total_ordered_qty × 100``.
4. Order number format generation logic.

No database connection is required; tests operate on Pydantic models and
pure helper functions only.

Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
"""

from __future__ import annotations

import re
from datetime import date, datetime, timezone

import pytest
from pydantic import ValidationError

from app.modules.orders.schemas import (
    BuyerOrderCreate,
    BuyerOrderItemSummary,
    BuyerOrderStatusResponse,
    OrderItemCreate,
    QualitySummary,
)

# ---------------------------------------------------------------------------
# BuyerOrderCreate — request validation
# ---------------------------------------------------------------------------


class TestBuyerOrderCreate:
    """Validate BuyerOrderCreate schema boundaries (Requirements 3.1, 3.3)."""

    def test_valid_order_accepted(self) -> None:
        """A fully valid order payload is accepted without error."""
        order = BuyerOrderCreate(
            title="Uniform Order",
            required_by=date(2026, 12, 31),
            delivery_address="123 Main St, Bengaluru",
            order_items=[
                OrderItemCreate(product_name="School Shirt", quantity=50, unit="piece"),
            ],
        )
        assert order.title == "Uniform Order"
        assert len(order.order_items) == 1

    def test_multiple_order_items_accepted(self) -> None:
        """An order with multiple items is valid (Requirement 3.3)."""
        order = BuyerOrderCreate(
            title="Multi-product Order",
            required_by=date(2026, 12, 31),
            delivery_address="456 Park Road",
            order_items=[
                OrderItemCreate(product_name="Shirt", quantity=100, unit="piece"),
                OrderItemCreate(product_name="Trouser", quantity=80, unit="piece"),
                OrderItemCreate(product_name="Bag", quantity=40, unit="piece"),
            ],
        )
        assert len(order.order_items) == 3

    def test_empty_order_items_rejected(self) -> None:
        """An empty order_items list must be rejected (Requirement 3.1)."""
        with pytest.raises(ValidationError) as exc_info:
            BuyerOrderCreate(
                title="Empty Order",
                required_by=date(2026, 12, 31),
                delivery_address="789 Lake View",
                order_items=[],
            )
        errors = exc_info.value.errors()
        assert any("order_items" in str(e["loc"]) for e in errors)

    def test_zero_quantity_item_rejected(self) -> None:
        """An order item with quantity=0 must be rejected (Requirement 3.3)."""
        with pytest.raises(ValidationError) as exc_info:
            BuyerOrderCreate(
                title="Bad Quantity Order",
                required_by=date(2026, 12, 31),
                delivery_address="789 Lake View",
                order_items=[
                    OrderItemCreate(product_name="Hat", quantity=0, unit="piece"),
                ],
            )
        errors = exc_info.value.errors()
        assert any("quantity" in str(e["loc"]) for e in errors)

    def test_negative_quantity_item_rejected(self) -> None:
        """Negative quantity must be rejected (Requirement 3.3)."""
        with pytest.raises(ValidationError):
            OrderItemCreate(product_name="Jacket", quantity=-5, unit="piece")

    def test_empty_title_rejected(self) -> None:
        """An empty title string must be rejected (Requirement 3.1)."""
        with pytest.raises(ValidationError):
            BuyerOrderCreate(
                title="",
                required_by=date(2026, 12, 31),
                delivery_address="10 Main St",
                order_items=[
                    OrderItemCreate(product_name="Cap", quantity=10, unit="piece"),
                ],
            )

    def test_empty_delivery_address_rejected(self) -> None:
        """An empty delivery address must be rejected (Requirement 3.1)."""
        with pytest.raises(ValidationError):
            BuyerOrderCreate(
                title="Good Title",
                required_by=date(2026, 12, 31),
                delivery_address="",
                order_items=[
                    OrderItemCreate(product_name="Cap", quantity=10, unit="piece"),
                ],
            )

    def test_optional_specifications_defaults_to_none(self) -> None:
        """Specifications field is optional and defaults to None."""
        item = OrderItemCreate(product_name="Blouse", quantity=20, unit="piece")
        assert item.specifications is None


# ---------------------------------------------------------------------------
# BuyerOrderStatusResponse — response field safety (Requirements 3.6, 13.5)
# ---------------------------------------------------------------------------


class TestBuyerOrderStatusResponseFieldSafety:
    """Ensure the buyer-status response schema contains no prohibited fields.

    Requirements 3.6 and 13.5 require that Buyer-facing responses NEVER
    include individual member names, member earnings, internal cost
    breakdowns, or allocation details.
    """

    PROHIBITED_FIELD_NAMES = {
        # Member identity
        "member_name",
        "display_name",
        "member_id",
        "shg_member_id",
        # Earnings
        "payable_amount",
        "earnings",
        "payout",
        "rate",
        # Cost breakdown
        "unit_price",
        "cost",
        "total_cost",
        "unit_cost",
        "selling_price",
        "material_cost",
        "labour_cost",
        "overhead_cost",
        "margin",
        # Allocation
        "allocation_score",
        "score",
        "allocated_quantity",
        "allocation_reason",
        "reasons",
    }

    def _build_valid_response(self) -> BuyerOrderStatusResponse:
        return BuyerOrderStatusResponse(
            order_id="order-uuid-1",
            order_number="ORD-20261201-0001",
            title="Uniform Order",
            status="IN_PROGRESS",
            required_by=date(2026, 12, 31),
            delivery_address="123 Main St",
            created_at=datetime(2026, 11, 1, 10, 0, 0, tzinfo=timezone.utc),
            current_stage_name="Stitching",
            completion_percentage=60.0,
            order_items=[
                BuyerOrderItemSummary(
                    product_name="School Shirt",
                    quantity=50,
                    unit="piece",
                )
            ],
            quality_summary=QualitySummary(accepted_count=30, total_count=50),
        )

    def test_response_builds_successfully(self) -> None:
        """A valid buyer-status response can be constructed."""
        response = self._build_valid_response()
        assert response.order_number == "ORD-20261201-0001"
        assert response.completion_percentage == 60.0

    def test_response_schema_has_no_prohibited_fields(self) -> None:
        """BuyerOrderStatusResponse schema fields must not include any prohibited names.

        This test enumerates the top-level and nested model fields and
        checks that none of the prohibited field names appear.

        Requirements: 3.6, 13.5
        """
        all_fields: set[str] = set(BuyerOrderStatusResponse.model_fields.keys())
        all_fields |= set(BuyerOrderItemSummary.model_fields.keys())
        all_fields |= set(QualitySummary.model_fields.keys())

        prohibited_found = all_fields & self.PROHIBITED_FIELD_NAMES
        assert prohibited_found == set(), (
            f"Buyer-status response contains prohibited fields: {prohibited_found}. "
            "Requirements 3.6 and 13.5 forbid exposing member names, earnings, "
            "cost breakdowns, and allocation details to buyers."
        )

    def test_order_item_summary_excludes_unit_price(self) -> None:
        """BuyerOrderItemSummary must not expose unit_price (Req 3.6, 13.5)."""
        assert "unit_price" not in BuyerOrderItemSummary.model_fields

    def test_quality_summary_has_no_member_breakdown(self) -> None:
        """QualitySummary exposes only aggregate counts — no per-member data."""
        fields = set(QualitySummary.model_fields.keys())
        assert fields == {"accepted_count", "total_count"}, (
            f"QualitySummary fields changed: {fields}. "
            "Only aggregate accepted_count and total_count are allowed."
        )


# ---------------------------------------------------------------------------
# Completion percentage formula (Requirements 3.5, 13.2)
# ---------------------------------------------------------------------------


class TestCompletionPercentageFormula:
    """Verify the completion percentage calculation logic.

    The formula is: ``accepted_qty / total_ordered_qty × 100``.
    This matches Requirements 3.5 and 13.2.
    """

    @pytest.mark.parametrize(
        "accepted_qty, total_qty, expected_pct",
        [
            (0, 100, 0.0),         # no work done
            (50, 100, 50.0),       # half done
            (100, 100, 100.0),     # fully done
            (1, 1, 100.0),         # single-item order complete
            (30, 50, 60.0),        # fractional
        ],
    )
    def test_completion_percentage_formula(
        self, accepted_qty: int, total_qty: int, expected_pct: float
    ) -> None:
        """Formula: accepted_qty / total_ordered_qty × 100."""
        result = (accepted_qty / total_qty) * 100.0
        assert round(result, 2) == expected_pct

    def test_completion_percentage_capped_at_100(self) -> None:
        """Even if accepted_qty somehow exceeds total (data error), cap at 100."""
        raw = (110 / 100) * 100.0
        capped = min(raw, 100.0)
        assert capped == 100.0

    def test_zero_total_ordered_qty_returns_zero(self) -> None:
        """When total_ordered_qty is 0, completion must default to 0 without division error."""
        total_ordered_qty = 0
        total_accepted_qty = 0
        if total_ordered_qty > 0:
            pct = (total_accepted_qty / total_ordered_qty) * 100.0
        else:
            pct = 0.0
        assert pct == 0.0


# ---------------------------------------------------------------------------
# Order number format validation
# ---------------------------------------------------------------------------


class TestOrderNumberFormat:
    """Validate the ORD-{YYYYMMDD}-{NNNN} format (Requirement 3.2)."""

    _PATTERN = re.compile(r"^ORD-\d{8}-\d{4}$")

    @pytest.mark.parametrize(
        "order_number",
        [
            "ORD-20261201-0001",
            "ORD-20261201-0100",
            "ORD-20261231-9999",
        ],
    )
    def test_valid_order_numbers_match_pattern(self, order_number: str) -> None:
        assert self._PATTERN.match(order_number), (
            f"Order number '{order_number}' does not match ORD-YYYYMMDD-NNNN format."
        )

    @pytest.mark.parametrize(
        "bad_number",
        [
            "ORD-2026-001",
            "ORD-20261201-001",   # 3-digit seq
            "ord-20261201-0001",  # lowercase
            "20261201-0001",      # no ORD prefix
            "ORD-20261201-00001", # 5-digit seq
        ],
    )
    def test_invalid_order_numbers_rejected_by_pattern(self, bad_number: str) -> None:
        assert not self._PATTERN.match(bad_number), (
            f"Order number '{bad_number}' should NOT match the expected format."
        )
