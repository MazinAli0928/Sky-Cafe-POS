from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.settings import CafeSettings
from app.models.user import User
from app.core.auth import get_current_user, require_manager
from app.schemas.settings import SettingsUpdate, SettingsResponse

router = APIRouter(prefix="/settings", tags=["settings"])

def get_or_create_settings(db: Session) -> CafeSettings:
    cafe_settings = db.query(CafeSettings).first()
    if not cafe_settings:
        cafe_settings = CafeSettings(
            cafe_name="YOUR CAFE",
            tagline="CAFE POS",
            address="Bengaluru, Karnataka",
            phone="+91 98765 43210",
            email="orders@yourcafe.com",
            gstin="29ABCDE1234F1Z5",
            currency="₹",
            receipt_paper_width="80mm",
            show_logo=True,
            show_address=True,
            show_phone=True,
            show_gst=True,
            footer_message="Thank you! Please visit again.",
            bill_prefix="BILL-",
            starting_bill_number=1024,
            printer_port="COM8",
            printer_baudrate=9600,
            printer_auto_cut=True
        )
        db.add(cafe_settings)
        db.commit()
        db.refresh(cafe_settings)
    return cafe_settings

@router.get("", response_model=SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    return get_or_create_settings(db)

@router.put("", response_model=SettingsResponse)
def update_settings(
    payload: SettingsUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    cafe_settings = get_or_create_settings(db)

    update_data = payload.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(cafe_settings, field, value)

    db.commit()
    db.refresh(cafe_settings)
    return cafe_settings
