from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150, description="Product name cannot be empty")
    category_id: int = Field(..., description="Valid category ID is required")
    price: float = Field(..., ge=0.0, description="Product price must be greater than or equal to 0")
    tax_rate: float = Field(0.0, ge=0.0, description="Tax rate must be greater than or equal to 0")
    sku: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = Field(None, max_length=255)
    is_available: bool = True

    @field_validator("name")

    def name_must_not_be_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Product name cannot be empty or whitespace only")
        return trimmed

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    category_id: Optional[int] = None
    price: Optional[float] = Field(None, ge=0.0)
    tax_rate: Optional[float] = Field(None, ge=0.0)
    sku: Optional[str] = None
    description: Optional[str] = None
    is_available: Optional[bool] = None

    @field_validator("name")

    def name_must_not_be_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Product name cannot be empty or whitespace only")
            return trimmed
        return v

class ProductResponse(ProductBase):
    id: int
    category_name: Optional[str] = None
    status: str = "Available"
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
