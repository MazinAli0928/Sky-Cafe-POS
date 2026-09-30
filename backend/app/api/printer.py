from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.order import Order
from app.models.settings import CafeSettings
from app.models.user import User
from app.core.auth import get_current_user, require_manager
from app.services.printer_service import (
    get_printer_service,
    auto_detect_printer_port,
    get_available_com_ports
)
from app.api.settings import get_or_create_settings

router = APIRouter(prefix="/printer", tags=["printer"])


def _settings_dict(s: CafeSettings) -> dict:
    return {
        "cafe_name": s.cafe_name,
        "tagline": s.tagline,
        "address": s.address,
        "phone": s.phone,
        "email": s.email,
        "gstin": s.gstin,
        "currency": s.currency,
        "receipt_paper_width": s.receipt_paper_width,
        "show_logo": s.show_logo,
        "show_address": s.show_address,
        "show_phone": s.show_phone,
        "show_gst": s.show_gst,
        "footer_message": s.footer_message,
        "bill_prefix": s.bill_prefix,
        "starting_bill_number": s.starting_bill_number,
        "printer_port": getattr(s, "printer_port", "AUTO"),
        "printer_baudrate": getattr(s, "printer_baudrate", 9600),
        "printer_auto_cut": getattr(s, "printer_auto_cut", True),
        "printer_enabled": getattr(s, "printer_enabled", True),
        "printer_connection_type": getattr(s, "printer_connection_type", "bluetooth_spp"),
        "printer_name": getattr(s, "printer_name", "CIE-DYNO-2F64"),
    }


def _order_dict(o: Order) -> dict:
    return {
        "id": o.id,
        "bill_no": o.bill_no,
        "subtotal": o.subtotal,
        "discount_type": o.discount_type,
        "discount_value": o.discount_value,
        "discount_amount": o.discount_amount,
        "discount_reason": o.discount_reason,
        "manager_authorized": o.manager_authorized,
        "manager_name": o.manager_name,
        "cashier_id": o.cashier_id,
        "cashier_name": o.cashier_name,
        "tax": o.tax,
        "total": o.total,
        "payment_method": o.payment_method,
        "status": o.status,
        "created_at": o.created_at.isoformat() if o.created_at else "",
        "items": [
            {
                "product_id": i.product_id,
                "product_name": i.product_name,
                "quantity": i.quantity,
                "unit_price": i.unit_price,
                "total_price": i.total_price,
            }
            for i in o.items
        ],
    }


@router.get("/status")
def get_printer_status(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Check live hardware printer availability and return configuration."""
    settings = get_or_create_settings(db)
    s_dict = _settings_dict(settings)
    service = get_printer_service(s_dict)
    st = service.get_status()

    # If port auto-resolved and settings was set to AUTO or changed, save port locally
    if st["connected"] and st["port"] and (settings.printer_port == "AUTO" or not settings.printer_port):
        settings.printer_port = st["port"]
        db.commit()
        db.refresh(settings)

    return st


@router.get("/ports")
def get_com_ports(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """List all available Windows COM serial ports."""
    return get_available_com_ports()


@router.post("/detect")
def detect_printer(
    db: Session = Depends(get_db),
    _: User = Depends(require_manager),
):
    """
    Auto-detect Bluetooth SPP thermal printer on Windows.
    Manager only. If printer found, updates local configuration.
    """
    settings = get_or_create_settings(db)
    target_name = settings.printer_name or "CIE-DYNO-2F64"
    result = auto_detect_printer_port(target_name)

    if result["found"] and result["port"]:
        settings.printer_port = result["port"]
        db.commit()
        db.refresh(settings)

    return result


@router.post("/test")
def test_print(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Send ESC/POS test receipt pattern using configured/auto-detected port."""
    settings = get_or_create_settings(db)
    s_dict = _settings_dict(settings)
    service = get_printer_service(s_dict)
    res = service.test_print(s_dict)
    if not res["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=res["message"],
        )
    return res


@router.post("/print/{order_id}")
def print_order_receipt(
    order_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Print customer receipt for given order ID via backend Bluetooth SPP ESC/POS."""
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Order not found."
        )

    settings = get_or_create_settings(db)
    s_dict = _settings_dict(settings)
    o_dict = _order_dict(order)

    service = get_printer_service(s_dict)
    res = service.print_receipt(o_dict, s_dict)
    if not res["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=res["message"]
        )
    return res
