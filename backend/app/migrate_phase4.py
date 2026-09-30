"""
Phase 4 Database Migration — Safe, idempotent.
Creates the 'users' table if it does not exist.
Adds Phase 4 columns to 'orders' if they don't already exist.
Does NOT drop any existing data.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import sqlite3
from app.database import DATABASE_PATH

# Use the path directly
db_path = DATABASE_PATH


def column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    columns = [row[1] for row in cursor.fetchall()]
    return column in columns


def table_exists(cursor, table: str) -> bool:
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
    return cursor.fetchone() is not None


def run_migration():
    print(f"Connecting to database: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Create 'users' table if it doesn't exist
        if not table_exists(cursor, "users"):
            print("Creating 'users' table...")
            cursor.execute("""
                CREATE TABLE users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) NOT NULL,
                    username VARCHAR(50) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(20) NOT NULL DEFAULT 'CASHIER',
                    is_active BOOLEAN NOT NULL DEFAULT 1,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    last_login DATETIME
                )
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS ix_users_username ON users (username)")
            print("  [OK] 'users' table created.")
        else:
            print("  [SKIP] 'users' table already exists.")

        # 2. Add Phase 4 columns to 'orders' table
        orders_columns_to_add = [
            ("cashier_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
            ("cashier_name", "VARCHAR(100) NOT NULL DEFAULT 'System'"),
            ("authorized_by_user_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
            ("authorized_by_name", "VARCHAR(100)"),
            ("authorized_at", "DATETIME"),
        ]

        for col_name, col_def in orders_columns_to_add:
            if not column_exists(cursor, "orders", col_name):
                print(f"  Adding column 'orders.{col_name}'...")
                cursor.execute(f"ALTER TABLE orders ADD COLUMN {col_name} {col_def}")
                print(f"  [OK] 'orders.{col_name}' added.")
            else:
                print(f"  [SKIP] 'orders.{col_name}' already exists.")

        conn.commit()
        print("\nPhase 4 migration completed successfully.")

    except Exception as e:
        conn.rollback()
        print(f"Migration failed: {e}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    run_migration()
