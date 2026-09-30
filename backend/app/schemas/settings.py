from datetime import datetime
from typing import Optional
from pydantic import BaseModel

class SettingsBase(BaseModel):
    cafe_name: str = "YOUR CAFE"
    tagline: Optional[str] = "CAFE POS"
    address: Optional[str] = "Bengaluru, Karnataka"
    phone: Optional[str] = "+91 98765 43210"
    email: Optional[str] = "orders@yourcafe.com"
    gstin: Optional[str] = "29ABCDE1234F1Z5"
    currency: str = "₹"
    receipt_paper_width: str = "80mm"
    show_logo: bool = True
    show_address: bool = True
    show_phone: bool = True
    show_gst: bool = True
    footer_message: Optional[str] = "Thank you! Please visit again."
    bill_prefix: str = "BILL-"
    starting_bill_number: int = 1024
    printer_port: str = "AUTO"
    printer_baudrate: int = 9600
    printer_auto_cut: bool = True
    printer_enabled: bool = True
    printer_connection_type: str = "bluetooth_spp"
    printer_name: str = "CIE-DYNO-2F64"

class SettingsUpdate(BaseModel):
    cafe_name: Optional[str] = None
    tagline: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    gstin: Optional[str] = None
    currency: Optional[str] = None
    receipt_paper_width: Optional[str] = None
    show_logo: Optional[bool] = None
    show_address: Optional[bool] = None
    show_phone: Optional[bool] = None
    show_gst: Optional[bool] = None
    footer_message: Optional[str] = None
    bill_prefix: Optional[str] = None
    starting_bill_number: Optional[int] = None
    printer_port: Optional[str] = None
    printer_baudrate: Optional[int] = None
    printer_auto_cut: Optional[bool] = None
    printer_enabled: Optional[bool] = None
    printer_connection_type: Optional[str] = None
    printer_name: Optional[str] = None

class SettingsResponse(SettingsBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
