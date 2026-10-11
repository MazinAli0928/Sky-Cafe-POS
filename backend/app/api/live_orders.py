from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.models.settings import CafeSettings
from app.core.auth import get_current_user, require_manager
from app.core.security import verify_password
from app.api.settings import get_or_create_settings
from app.schemas.order import (
    OrderResponse,
    OpenTableOrderRequest,
    LiveOrderItemAddRequest,
    LiveOrderItemsBatchRequest,
    LiveOrderItemUpdateRequest,
    LiveOrderStatusUpdateRequest,
    LiveOrderCheckoutRequest,
    LiveOrderCancelRequest
)

router = APIRouter(prefix="/live-orders", tags=["live-orders"])


def _recalculate_order_totals(order: Order, db: Session):
    """Recalculate subtotal, discount, tax, and total for a live order."""
    db.flush()
    items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
    subtotal = round(sum(item.total_price for item in items), 2)
    order.subtotal = subtotal

    # Re-apply discount if previously applied
    discount_amount = 0.0
    if order.discount_value and order.discount_value > 0:
        if order.discount_type == "percentage":
            discount_amount = round((subtotal * order.discount_value) / 100, 2)
        elif order.discount_type == "fixed":
            discount_amount = round(min(order.discount_value, subtotal), 2)
    order.discount_amount = discount_amount

    taxable = max(0.0, subtotal - discount_amount)
    tax_rate = (order.tax / (order.total - order.tax)) * 100 if (order.total > order.tax and order.tax > 0) else 0.0
    tax = round((taxable * tax_rate) / 100, 2)
    order.tax = tax
    order.total = round(taxable + tax, 2)
    order.updated_at = datetime.utcnow()


@router.get("", response_model=List[OrderResponse])
def get_live_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all active live orders (OPEN or READY_FOR_CHECKOUT)."""
    orders = db.query(Order).filter(
        Order.table_no.isnot(None),
        Order.status.in_(["OPEN", "READY_FOR_CHECKOUT"])
    ).order_by(Order.table_no.asc()).all()
    return orders


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def open_table_order(
    payload: OpenTableOrderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Open a live order for a table.
    If table is already occupied, returns the existing active order safely.
    Prevents double-booking.
    """
    settings = get_or_create_settings(db)
    max_tables = getattr(settings, "table_count", 12) or 12
    if payload.table_no < 1 or payload.table_no > max_tables:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid table number {payload.table_no}. Configured tables: 1 to {max_tables}."
        )

    # Check if table already has an active order
    existing = db.query(Order).filter(
        Order.table_no == payload.table_no,
        Order.status.in_(["OPEN", "READY_FOR_CHECKOUT"])
    ).first()

    if existing:
        return existing

    # Create new draft live order
    now = datetime.utcnow()
    draft_ref = f"DRAFT-T{payload.table_no}-{int(now.timestamp()) % 100000}"

    order = Order(
        bill_no=draft_ref,
        subtotal=0.0,
        discount_type=None,
        discount_value=0.0,
        discount_amount=0.0,
        discount_reason=None,
        manager_authorized=False,
        cashier_id=current_user.id,
        cashier_name=current_user.name,
        tax=0.0,
        total=0.0,
        payment_method="CASH",
        status="OPEN",
        table_no=payload.table_no,
        order_type="dine_in",
        opened_at=now,
        updated_at=now,
        opened_by_user_id=current_user.id,
        opened_by_name=current_user.name
    )

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


