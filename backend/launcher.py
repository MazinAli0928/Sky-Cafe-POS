"""
SKY CAFE POS — Standalone Application Launcher
Starts local FastAPI backend + SPA static files on http://127.0.0.1:8000 and opens app window.
"""
import os
import sys
import time
import webbrowser
import threading
import multiprocessing
import traceback
import uvicorn

# Set current working directory to backend root
_HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(_HERE)

from app.core.config import setup_app_logging, APP_NAME, APP_VERSION
from app.main import app

logger = setup_app_logging()

def open_browser():
    time.sleep(1.5)
    try:
        webbrowser.open("http://127.0.0.1:8000/")
    except Exception as e:
        logger.error(f"Failed to open browser: {e}")

def main():
    logger.info(f"Starting {APP_NAME} v{APP_VERSION} standalone server...")
    
    # Launch browser thread
    threading.Thread(target=open_browser, daemon=True).start()

    try:
        # Pass FastAPI app instance directly (required for PyInstaller frozen executables)
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=8000,
            log_level="error",
            access_log=False,
            log_config=None
        )
    except Exception as e:
        logger.critical(f"Unhandled error in main application: {e}\n{traceback.format_exc()}")
        raise

if __name__ == "__main__":
    multiprocessing.freeze_support()
    
    # Fix PyInstaller --windowed mode sys.stdout/sys.stderr being None
    if sys.stdout is None:
        sys.stdout = open(os.devnull, "w")
    if sys.stderr is None:
        sys.stderr = open(os.devnull, "w")
        
    main()
