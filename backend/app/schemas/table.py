from typing import List, Optional
from pydantic import BaseModel, Field

class TableConfigUpdate(BaseModel):
    table_count: int = Field(..., ge=1, le=100)
    table_prefix: str = Field("T-", min_length=1, max_length=10)

class ActiveOrderSummary(BaseModel):
    order_id: int
    bill_no: str
    status: str
    items_count: int
    total_amount: float
    opened_at: Optional[str] = None
    updated_at: Optional[str] = None
    opened_by_name: Optional[str] = None

class TableStatusResponse(BaseModel):
    table_no: int
    table_name: str
    status: str # "AVAILABLE" | "OCCUPIED" | "READY_FOR_CHECKOUT"
    active_order: Optional[ActiveOrderSummary] = None
