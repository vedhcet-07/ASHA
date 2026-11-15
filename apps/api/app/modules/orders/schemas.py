"""Pydantic request/response models for the Orders module.

Covers:
  - Buyer order creation (Requirement 3)
  - Leader order review / intake (Requirement 4)
  - Order status timeline events

Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5
"""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ---------------------------------------------------------------------------
# Enum-like literal types (mirror PostgreSQL enums)
# ---------------------------------------------------------------------------

OrderStatus = Literal[
    "REQUESTED",
    "REVIEWED",
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

#: Statuses in which a Leader is permitted to edit order details.
#: Requirement 4.5: edits allowed only in REQUESTED or REVIEWED.
EDITABLE_STATUSES: frozenset[str] = frozenset({"REQUESTED", "REVIEWED"})


# ---------------------------------------------------------------------------
# Order Item schemas
# ---------------------------------------------------------------------------


class OrderItemCreate(BaseModel):
    """A single product line within an order at creation time.

    Requirement 3.3: product_name, quantity > 0, and unit_type are required;
    specifications is optional.
    """

    product_name: str = Field(..., min_length=1, max_length=255)
    quantity: int = Field(..., gt=0, description="Quantity must be greater than zero")
    unit_type: str = Field(
        default="piece", description="Unit type, e.g. 'piece', 'kg', 'metre'"
    )
    product_sku: str | None = None
    unit_price: Decimal | None = Field(default=None, ge=0)
    specifications: str | None = None


class OrderItemUpdate(BaseModel):
    """An order item within a PATCH payload.

    All fields are optional; at least one must be set when ``order_items`` is
    provided on a ``LeaderOrderUpdate``.
    """

    product_name: str | None = Field(default=None, min_length=1, max_length=255)
    quantity: int | None = Field(default=None, gt=0)
    unit_type: str | None = None
    product_sku: str | None = None
    unit_price: Decimal | None = Field(default=None, ge=0)
    specifications: str | None = None


class OrderItemResponse(BaseModel):
    """Response model for an order item record."""

    model_config = ConfigDict(extra="ignore")

    id: UUID
    order_id: UUID
    product_name: str
    product_sku: str | None = None
    quantity: int
    unit_type: str
    unit_price: Decimal | None = None
    specifications: str | None = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Buyer order creation
# ---------------------------------------------------------------------------


class BuyerOrderCreate(BaseModel):
    """Body for ``POST /orders`` (Buyer role).

    Requirement 3.1: title, required_by (delivery date), delivery_address,
    and at least one order item are required.
    """

    title: str = Field(..., min_length=1, max_length=255, description="Order title")
    description: str | None = None
    required_by: date = Field(..., description="Required delivery date")
    delivery_address: str = Field(..., min_length=1)
    items: list[OrderItemCreate] = Field(
        ...,
        min_length=1,
        description="At least one order item is required",
    )


# ---------------------------------------------------------------------------
# Leader direct order creation
# ---------------------------------------------------------------------------


class LeaderOrderCreate(BaseModel):
    """Body for ``POST /orders/leader`` (Leader role).

    Requirement 4.4: Leader creates an order directly without a prior buyer
    request. Status is set to REVIEWED immediately.

    Field names align with the test suite:
    - ``required_date`` for the delivery date
    - ``order_items`` for the product lines
    """

    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    required_date: date | None = None
    delivery_address: str | None = None
    order_items: list[OrderItemCreate] = Field(
        ...,
        min_length=1,
        description="At least one order item is required",
    )


# ---------------------------------------------------------------------------
# Leader order edit
# ---------------------------------------------------------------------------


class LeaderOrderUpdate(BaseModel):
    """Body for ``PATCH /orders/{order_id}`` (Leader role).

    Requirement 4.5: a Leader can edit title, required_date, delivery_address,
    and order_items while the order is in REQUESTED or REVIEWED status.

    At least one field must be provided (enforced in the service layer, not
    schema layer, so that the Pydantic model stays simple).
    """

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    required_date: date | None = None
    delivery_address: str | None = None
    order_items: list[OrderItemUpdate] | None = None


# ---------------------------------------------------------------------------
# Order review actions
# ---------------------------------------------------------------------------


class OrderAcceptRequest(BaseModel):
    """Body for ``POST /orders/{order_id}/accept`` (Leader role).

    No required fields — the accept action itself performs the transition.
    An optional note may be recorded.
    """

    note: str | None = None


class OrderRejectRequest(BaseModel):
    """Body for ``POST /orders/{order_id}/reject`` (Leader role).

    Requirement 4.3: a reason is required when rejecting an order.
    """

    reason: str = Field(
        ...,
        min_length=1,
        description="Reason for rejection — required by Requirement 4.3",
    )


class OrderCancelRequest(BaseModel):
    """Body for ``POST /orders/{order_id}/cancel`` (Leader role).

    A reason is required when cancelling.
    """

    reason: str = Field(
        ...,
        min_length=1,
        description="Reason for cancellation — required",
    )


# ---------------------------------------------------------------------------
# Timeline event
# ---------------------------------------------------------------------------


class StatusTimelineEvent(BaseModel):
    """A single entry in an order's status history.

    Requirement 13.1: each transition is captured with its timestamp.
    """

    model_config = ConfigDict(extra="ignore")

    id: UUID
    order_id: UUID
    old_status: str | None
    new_status: str
    actor_id: UUID | None
    reason: str | None
    created_at: datetime


# ---------------------------------------------------------------------------
# Order responses
# ---------------------------------------------------------------------------


class OrderResponse(BaseModel):
    """Full order representation returned to the Leader.

    Requirements: 4.1, 4.2 — includes all order metadata and items.
    Does not expose allocation details or member-level financial data.
    """

    model_config = ConfigDict(extra="ignore")

    id: UUID
    order_number: str
    shg_id: UUID
    buyer_id: UUID | None = None
    title: str
    description: str | None = None
    status: str
    required_date: date | None = Field(default=None, alias="required_by")
    delivery_address: str | None = None
    created_by: UUID
    reviewed_by: UUID | None = None
    reviewed_at: datetime | None = None
    delivered_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancel_reason: str | None = None
    created_at: datetime
    updated_at: datetime

    # Nested items — populated by the detail endpoint
    order_items: list[OrderItemResponse] = []

    model_config = ConfigDict(extra="ignore", populate_by_name=True)


class OrderListItem(BaseModel):
    """Minimal order summary for the list endpoint.

    Requirement 4.1: list all SHG orders with their current status.
    """

    model_config = ConfigDict(extra="ignore")

    id: UUID
    order_number: str
    title: str
    status: str
    buyer_id: UUID | None = None
    required_by: date | None = None
    created_at: datetime
    updated_at: datetime


class OrderDetailResponse(OrderResponse):
    """Order detail including items and status timeline.

    Requirement 4.1: full details for the Leader's order detail view.
    """

    timeline: list[StatusTimelineEvent] = []
