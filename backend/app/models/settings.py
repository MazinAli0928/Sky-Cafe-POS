from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from app.database import Base

class CafeSettings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    cafe_name = Column(String(150), nullable=False, default="YOUR CAFE")
    tagline = Column(String(150), nullable=True, default="CAFE POS")
    address = Column(String(255), nullable=True, default="Bengaluru, Karnataka")
    phone = Column(String(50), nullable=True, default="+91 98765 43210")
    email = Column(String(100), nullable=True, default="orders@yourcafe.com")
    gstin = Column(String(50), nullable=True, default="29ABCDE1234F1Z5")
    currency = Column(String(10), nullable=False, default="₹")
    receipt_paper_width = Column(String(20), nullable=False, default="80mm")
    show_logo = Column(Boolean, default=True, nullable=False)
    show_address = Column(Boolean, default=True, nullable=False)
    show_phone = Column(Boolean, default=True, nullable=False)
    show_gst = Column(Boolean, default=True, nullable=False)
    footer_message = Column(String(255), nullable=True, default="Thank you! Please visit again.")
    bill_prefix = Column(String(20), nullable=False, default="BILL-")
    starting_bill_number = Column(Integer, nullable=False, default=1024)
    printer_port = Column(String(20), nullable=False, default="AUTO")
    printer_baudrate = Column(Integer, nullable=False, default=9600)
    printer_auto_cut = Column(Boolean, nullable=False, default=True)
    printer_enabled = Column(Boolean, nullable=False, default=True)
    printer_connection_type = Column(String(50), nullable=False, default="bluetooth_spp")
    printer_name = Column(String(100), nullable=False, default="CIE-DYNO-2F64")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
