import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, Base
from app.models import Order, OrderItem

def run_migration():
    print("Running discount database migration...")
    # Base.metadata.create_all creates 'orders' and 'order_items' tables if missing
    Base.metadata.create_all(bind=engine)
    print("Migration finished cleanly.")

if __name__ == "__main__":
    run_migration()
