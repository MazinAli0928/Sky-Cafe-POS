from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Category name cannot be empty")
    description: Optional[str] = Field(None, max_length=255)
    is_active: bool = True

    @field_validator("name")

    def name_must_not_be_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Category name cannot be empty or whitespace only")
        return trimmed

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("name")

    def name_must_not_be_empty(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            trimmed = v.strip()
            if not trimmed:
                raise ValueError("Category name cannot be empty or whitespace only")
            return trimmed
        return v

class CategoryResponse(CategoryBase):
    id: int
    product_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
