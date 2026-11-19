from typing import Optional, List, Dict, Any
from pydantic import BaseModel

class OrderItemInput(BaseModel):
    product_name: str
    quantity: int
    unit_type: str = "piece"
    specifications: Dict[str, Any] = {}
    agreed_unit_price: Optional[float] = None

class CreateBuyerOrderRequest(BaseModel):
    title: str
    description: Optional[str] = None
    required_by_date: str
    delivery_address: Optional[str] = None
    special_instructions: Optional[str] = None
    items: List[OrderItemInput]

class UpdateOrderRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    required_by_date: Optional[str] = None
    delivery_address: Optional[str] = None
    special_instructions: Optional[str] = None
