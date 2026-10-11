"""
Database Migration: Live Table Orders & Table Configuration
- Adds table_no, order_type, opened_at, updated_at, opened_by_user_id, opened_by_name to orders
- Adds table_count, table_prefix to settings
- Creates partial unique index uq_active_table_order to prevent duplicate active orders for the same table
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

ORDER_MIGRATIONS = [
    ("table_no", "ALTER TABLE orders ADD COLUMN table_no INTEGER"),
    ("order_type", "ALTER TABLE orders ADD COLUMN order_type VARCHAR(20) DEFAULT 'counter'"),
    ("opened_at", "ALTER TABLE orders ADD COLUMN opened_at TIMESTAMP"),
    ("updated_at", "ALTER TABLE orders ADD COLUMN updated_at TIMESTAMP"),
    ("opened_by_user_id", "ALTER TABLE orders ADD COLUMN opened_by_user_id INTEGER"),
    ("opened_by_name", "ALTER TABLE orders ADD COLUMN opened_by_name VARCHAR(100)"),
]

SETTINGS_MIGRATIONS = [
    ("table_count", "ALTER TABLE settings ADD COLUMN table_count INTEGER DEFAULT 12"),
    ("table_prefix", "ALTER TABLE settings ADD COLUMN table_prefix VARCHAR(20) DEFAULT 'T-'"),
]

def run():
    print("[*] Running Live Table Order migration...")
    with engine.connect() as conn:
        # 1. Migrate orders table
        result = conn.execute(text("PRAGMA table_info(orders)"))
        order_cols = [row[1] for row in result]
        for col_name, alter_sql in ORDER_MIGRATIONS:
            if col_name not in order_cols:
                conn.execute(text(alter_sql))
                conn.commit()
                print(f"  [+] orders: Added column {col_name}")
            else:
                print(f"  [=] orders: Column {col_name} already exists")

        # 2. Migrate settings table
        result = conn.execute(text("PRAGMA table_info(settings)"))
        settings_cols = [row[1] for row in result]
        for col_name, alter_sql in SETTINGS_MIGRATIONS:
            if col_name not in settings_cols:
                conn.execute(text(alter_sql))
                conn.commit()
                print(f"  [+] settings: Added column {col_name}")
            else:
                print(f"  [=] settings: Column {col_name} already exists")

        # 3. Create partial unique index to prevent duplicate active table orders
        conn.execute(text("""
            CREATE UNIQUE INDEX IF NOT EXISTS uq_active_table_order
            ON orders (table_no)
            WHERE table_no IS NOT NULL AND status IN ('OPEN', 'READY_FOR_CHECKOUT');
        """))
        conn.commit()
        print("  [+] Created / verified partial unique index uq_active_table_order")

    print("[+] Live Table Order migration completed successfully.")

if __name__ == "__main__":
    run()
