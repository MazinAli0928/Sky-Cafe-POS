import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import init_app_storage, setup_app_logging

storage_info = init_app_storage()
DATABASE_PATH = storage_info["db_path"]

# If production AppData db does not exist yet, check if dev cafe_pos.db exists and copy it over
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEV_DB_PATH = os.path.join(BASE_DIR, "cafe_pos.db")

if not os.path.exists(DATABASE_PATH) and os.path.exists(DEV_DB_PATH):
    import shutil
    try:
        shutil.copy2(DEV_DB_PATH, DATABASE_PATH)
        print(f"[+] Initialized production database from dev database: {DATABASE_PATH}")
    except Exception as exc:
        print(f"[!] Database copy failed: {exc}")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
