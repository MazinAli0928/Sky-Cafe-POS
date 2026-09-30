from datetime import datetime, timedelta, time
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract, text
from app.database import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.category import Category
from app.models.user import User
from app.core.auth import get_current_user, require_manager

router = APIRouter(prefix="/analytics", tags=["analytics"])


def parse_date_range(range_type: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    now = datetime.now()
    today_start = datetime.combine(now.date(), time.min)
    today_end = datetime.combine(now.date(), time.max)

    if range_type == "today":
        return today_start, today_end
    elif range_type == "yesterday":
        y = now.date() - timedelta(days=1)
        return datetime.combine(y, time.min), datetime.combine(y, time.max)
    elif range_type in ("7days", "this_week"):
        start = today_start - timedelta(days=6)
        return start, today_end
    elif range_type in ("30days", "this_month"):
        start = today_start - timedelta(days=29)
        return start, today_end
    elif range_type == "custom" and start_date and end_date:
        try:
            s = datetime.strptime(start_date, "%Y-%m-%d")
            e = datetime.strptime(end_date, "%Y-%m-%d")
            return datetime.combine(s.date(), time.min), datetime.combine(e.date(), time.max)
        except ValueError:
            pass
    # Default: 7 days
    return today_start - timedelta(days=6), today_end


# ─────────────────────────────────────────────────────────────
# 1. REAL DASHBOARD ANALYTICS
# ─────────────────────────────────────────────────────────────
@router.get("/dashboard")
def get_dashboard_analytics(
    range_type: str = Query("7days", alias="range"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    SQL Aggregated Dashboard metrics computed strictly in database:
    - Today's Sales (Paid)
    - Today's Orders Count (Paid)
    - Average Order Value
    - Items Sold Count
    - Payment Method Breakdown (Cash, UPI, Card)
    - Discounts Given Total
    - Cancelled Orders Count
    - Sales Overview Chart (Revenue grouped by day)
    - Top Selling Products
    """
    now = datetime.now()
    today_start = datetime.combine(now.date(), time.min)
    today_end = datetime.combine(now.date(), time.max)

    # 1. Today's Paid Metrics
    today_paid_query = db.query(
        func.coalesce(func.sum(Order.total), 0.0).label("todays_sales"),
        func.count(Order.id).label("todays_orders"),
        func.coalesce(func.avg(Order.total), 0.0).label("avg_order"),
        func.coalesce(func.sum(Order.discount_amount), 0.0).label("discounts_given")
    ).filter(
        Order.status == "Paid",
        Order.created_at >= today_start,
        Order.created_at <= today_end
    ).first()

    # 2. Today's Total Items Sold
    items_sold_today = db.query(
        func.coalesce(func.sum(OrderItem.quantity), 0)
    ).join(Order).filter(
        Order.status == "Paid",
        Order.created_at >= today_start,
        Order.created_at <= today_end
    ).scalar() or 0

    # 3. Today's Payment Method Breakdown
    payment_stats = db.query(
        Order.payment_method,
        func.coalesce(func.sum(Order.total), 0.0).label("amount"),
        func.count(Order.id).label("count")
    ).filter(
        Order.status == "Paid",
        Order.created_at >= today_start,
        Order.created_at <= today_end
    ).group_by(Order.payment_method).all()

    payment_dict = {"CASH": 0.0, "UPI": 0.0, "CARD": 0.0}
    for p in payment_stats:
        method = (p.payment_method or "").upper()
        if method in payment_dict:
            payment_dict[method] = round(p.amount, 2)

    total_payment_vol = sum(payment_dict.values())
    payment_methods_breakdown = [
        {
            "name": "UPI",
            "value": payment_dict["UPI"],
            "percentage": round((payment_dict["UPI"] / total_payment_vol * 100), 1) if total_payment_vol > 0 else 0,
            "color": "#10b981" # emerald
        },
        {
            "name": "Cash",
            "value": payment_dict["CASH"],
            "percentage": round((payment_dict["CASH"] / total_payment_vol * 100), 1) if total_payment_vol > 0 else 0,
            "color": "#f59e0b" # amber
        },
        {
            "name": "Card",
            "value": payment_dict["CARD"],
            "percentage": round((payment_dict["CARD"] / total_payment_vol * 100), 1) if total_payment_vol > 0 else 0,
            "color": "#6366f1" # indigo
        }
    ]

    # 4. Today's Cancelled Orders Count
    today_cancelled_count = db.query(func.count(Order.id)).filter(
        Order.status == "Cancelled",
        Order.created_at >= today_start,
        Order.created_at <= today_end
    ).scalar() or 0

    # 5. Sales Trend Chart Data (Last 7 Days)
    range_start, range_end = parse_date_range(range_type, start_date, end_date)
    
    # Query orders grouped by date
    daily_sales = db.query(
        func.strftime("%Y-%m-%d", Order.created_at).label("date_str"),
        func.coalesce(func.sum(Order.total), 0.0).label("daily_revenue"),
        func.count(Order.id).label("daily_orders")
    ).filter(
        Order.status == "Paid",
        Order.created_at >= range_start,
        Order.created_at <= range_end
    ).group_by(text("date_str")).all()

    daily_dict = {d.date_str: {"sales": round(d.daily_revenue, 2), "orders": d.daily_orders} for d in daily_sales}

    sales_overview_chart = []
    curr_date = range_start.date()
    while curr_date <= range_end.date():
        ds = curr_date.strftime("%Y-%m-%d")
        day_name = curr_date.strftime("%b %d")
        val = daily_dict.get(ds, {"sales": 0.0, "orders": 0})
        sales_overview_chart.append({
            "date": ds,
            "day": day_name,
            "sales": val["sales"],
            "orders": val["orders"]
        })
        curr_date += timedelta(days=1)

    # 6. Top Selling Products (Grouped by product_name)
    top_products_raw = db.query(
        OrderItem.product_name,
        func.coalesce(func.sum(OrderItem.quantity), 0).label("qty_sold"),
        func.coalesce(func.sum(OrderItem.total_price), 0.0).label("revenue")
    ).join(Order).filter(
        Order.status == "Paid",
        Order.created_at >= range_start,
        Order.created_at <= range_end
    ).group_by(OrderItem.product_name).order_by(text("qty_sold DESC")).limit(5).all()

    top_products = [
        {
            "name": p.product_name,
            "sold": p.qty_sold,
            "revenue": round(p.revenue, 2),
            "category": "Popular"
        }
        for p in top_products_raw
    ]

    return {
        "stats": {
            "todaysSales": round(today_paid_query.todays_sales, 2),
            "todaysOrders": today_paid_query.todays_orders,
            "averageOrder": round(today_paid_query.avg_order, 2),
            "itemsSold": items_sold_today,
            "discountsGiven": round(today_paid_query.discounts_given, 2),
            "cashSales": payment_dict["CASH"],
            "upiSales": payment_dict["UPI"],
            "cardSales": payment_dict["CARD"],
            "cancelledOrders": today_cancelled_count
        },
        "salesOverview": sales_overview_chart,
        "paymentBreakdown": payment_methods_breakdown,
        "topProducts": top_products
    }


# ─────────────────────────────────────────────────────────────
# 2. REAL SALES REPORT
# ─────────────────────────────────────────────────────────────
@router.get("/reports/sales")
def get_sales_report(
    range_type: str = Query("today", alias="range"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    range_start, range_end = parse_date_range(range_type, start_date, end_date)

    paid_summary = db.query(
        func.coalesce(func.sum(Order.subtotal), 0.0).label("gross_sales"),
        func.coalesce(func.sum(Order.discount_amount), 0.0).label("total_discounts"),
        func.coalesce(func.sum(Order.tax), 0.0).label("total_tax"),
        func.coalesce(func.sum(Order.total), 0.0).label("net_sales"),
        func.count(Order.id).label("total_orders"),
        func.coalesce(func.avg(Order.total), 0.0).label("avg_order_value")
    ).filter(
        Order.status == "Paid",
        Order.created_at >= range_start,
        Order.created_at <= range_end
    ).first()

    # Payment breakdown
    payments = db.query(
        Order.payment_method,
        func.coalesce(func.sum(Order.total), 0.0).label("amount")
    ).filter(
        Order.status == "Paid",
        Order.created_at >= range_start,
        Order.created_at <= range_end
    ).group_by(Order.payment_method).all()

    pay_dict = {"CASH": 0.0, "UPI": 0.0, "CARD": 0.0}
    for p in payments:
        m = (p.payment_method or "").upper()
        if m in pay_dict:
            pay_dict[m] = round(p.amount, 2)

    cancelled_count = db.query(func.count(Order.id)).filter(
        Order.status == "Cancelled",
        Order.created_at >= range_start,
        Order.created_at <= range_end
    ).scalar() or 0

    return {
        "range_type": range_type,
        "start_date": range_start.strftime("%Y-%m-%d"),
        "end_date": range_end.strftime("%Y-%m-%d"),
        "gross_sales": round(paid_summary.gross_sales, 2),
        "discounts": round(paid_summary.total_discounts, 2),
        "tax": round(paid_summary.total_tax, 2),
        "net_sales": round(paid_summary.net_sales, 2),
        "total_orders": paid_summary.total_orders,
        "avg_order_value": round(paid_summary.avg_order_value, 2),
        "cash_sales": pay_dict["CASH"],
        "upi_sales": pay_dict["UPI"],
        "card_sales": pay_dict["CARD"],
        "cancelled_orders": cancelled_count
    }


# ─────────────────────────────────────────────────────────────
# 3. DISCOUNT REPORT (Manager-only)
# ─────────────────────────────────────────────────────────────
@router.get("/reports/discounts")
def get_discount_report(
    range_type: str = Query("today", alias="range"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_manager)
):
    range_start, range_end = parse_date_range(range_type, start_date, end_date)

    orders_with_discount = db.query(Order).filter(
        Order.discount_amount > 0,
        Order.created_at >= range_start,
        Order.created_at <= range_end
    ).order_by(Order.created_at.desc()).all()

    result = []
    for o in orders_with_discount:
        result.append({
            "id": o.id,
            "bill_no": o.bill_no,
            "created_at": o.created_at,
            "subtotal": o.subtotal,
            "discount_type": o.discount_type,
            "discount_value": o.discount_value,
            "discount_amount": o.discount_amount,
            "discount_reason": o.discount_reason or "Promotion",
            "authorized_by_name": o.authorized_by_name or o.manager_name or "Manager",
            "cashier_name": o.cashier_name,
            "total": o.total,
            "status": o.status
        })

    return {
        "total_discount_amount": round(sum(o["discount_amount"] for o in result), 2),
        "discount_count": len(result),
        "discounts": result
    }


# ─────────────────────────────────────────────────────────────
# 4. PRODUCT PERFORMANCE REPORT
# ─────────────────────────────────────────────────────────────
@router.get("/reports/products")
def get_product_report(
    range_type: str = Query("today", alias="range"),
    sort_by: str = Query("quantity", pattern=r"^(quantity|revenue)$"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    range_start, range_end = parse_date_range(range_type, start_date, end_date)

    # Aggregation by product
    products_raw = db.query(
        OrderItem.product_name,
        func.coalesce(func.sum(OrderItem.quantity), 0).label("total_qty"),
        func.coalesce(func.sum(OrderItem.total_price), 0.0).label("total_revenue")
    ).join(Order).filter(
        Order.status == "Paid",
        Order.created_at >= range_start,
        Order.created_at <= range_end
    ).group_by(OrderItem.product_name).all()

    overall_revenue = sum(p.total_revenue for p in products_raw) or 1.0

    result = []
    for p in products_raw:
        result.append({
            "product_name": p.product_name,
            "quantity_sold": p.total_qty,
            "revenue": round(p.total_revenue, 2),
            "percentage": round((p.total_revenue / overall_revenue) * 100, 1)
        })

    # Sort
    if sort_by == "revenue":
        result.sort(key=lambda x: x["revenue"], reverse=True)
    else:
        result.sort(key=lambda x: x["quantity_sold"], reverse=True)

    return result


# ─────────────────────────────────────────────────────────────
# 5. VOIDS & CANCELLED ORDERS REPORT
# ─────────────────────────────────────────────────────────────
@router.get("/reports/voids")
def get_voids_report(
    range_type: str = Query("today", alias="range"),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    range_start, range_end = parse_date_range(range_type, start_date, end_date)

    cancelled_orders = db.query(Order).filter(
        Order.status == "Cancelled",
        Order.created_at >= range_start,
        Order.created_at <= range_end
    ).order_by(Order.created_at.desc()).all()

    return [
        {
            "id": o.id,
            "bill_no": o.bill_no,
            "created_at": o.created_at,
            "total": o.total,
            "cashier_name": o.cashier_name,
            "status": o.status
        }
        for o in cancelled_orders
    ]
