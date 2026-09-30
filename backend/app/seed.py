import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import engine, SessionLocal, Base
from app.models.category import Category
from app.models.product import Product
from app.models.settings import CafeSettings
from app.models.user import User

def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Categories
        categories_data = [
            {"name": "Fries", "description": "Crispy salted and seasoned french fries"},
            {"name": "Snacks", "description": "Quick bites and cheese shots"},
            {"name": "Chicken", "description": "Fried chicken strips, popcorn, and cuts"},
            {"name": "Drinks", "description": "Hot and cold coffee, tea, and beverages"},
            {"name": "Desserts", "description": "Cakes, lava cake, and brownies"}
        ]

        category_map = {}
        for cat_info in categories_data:
            cat = db.query(Category).filter(Category.name == cat_info["name"]).first()
            if not cat:
                cat = Category(
                    name=cat_info["name"],
                    description=cat_info["description"],
                    is_active=True
                )
                db.add(cat)
                db.flush()
                print(f"Created category: {cat.name}")
            category_map[cat.name] = cat.id

        db.commit()

        # 2. Seed Products
        products_data = [
            {"name": "French Fries", "price": 99.0, "category_name": "Fries", "sku": "FRY-01", "description": "Crispy golden potato fries salted to perfection"},
            {"name": "Peri Peri French Fries", "price": 109.0, "category_name": "Fries", "sku": "FRY-02", "description": "Spicy peri peri tossed crispy potato fries"},
            {"name": "Potato Cheese Shots", "price": 149.0, "category_name": "Snacks", "sku": "SNK-01", "description": "Melted cheese filled crispy potato bite shots"},
            {"name": "Tandoori Nuggets", "price": 109.0, "category_name": "Snacks", "sku": "SNK-02", "description": "Spicy tandoori seasoned vegetarian nuggets"},
            {"name": "Veg Cuts", "price": 109.0, "category_name": "Snacks", "sku": "SNK-03", "description": "Savory mixed vegetable fried cutlets"},
            {"name": "Chicken Tandoori Popcorn", "price": 149.0, "category_name": "Chicken", "sku": "CHK-01", "description": "Bite-sized tandoori marinated crispy chicken popcorn"},
            {"name": "Chicken Strips", "price": 149.0, "category_name": "Chicken", "sku": "CHK-02", "description": "Tender boneless chicken strips fried until golden"},
            {"name": "Chicken Cuts", "price": 149.0, "category_name": "Chicken", "sku": "CHK-03", "description": "Juicy fried chicken chunks with signature seasoning"},
            {"name": "Cold Coffee", "price": 129.0, "category_name": "Drinks", "sku": "DRK-01", "description": "Rich blended iced espresso with creamy milk"},
            {"name": "Iced Peach Tea", "price": 99.0, "category_name": "Drinks", "sku": "DRK-02", "description": "Refreshing brewed black tea infused with sweet peach"},
            {"name": "Chocolate Lava Cake", "price": 139.0, "category_name": "Desserts", "sku": "DST-01", "description": "Warm chocolate cake with gooey molten chocolate center"},
            {"name": "Sizzling Brownie", "price": 179.0, "category_name": "Desserts", "sku": "DST-02", "description": "Rich chocolate brownie served with vanilla ice cream"}
        ]

        for prod_info in products_data:
            existing = db.query(Product).filter(Product.name == prod_info["name"]).first()
            if not existing:
                cat_id = category_map[prod_info["category_name"]]
                prod = Product(
                    name=prod_info["name"],
                    category_id=cat_id,
                    price=prod_info["price"],
                    tax_rate=0.0,
                    sku=prod_info["sku"],
                    description=prod_info["description"],
                    is_available=True
                )
                db.add(prod)
                print(f"Created product: {prod.name} (Rs. {prod.price})")

        db.commit()

        # 3. Seed Default Cafe Settings
        settings = db.query(CafeSettings).first()
        if not settings:
            settings = CafeSettings(
                cafe_name="SKY CAFE",
                tagline="MYSORE",
                address="Mysore, Karnataka",
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
                starting_bill_number=1024
            )
            db.add(settings)
            db.commit()
            print("Created default Cafe Settings.")

        # 4. Seed Default Users (idempotent)
        # Import here to avoid circular import issues at module load time
        from app.core.security import hash_password

        default_users = [
            {
                "name": "Manager",
                "username": "manager",
                "password": "ChangeMe123!",
                "role": "MANAGER"
            },
            {
                "name": "Cashier",
                "username": "cashier",
                "password": "ChangeMe123!",
                "role": "CASHIER"
            }
        ]

        for u_info in default_users:
            existing_user = db.query(User).filter(User.username == u_info["username"]).first()
            if not existing_user:
                user = User(
                    name=u_info["name"],
                    username=u_info["username"],
                    password_hash=hash_password(u_info["password"]),
                    role=u_info["role"],
                    is_active=True
                )
                db.add(user)
                print(f"Created user: {u_info['username']} ({u_info['role']})")

        db.commit()

        print("Database seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Seeding error: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
