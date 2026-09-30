"""
Migration — Phase 6
Adds printer configuration columns to the settings table.
Safe: checks before altering (idempotent).
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

MIGRATIONS = [
    ("printer_port",     "ALTER TABLE settings ADD COLUMN printer_port VARCHAR(20) DEFAULT 'COM8'"),
    ("printer_baudrate", "ALTER TABLE settings ADD COLUMN printer_baudrate INTEGER DEFAULT 9600"),
    ("printer_auto_cut", "ALTER TABLE settings ADD COLUMN printer_auto_cut BOOLEAN DEFAULT 1"),
]

def run():
    with engine.connect() as conn:
        result = conn.execute(text("PRAGMA table_info(settings)"))
        existing_cols = [row[1] for row in result]

        for col_name, alter_sql in MIGRATIONS:
            if col_name not in existing_cols:
                conn.execute(text(alter_sql))
                conn.commit()
                print(f"  [+] Added column: {col_name}")
            else:
                print(f"  [=] Column already exists: {col_name}")

    print("Phase 6 migration complete.")

if __name__ == "__main__":
    run()
