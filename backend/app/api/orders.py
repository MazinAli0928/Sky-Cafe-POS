from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.user import User
from app.models.settings import CafeSettings
from app.core.auth import get_current_user, require_manager
from app.core.security import verify_password
from app.schemas.order import OrderCreate, OrderResponse

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=List[OrderResponse])
def get_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    orders = db.query(Order).order_by(Order.id.desc()).all()
    return orders


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_order(
    order_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    """Cancel / void a paid order. Manager only."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if order.status == "Cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order is already cancelled.")

    order.status = "Cancelled"
    db.commit()
    db.refresh(order)
    return order


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    payload: OrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order items list cannot be empty.")

    # 1. Calculate Subtotal & Validate Items
    subtotal = 0.0
    order_items_to_create = []
    for item in payload.items:
        if item.quantity <= 0 or item.unit_price < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item quantity must be at least 1 and price cannot be negative."
            )
        item_total = round(item.quantity * item.unit_price, 2)
        subtotal += item_total
        order_items_to_create.append({
            "product_id": item.product_id,
            "product_name": item.product_name,
            "quantity": item.quantity,
            "unit_price": item.unit_price,
            "total_price": item_total
        })

    subtotal = round(subtotal, 2)

    # 2. Validate Discount with Real Manager Credentials
    discount_type = None
    discount_value = 0.0
    discount_amount = 0.0
    discount_reason = None
    manager_authorized = False
    manager_name = None
    authorized_by_user_id = None
    authorized_by_name = None

    if payload.discount and payload.discount.value > 0:
        d = payload.discount

        # Validate Manager Credentials
        if d.manager_username and d.manager_password:
            manager_username = d.manager_username.strip().lower()
            manager = db.query(User).filter(
                User.username == manager_username,
                User.role == "MANAGER",
                User.is_active == True
            ).first()

            if not manager or not verify_password(d.manager_password, manager.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid manager credentials for discount authorization."
                )

            # Cashier cannot authorize their own discount
            if manager.id == current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You cannot authorize your own discount."
                )

            authorized_by_user_id = manager.id
            authorized_by_name = manager.name
            manager_authorized = True
            manager_name = manager.name

        elif current_user.role == "MANAGER":
            # Manager placing order can self-authorize
            manager_authorized = True
            manager_name = current_user.name
            authorized_by_user_id = current_user.id
            authorized_by_name = current_user.name
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Manager authorization is required to apply a discount."
            )

        if d.type == "percentage":
            if d.value < 0 or d.value > 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Percentage discount must be between 0% and 100%."
                )
            discount_amount = round((subtotal * d.value) / 100, 2)
        elif d.type == "fixed":
            if d.value < 0 or d.value > subtotal:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Fixed discount cannot exceed subtotal."
                )
            discount_amount = round(d.value, 2)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid discount type. Must be 'percentage' or 'fixed'."
            )

        discount_type = d.type
        discount_value = d.value
        discount_reason = d.reason

    # 3. Calculate Tax and Total
    taxable_amount = max(0.0, subtotal - discount_amount)
    tax = round((taxable_amount * payload.tax_rate) / 100, 2)
    total = round(taxable_amount + tax, 2)

    # 4. Generate Guaranteed Unique Bill Number
    settings = db.query(CafeSettings).first()
    starting_no = settings.starting_bill_number if settings else 1024

    max_order_id = db.query(func.max(Order.id)).scalar() or 0
    candidate_num = max_order_id + starting_no
    while db.query(Order).filter(Order.bill_no == str(candidate_num)).first() is not None:
        candidate_num += 1
    bill_number_str = str(candidate_num)

    # 5. Create Order Record
    from datetime import datetime, timezone
    order = Order(
        bill_no=bill_number_str,
        subtotal=subtotal,
        discount_type=discount_type,
        discount_value=discount_value,
        discount_amount=discount_amount,
        discount_reason=discount_reason,
        manager_authorized=manager_authorized,
        manager_name=manager_name,
        authorized_by_user_id=authorized_by_user_id,
        authorized_by_name=authorized_by_name,
        authorized_at=datetime.now(timezone.utc) if manager_authorized else None,
        cashier_id=current_user.id,
        cashier_name=current_user.name,
        tax=tax,
        total=total,
        payment_method=payload.payment_method,
        status="Paid"
    )

    db.add(order)
    db.flush()

    # 6. Create Order Item Records
    for item_data in order_items_to_create:
        db_item = OrderItem(
            order_id=order.id,
            product_id=item_data["product_id"],
            product_name=item_data["product_name"],
            quantity=item_data["quantity"],
            unit_price=item_data["unit_price"],
            total_price=item_data["total_price"]
        )
        db.add(db_item)

    db.commit()
    db.refresh(order)
    return order
