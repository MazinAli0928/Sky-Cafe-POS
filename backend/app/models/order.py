from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    bill_no = Column(String(50), unique=True, nullable=False, index=True)
    subtotal = Column(Float, nullable=False, default=0.0)
    discount_type = Column(String(20), nullable=True) # "percentage" | "fixed"
    discount_value = Column(Float, nullable=False, default=0.0)
    discount_amount = Column(Float, nullable=False, default=0.0)
    discount_reason = Column(String(255), nullable=True)
    manager_authorized = Column(Boolean, default=False, nullable=False)
    manager_name = Column(String(100), nullable=True)
    authorized_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    authorized_by_name = Column(String(100), nullable=True)
    authorized_at = Column(DateTime, nullable=True)
    
    cashier_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    cashier_name = Column(String(100), nullable=False, default="System")

    tax = Column(Float, nullable=False, default=0.0)
    total = Column(Float, nullable=False, default=0.0)
    payment_method = Column(String(30), nullable=False, default="UPI")
    status = Column(String(30), nullable=False, default="Paid")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String(150), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Float, nullable=False, default=0.0)
    total_price = Column(Float, nullable=False, default=0.0)

    order = relationship("Order", back_populates="items")
