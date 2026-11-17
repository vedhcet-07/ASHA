"""Order request/response schemas."""

from pydantic import BaseModel, field_validator
from typing import Literal
from datetime import date


class OrderItemRequest(BaseModel):
    product_name: str
    quantity: int
    unit_type: str = "piece"
    specifications: dict = {}
    agreed_unit_price: float | None = None

    @field_validator("quantity")
    @classmethod
    def quantity_must_be_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be greater than zero")
        return v

    @field_validator("product_name")
    @classmethod
    def product_name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Product name cannot be empty")
        return v.strip()


class CreateOrderRequest(BaseModel):
    title: str
    description: str | None = None
    required_by_date: str           # ISO date string YYYY-MM-DD
    delivery_address: str | None = None
    special_instructions: str | None = None
    items: list[OrderItemRequest]

    @field_validator("items")
    @classmethod
    def at_least_one_item(cls, v: list) -> list:
        if len(v) < 1:
            raise ValueError("Order must have at least one item")
        return v

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()


class UpdateOrderRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    required_by_date: str | None = None
    delivery_address: str | None = None
    special_instructions: str | None = None


class RejectOrderRequest(BaseModel):
    reason: str | None = None


class CreateBuyerRequest(BaseModel):
    buyer_name: str
    organization_name: str | None = None
    phone_number: str | None = None
    email: str | None = None