@router.get("/{order_id}", response_model=OrderResponse)
def get_live_order(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get details of a specific live order."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    return order


@router.post("/{order_id}/items", response_model=OrderResponse)
def add_items_to_live_order(
    order_id: int,
    payload: LiveOrderItemsBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add items to an existing live table order.
    If the same product already exists on the order, increments its quantity.
    Recalculates totals and updates timestamps.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if order.status not in ("OPEN", "READY_FOR_CHECKOUT"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot add items to order with status '{order.status}'. Only OPEN orders can be edited."
        )

    for item_in in payload.items:
        if item_in.quantity <= 0 or item_in.unit_price < 0:
            continue

        # Check if item already exists by product_id or product_name
        existing_item = None
        for i in order.items:
            if item_in.product_id and i.product_id == item_in.product_id:
                existing_item = i
                break
            elif i.product_name.strip().lower() == item_in.product_name.strip().lower():
                existing_item = i
                break

        if existing_item:
            existing_item.quantity += item_in.quantity
            existing_item.unit_price = item_in.unit_price # Ensure latest price
            existing_item.total_price = round(existing_item.quantity * existing_item.unit_price, 2)
        else:
            new_item = OrderItem(
                order_id=order.id,
                product_id=item_in.product_id,
                product_name=item_in.product_name,
                quantity=item_in.quantity,
                unit_price=item_in.unit_price,
                total_price=round(item_in.quantity * item_in.unit_price, 2)
            )
            db.add(new_item)

    _recalculate_order_totals(order, db)
    order.status = "OPEN" # Any new items keep order in OPEN state
    db.commit()
    db.refresh(order)
    return order


@router.patch("/{order_id}/items/{item_id}", response_model=OrderResponse)
def update_live_order_item(
    order_id: int,
    item_id: int,
    payload: LiveOrderItemUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update item quantity on a live table order.
    If quantity is 0, removes the item line.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if order.status not in ("OPEN", "READY_FOR_CHECKOUT"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify closed order.")

    item = db.query(OrderItem).filter(OrderItem.id == item_id, OrderItem.order_id == order_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found.")

    if payload.quantity <= 0:
        db.delete(item)
    else:
        item.quantity = payload.quantity
        item.total_price = round(item.quantity * item.unit_price, 2)

    db.flush()
    db.refresh(order)
    _recalculate_order_totals(order, db)
    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}/items/{item_id}", response_model=OrderResponse)
def remove_live_order_item(
    order_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove an item completely from a live table order."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if order.status not in ("OPEN", "READY_FOR_CHECKOUT"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot modify closed order.")

    item = db.query(OrderItem).filter(OrderItem.id == item_id, OrderItem.order_id == order_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found.")

    db.delete(item)
    db.flush()
    db.refresh(order)
    _recalculate_order_totals(order, db)
    db.commit()
    db.refresh(order)
    return order


@router.patch("/{order_id}/status", response_model=OrderResponse)
def update_live_order_status(
    order_id: int,
    payload: LiveOrderStatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update order status between OPEN and READY_FOR_CHECKOUT."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if order.status not in ("OPEN", "READY_FOR_CHECKOUT"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot update closed order status.")

    if payload.status not in ("OPEN", "READY_FOR_CHECKOUT"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status transition.")

    order.status = payload.status
    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order


@router.post("/{order_id}/checkout", response_model=OrderResponse)
def checkout_live_order(
    order_id: int,
    payload: LiveOrderCheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Checkout and finalize live table order:
    1. Validates order has at least 1 item.
    2. Validates manager credentials if discount is applied.
    3. Calculates tax, discount, and final total.
    4. Generates guaranteed sequential bill number.
    5. Marks order status as 'Paid'.
    6. Automatically triggers ESC/POS thermal receipt printing.
    7. Releases the table (order status is no longer OPEN/READY_FOR_CHECKOUT).
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if order.status not in ("OPEN", "READY_FOR_CHECKOUT"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is already {order.status}."
        )
    if not order.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot checkout empty order. Please add items first."
        )

    # 1. Subtotal calculation
    subtotal = round(sum(item.total_price for item in order.items), 2)
    order.subtotal = subtotal

    # 2. Discount handling with manager authorization
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

            if manager.id == current_user.id and current_user.role != "MANAGER":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You cannot authorize your own discount."
                )

            authorized_by_user_id = manager.id
            authorized_by_name = manager.name
            manager_authorized = True
            manager_name = manager.name

        elif current_user.role == "MANAGER":
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
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid percentage value.")
            discount_amount = round((subtotal * d.value) / 100, 2)
        elif d.type == "fixed":
            if d.value < 0 or d.value > subtotal:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fixed discount cannot exceed subtotal.")
            discount_amount = round(d.value, 2)
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid discount type.")

        discount_type = d.type
        discount_value = d.value
        discount_reason = d.reason

    # 3. Tax and Grand Total
    taxable_amount = max(0.0, subtotal - discount_amount)
    tax = round((taxable_amount * payload.tax_rate) / 100, 2)
    total = round(taxable_amount + tax, 2)

    # 4. Generate Unique Sequential Bill Number
    settings = get_or_create_settings(db)
    starting_no = settings.starting_bill_number if settings else 1024
    max_order_id = db.query(func.max(Order.id)).scalar() or 0
    candidate_num = max_order_id + starting_no
    while db.query(Order).filter(Order.bill_no == str(candidate_num)).first() is not None:
        candidate_num += 1
    final_bill_no = str(candidate_num)

    # 5. Finalize Order
    order.bill_no = final_bill_no
    order.subtotal = subtotal
    order.discount_type = discount_type
    order.discount_value = discount_value
    order.discount_amount = discount_amount
    order.discount_reason = discount_reason
    order.manager_authorized = manager_authorized
    order.manager_name = manager_name
    order.authorized_by_user_id = authorized_by_user_id
    order.authorized_by_name = authorized_by_name
    order.authorized_at = datetime.now(timezone.utc) if manager_authorized else None
    order.cashier_id = current_user.id
    order.cashier_name = current_user.name
    order.tax = tax
    order.total = total
    order.payment_method = payload.payment_method
    order.status = "Paid"
    order.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(order)

    # 6. Attempt Thermal Receipt Print in background/safe block
    # (Print failure must NOT cancel completed payment)
    try:
        from app.api.printer import _settings_dict, _order_dict
        from app.services.printer_service import get_printer_service
        s_dict = _settings_dict(settings)
        o_dict = _order_dict(order)
        service = get_printer_service(s_dict)
        service.print_receipt(o_dict, s_dict)
    except Exception as print_err:
        import logging
        logging.warning(f"Print receipt failed during table checkout: {print_err}")

    return order


@router.post("/{order_id}/cancel", response_model=OrderResponse)
def cancel_live_order(
    order_id: int,
    payload: LiveOrderCancelRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Cancel / void a live table order.
    Requires manager credentials or manager role.
    Releases table immediately.
    """
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")
    if order.status not in ("OPEN", "READY_FOR_CHECKOUT"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Order is already {order.status}.")

    # Authorization check
    if current_user.role != "MANAGER":
        if not payload.manager_username or not payload.manager_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Manager credentials required to cancel live order."
            )
        manager = db.query(User).filter(
            User.username == payload.manager_username.strip().lower(),
            User.role == "MANAGER",
            User.is_active == True
        ).first()
        if not manager or not verify_password(payload.manager_password, manager.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid manager credentials."
            )

    order.status = "Cancelled"
    order.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(order)
    return order
