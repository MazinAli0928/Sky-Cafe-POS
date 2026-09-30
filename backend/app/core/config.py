"""
App Configuration & Path Management
Supports portable packaging and persistent data storage in %LOCALAPPDATA%\\SKY Cafe POS\\
"""
import os
import sys
import logging
from typing import List

APP_NAME = "SKY Cafe POS"
APP_VERSION = "1.0.0"

class AppSettings:
    PROJECT_NAME: str = APP_NAME
    PROJECT_VERSION: str = APP_VERSION
    API_V1_STR: str = "/api"
    CORS_ORIGINS: List[str] = ["*"]

settings = AppSettings()

def get_app_dir() -> str:
    """
    Returns the persistent application directory in %LOCALAPPDATA%\\SKY Cafe POS\\.
    If LOCALAPPDATA environment variable is missing, falls back to user home directory.
    """
    local_app_data = os.getenv("LOCALAPPDATA")
    if not local_app_data:
        local_app_data = os.path.expanduser("~")
    
    app_dir = os.path.join(local_app_data, "SKY Cafe POS")
    return app_dir

def init_app_storage() -> dict:
    """
    Ensures required directories exist in %LOCALAPPDATA%\\SKY Cafe POS\\:
    - data/
    - config/
    - logs/
    - backups/
    """
    app_dir = get_app_dir()
    data_dir = os.path.join(app_dir, "data")
    config_dir = os.path.join(app_dir, "config")
    logs_dir = os.path.join(app_dir, "logs")
    backups_dir = os.path.join(app_dir, "backups")

    for d in [app_dir, data_dir, config_dir, logs_dir, backups_dir]:
        os.makedirs(d, exist_ok=True)

    db_path = os.path.join(data_dir, "cafe.db")
    log_file = os.path.join(logs_dir, "app.log")

    return {
        "app_dir": app_dir,
        "data_dir": data_dir,
        "config_dir": config_dir,
        "logs_dir": logs_dir,
        "backups_dir": backups_dir,
        "db_path": db_path,
        "log_file": log_file,
    }

def setup_app_logging():
    """Sets up file logging to %LOCALAPPDATA%\\SKY Cafe POS\\logs\\app.log."""
    storage = init_app_storage()
    log_file = storage["log_file"]

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

    logging.info(f"{APP_NAME} v{APP_VERSION} starting up...")
    logging.info(f"Data directory: {storage['data_dir']}")
    logging.info(f"Database path: {storage['db_path']}")

    return logger
