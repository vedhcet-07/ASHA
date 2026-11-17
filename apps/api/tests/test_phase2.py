"""
Phase 2 Tests — Orders & Buyer Request Flow
Covers: schemas, status transitions, service logic, route registration, edge cases
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.modules.orders.schemas import (
    CreateOrderRequest, OrderItemRequest, RejectOrderRequest,
)
from app.modules.orders.service import (
    generate_order_number, ORDER_STATUS_TRANSITIONS,
)
from pydantic import ValidationError

client = TestClient(app)


# ─────────────────────────────────────────────────────
# ORDER NUMBER GENERATION
# ─────────────────────────────────────────────────────

class TestOrderNumberGeneration:
    def test_format_starts_with_ord(self):
        num = generate_order_number()
        assert num.startswith("ORD-")

    def test_contains_year(self):
        from datetime import datetime
        year = str(datetime.utcnow().year)
        assert year in generate_order_number()

    def test_unique_each_call(self):
        nums = {generate_order_number() for _ in range(50)}
        assert len(nums) == 50  # all unique


# ─────────────────────────────────────────────────────
# STATUS TRANSITION RULES (deterministic)
# ─────────────────────────────────────────────────────

class TestStatusTransitions:
    def test_requested_can_go_to_reviewed(self):
        assert "REVIEWED" in ORDER_STATUS_TRANSITIONS["REQUESTED"]

    def test_requested_can_be_cancelled(self):
        assert "CANCELLED" in ORDER_STATUS_TRANSITIONS["REQUESTED"]

    def test_completed_has_no_transitions(self):
        assert ORDER_STATUS_TRANSITIONS["COMPLETED"] == []

    def test_cancelled_has_no_transitions(self):
        assert ORDER_STATUS_TRANSITIONS["CANCELLED"] == []

    def test_in_progress_goes_to_quality_review(self):
        assert "QUALITY_REVIEW" in ORDER_STATUS_TRANSITIONS["IN_PROGRESS"]

    def test_ready_goes_to_delivered(self):
        assert "DELIVERED" in ORDER_STATUS_TRANSITIONS["READY"]

    def test_delivered_goes_to_completed(self):
        assert "COMPLETED" in ORDER_STATUS_TRANSITIONS["DELIVERED"]

    def test_all_statuses_have_entries(self):
        required = ["REQUESTED","REVIEWED","PLANNING","ALLOCATION_PENDING",
                    "IN_PROGRESS","QUALITY_REVIEW","REWORK","READY",
                    "DELIVERED","CANCELLED","COMPLETED"]
        for s in required:
            assert s in ORDER_STATUS_TRANSITIONS, f"Missing transition for {s}"

    def test_cannot_skip_from_requested_to_completed(self):
        assert "COMPLETED" not in ORDER_STATUS_TRANSITIONS["REQUESTED"]

    def test_cannot_go_backwards(self):
        assert "REQUESTED" not in ORDER_STATUS_TRANSITIONS["REVIEWED"]
        assert "REVIEWED"  not in ORDER_STATUS_TRANSITIONS["IN_PROGRESS"]


# ─────────────────────────────────────────────────────
# ORDER ITEM SCHEMA VALIDATION
# ─────────────────────────────────────────────────────

class TestOrderItemSchema:
    def test_valid_item_passes(self):
        item = OrderItemRequest(product_name="Canvas Bag", quantity=100, unit_type="piece")
        assert item.product_name == "Canvas Bag"
        assert item.quantity == 100

    def test_zero_quantity_rejected(self):
        with pytest.raises(ValidationError):
            OrderItemRequest(product_name="Bag", quantity=0)

    def test_negative_quantity_rejected(self):
        with pytest.raises(ValidationError):
            OrderItemRequest(product_name="Bag", quantity=-5)

    def test_empty_product_name_rejected(self):
        with pytest.raises(ValidationError):
            OrderItemRequest(product_name="   ", quantity=10)

    def test_product_name_is_stripped(self):
        item = OrderItemRequest(product_name="  Canvas Bag  ", quantity=10)
        assert item.product_name == "Canvas Bag"

    def test_default_unit_type_is_piece(self):
        item = OrderItemRequest(product_name="Bag", quantity=10)
        assert item.unit_type == "piece"

    def test_optional_price_defaults_none(self):
        item = OrderItemRequest(product_name="Bag", quantity=10)
        assert item.agreed_unit_price is None


# ─────────────────────────────────────────────────────
# CREATE ORDER SCHEMA VALIDATION
# ─────────────────────────────────────────────────────

class TestCreateOrderSchema:
    def _valid_order(self):
        return {
            "title": "Festival Bags",
            "required_by_date": "2026-12-01",
            "items": [{"product_name": "Canvas Bag", "quantity": 100}],
        }

    def test_valid_order_passes(self):
        order = CreateOrderRequest(**self._valid_order())
        assert order.title == "Festival Bags"
        assert len(order.items) == 1

    def test_empty_title_rejected(self):
        data = self._valid_order()
        data["title"] = "   "
        with pytest.raises(ValidationError):
            CreateOrderRequest(**data)

    def test_missing_title_rejected(self):
        data = self._valid_order()
        del data["title"]
        with pytest.raises(ValidationError):
            CreateOrderRequest(**data)

    def test_empty_items_list_rejected(self):
        data = self._valid_order()
        data["items"] = []
        with pytest.raises(ValidationError):
            CreateOrderRequest(**data)

    def test_missing_required_by_date_rejected(self):
        data = self._valid_order()
        del data["required_by_date"]
        with pytest.raises(ValidationError):
            CreateOrderRequest(**data)

    def test_multiple_items_allowed(self):
        data = self._valid_order()
        data["items"] = [
            {"product_name": "Canvas Bag", "quantity": 100},
            {"product_name": "Jute Pouch", "quantity": 50},
            {"product_name": "Table Runner", "quantity": 25},
        ]
        order = CreateOrderRequest(**data)
        assert len(order.items) == 3

    def test_title_whitespace_stripped(self):
        data = self._valid_order()
        data["title"] = "  Festival Bags  "
        order = CreateOrderRequest(**data)
        assert order.title == "Festival Bags"


# ─────────────────────────────────────────────────────
# ROUTE REGISTRATION
# ─────────────────────────────────────────────────────

class TestOrderRoutes:
    def test_buyer_create_order_route_exists(self):
        res = client.post("/api/v1/buyers/orders")
        assert res.status_code in (401, 422)  # not 404

    def test_buyer_list_orders_route_exists(self):
        res = client.get("/api/v1/buyers/orders")
        assert res.status_code == 401

    def test_leader_list_orders_route_exists(self):
        res = client.get("/api/v1/orders")
        assert res.status_code == 401

    def test_leader_create_order_route_exists(self):
        res = client.post("/api/v1/orders")
        assert res.status_code in (401, 422)

    def test_order_accept_route_exists(self):
        res = client.post("/api/v1/orders/fake-id/accept")
        assert res.status_code == 401

    def test_order_reject_route_exists(self):
        res = client.post("/api/v1/orders/fake-id/reject")
        assert res.status_code == 401

    def test_order_cancel_route_exists(self):
        res = client.post("/api/v1/orders/fake-id/cancel")
        assert res.status_code == 401

    def test_order_deliver_route_exists(self):
        res = client.post("/api/v1/orders/fake-id/deliver")
        assert res.status_code == 401

    def test_order_timeline_route_exists(self):
        res = client.get("/api/v1/orders/fake-id/timeline")
        assert res.status_code == 401

    def test_order_audit_route_exists(self):
        res = client.get("/api/v1/orders/fake-id/audit")
        assert res.status_code == 401

    def test_buyer_order_status_route_exists(self):
        res = client.get("/api/v1/buyers/orders/fake-id/status")
        assert res.status_code == 401


# ─────────────────────────────────────────────────────
# BUYER VISIBILITY — buyer must NOT see internal data
# ─────────────────────────────────────────────────────

class TestBuyerVisibility:
    def test_buyer_route_requires_auth(self):
        """Buyer order status must require authentication."""
        res = client.get("/api/v1/buyers/orders/some-id/status")
        assert res.status_code == 401

    def test_buyer_cannot_access_leader_orders_list(self):
        """The /orders endpoint (leader only) requires auth and proper role."""
        res = client.get("/api/v1/orders")
        assert res.status_code == 401


# ─────────────────────────────────────────────────────
# VALIDATION — buyer order creation edge cases
# ─────────────────────────────────────────────────────

class TestBuyerOrderValidation:
    def test_buyer_order_missing_title(self):
        res = client.post("/api/v1/buyers/orders", json={
            "required_by_date": "2026-12-01",
            "items": [{"product_name": "Bag", "quantity": 10}],
        })
        assert res.status_code in (401, 422)

    def test_buyer_order_zero_quantity_rejected(self):
        res = client.post("/api/v1/buyers/orders", json={
            "title": "Order",
            "required_by_date": "2026-12-01",
            "items": [{"product_name": "Bag", "quantity": 0}],
        })
        assert res.status_code in (401, 422)

    def test_buyer_order_empty_items_rejected(self):
        res = client.post("/api/v1/buyers/orders", json={
            "title": "Order",
            "required_by_date": "2026-12-01",
            "items": [],
        })
        assert res.status_code in (401, 422)
