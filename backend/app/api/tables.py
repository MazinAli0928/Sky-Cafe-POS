from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.settings import CafeSettings
from app.models.order import Order
from app.models.user import User
from app.core.auth import get_current_user, require_manager
from app.schemas.table import TableStatusResponse, TableConfigUpdate, ActiveOrderSummary
from app.api.settings import get_or_create_settings

router = APIRouter(prefix="/tables", tags=["tables"])

@router.get("", response_model=List[TableStatusResponse])
def get_tables_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get live status for all configured tables.
    Returns whether each table is AVAILABLE, OCCUPIED, or READY_FOR_CHECKOUT,
    along with running totals, item counts, timestamps, and handling staff.
    """
    settings = get_or_create_settings(db)
    table_count = getattr(settings, "table_count", 12) or 12
    table_prefix = getattr(settings, "table_prefix", "T-") or "T-"

    # Query all active live orders (OPEN or READY_FOR_CHECKOUT)
    active_orders = db.query(Order).filter(
        Order.table_no.isnot(None),
        Order.status.in_(["OPEN", "READY_FOR_CHECKOUT"])
    ).all()

    active_order_map = {o.table_no: o for o in active_orders}

    tables_data = []
    for t_num in range(1, table_count + 1):
        order = active_order_map.get(t_num)
        if order:
            table_status = "READY_FOR_CHECKOUT" if order.status == "READY_FOR_CHECKOUT" else "OCCUPIED"
            summary = ActiveOrderSummary(
                order_id=order.id,
                bill_no=order.bill_no,
                status=order.status,
                items_count=sum(item.quantity for item in order.items),
                total_amount=round(order.total, 2),
                opened_at=order.opened_at.isoformat() if order.opened_at else None,
                updated_at=order.updated_at.isoformat() if order.updated_at else None,
                opened_by_name=order.opened_by_name or order.cashier_name
            )
        else:
            table_status = "AVAILABLE"
            summary = None

        tables_data.append(TableStatusResponse(
            table_no=t_num,
            table_name=f"{table_prefix}{t_num}",
            status=table_status,
            active_order=summary
        ))

    return tables_data

@router.put("/config", response_model=dict)
def update_table_config(
    payload: TableConfigUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    """
    Configure total table count and prefix. Manager only.
    """
    settings = get_or_create_settings(db)
    settings.table_count = payload.table_count
    settings.table_prefix = payload.table_prefix
    db.commit()
    db.refresh(settings)

    return {
        "message": "Table configuration updated successfully.",
        "table_count": settings.table_count,
        "table_prefix": settings.table_prefix
    }
