"""
Migration — Phase 6 Portable Printer Configuration
Adds printer_enabled, printer_connection_type, printer_name to settings table.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine

MIGRATIONS = [
    ("printer_enabled",         "ALTER TABLE settings ADD COLUMN printer_enabled BOOLEAN DEFAULT 1"),
    ("printer_connection_type", "ALTER TABLE settings ADD COLUMN printer_connection_type VARCHAR(50) DEFAULT 'bluetooth_spp'"),
    ("printer_name",            "ALTER TABLE settings ADD COLUMN printer_name VARCHAR(100) DEFAULT 'CIE-DYNO-2F64'"),
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

    print("Portable printer migration complete.")

if __name__ == "__main__":
    run()
