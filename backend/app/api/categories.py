from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.category import Category
from app.models.product import Product
from app.models.user import User
from app.core.auth import get_current_user, require_manager
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])

@router.get("", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    # Query categories along with product count per category
    categories = db.query(Category).all()
    result = []
    for cat in categories:
        product_count = db.query(func.count(Product.id)).filter(Product.category_id == cat.id).scalar() or 0
        cat_dict = {
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "is_active": cat.is_active,
            "product_count": product_count,
            "created_at": cat.created_at,
            "updated_at": cat.updated_at
        }
        result.append(cat_dict)
    return result

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    # Check if category with exact name exists
    existing = db.query(Category).filter(func.lower(Category.name) == payload.name.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category with name '{payload.name}' already exists."
        )

    category = Category(
        name=payload.name,
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "is_active": category.is_active,
        "product_count": 0,
        "created_at": category.created_at,
        "updated_at": category.updated_at
    }

@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, db: Session = Depends(get_db)):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    product_count = db.query(func.count(Product.id)).filter(Product.category_id == category.id).scalar() or 0
    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "is_active": category.is_active,
        "product_count": product_count,
        "created_at": category.created_at,
        "updated_at": category.updated_at
    }

@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    if payload.name is not None:
        existing = db.query(Category).filter(
            func.lower(Category.name) == payload.name.lower(),
            Category.id != category_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Another category named '{payload.name}' already exists."
            )
        category.name = payload.name

    if payload.description is not None:
        category.description = payload.description

    if payload.is_active is not None:
        category.is_active = payload.is_active

    db.commit()
    db.refresh(category)

    product_count = db.query(func.count(Product.id)).filter(Product.category_id == category.id).scalar() or 0
    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "is_active": category.is_active,
        "product_count": product_count,
        "created_at": category.created_at,
        "updated_at": category.updated_at
    }

@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    # Check for category delete rule (Requirement 21: Prevent deletion if products exist)
    product_count = db.query(func.count(Product.id)).filter(Product.category_id == category_id).scalar() or 0
    if product_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category '{category.name}': It contains {product_count} product(s). Move or delete products first."
        )

    db.delete(category)
    db.commit()
    return {"message": f"Category '{category.name}' deleted successfully."}

@router.patch("/{category_id}/status", response_model=CategoryResponse)
def toggle_category_status(
    category_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found.")

    category.is_active = not category.is_active
    db.commit()
    db.refresh(category)

    product_count = db.query(func.count(Product.id)).filter(Product.category_id == category.id).scalar() or 0
    return {
        "id": category.id,
        "name": category.name,
        "description": category.description,
        "is_active": category.is_active,
        "product_count": product_count,
        "created_at": category.created_at,
        "updated_at": category.updated_at
    }
