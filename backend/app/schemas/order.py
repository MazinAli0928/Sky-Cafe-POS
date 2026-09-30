from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field

class OrderItemCreate(BaseModel):
    product_id: Optional[int] = None
    product_name: str = Field(..., min_length=1)
    quantity: int = Field(..., ge=1)
    unit_price: float = Field(..., ge=0.0)

class DiscountInput(BaseModel):
    type: str = Field(..., description="'percentage' or 'fixed'")
    value: float = Field(..., ge=0.0)
    reason: Optional[str] = "Customer Promotion"
    # Phase 4: Real manager credentials instead of dev PIN
    manager_username: Optional[str] = None
    manager_password: Optional[str] = None
    manager_authorized: bool = True

class OrderCreate(BaseModel):
    items: List[OrderItemCreate] = Field(..., min_length=1)
    discount: Optional[DiscountInput] = None
    payment_method: str = "UPI"
    tax_rate: float = 0.0

class OrderItemResponse(BaseModel):
    id: int
    product_id: Optional[int]
    product_name: str
    quantity: int
    unit_price: float
    total_price: float

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    bill_no: str
    subtotal: float
    discount_type: Optional[str] = None
    discount_value: float = 0.0
    discount_amount: float = 0.0
    discount_reason: Optional[str] = None
    manager_authorized: bool = False
    manager_name: Optional[str] = None
    cashier_name: Optional[str] = None
    authorized_by_name: Optional[str] = None
    tax: float = 0.0
    total: float
    payment_method: str
    status: str
    created_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True
