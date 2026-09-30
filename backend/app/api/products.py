from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.product import Product
from app.models.category import Category
from app.models.user import User
from app.core.auth import get_current_user, require_manager
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter(prefix="/products", tags=["products"])

def build_product_response(product: Product) -> dict:
    category_name = product.category.name if product.category else "Uncategorized"
    return {
        "id": product.id,
        "name": product.name,
        "category_id": product.category_id,
        "category_name": category_name,
        "price": product.price,
        "tax_rate": product.tax_rate,
        "sku": product.sku,
        "description": product.description,
        "is_available": product.is_available,
        "status": "Available" if product.is_available else "Out of Stock",
        "created_at": product.created_at,
        "updated_at": product.updated_at
    }

@router.get("", response_model=List[ProductResponse])
def get_products(
    search: Optional[str] = Query(None, description="Search term for product name/SKU"),
    category_id: Optional[int] = Query(None, description="Filter by category ID"),
    is_available: Optional[bool] = Query(None, description="Filter by availability"),
    db: Session = Depends(get_db)
):
    query = db.query(Product)

    if category_id is not None:
        query = query.filter(Product.category_id == category_id)

    if is_available is not None:
        query = query.filter(Product.is_available == is_available)

    if search:
        search_term = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(Product.name).like(search_term) |
            func.lower(Product.sku).like(search_term)
        )

    products = query.order_by(Product.id.asc()).all()
    return [build_product_response(p) for p in products]

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    # Validate category existence
    category = db.query(Category).filter(Category.id == payload.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category with ID {payload.category_id} does not exist."
        )

    # Validate unique SKU if provided
    if payload.sku:
        existing_sku = db.query(Product).filter(Product.sku == payload.sku).first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A product with SKU '{payload.sku}' already exists."
            )

    product = Product(
        name=payload.name,
        category_id=payload.category_id,
        price=payload.price,
        tax_rate=payload.tax_rate,
        sku=payload.sku,
        description=payload.description,
        is_available=payload.is_available
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    return build_product_response(product)

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    return build_product_response(product)

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    if payload.category_id is not None:
        category = db.query(Category).filter(Category.id == payload.category_id).first()
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Category with ID {payload.category_id} does not exist."
            )
        product.category_id = payload.category_id

    if payload.sku is not None and payload.sku != product.sku:
        existing_sku = db.query(Product).filter(Product.sku == payload.sku, Product.id != product_id).first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A product with SKU '{payload.sku}' already exists."
            )
        product.sku = payload.sku

    if payload.name is not None:
        product.name = payload.name
    if payload.price is not None:
        product.price = payload.price
    if payload.tax_rate is not None:
        product.tax_rate = payload.tax_rate
    if payload.description is not None:
        product.description = payload.description
    if payload.is_available is not None:
        product.is_available = payload.is_available

    db.commit()
    db.refresh(product)
    return build_product_response(product)

@router.delete("/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    db.delete(product)
    db.commit()
    return {"message": f"Product '{product.name}' deleted successfully."}

@router.patch("/{product_id}/status", response_model=ProductResponse)
def toggle_product_status(
    product_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    product.is_available = not product.is_available
    db.commit()
    db.refresh(product)
    return build_product_response(product)

