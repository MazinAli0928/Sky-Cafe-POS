"""
SKY CAFE POS — Standalone Application Launcher
Starts local FastAPI backend + SPA static files and opens app in default browser.
Supports automatic port detection, duplicate process handling, and windowed execution.
"""
import os
import sys
import time
import socket
import urllib.request
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

def is_port_in_use(port: int) -> bool:
    """Check if a local TCP port is currently in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def is_sky_cafe_running(port: int) -> bool:
    """Check if SKY CAFE POS backend is already active on the given port."""
    try:
        url = f"http://127.0.0.1:{port}/api/health"
        req = urllib.request.Request(url, headers={'User-Agent': 'SKY-CAFE-Launcher'})
        with urllib.request.urlopen(req, timeout=1.5) as resp:
            if resp.status == 200:
                body = resp.read().decode('utf-8')
                return "status" in body and "ok" in body
    except Exception:
        pass
    return False

def find_available_port(candidate_ports=(8000, 8001, 8002, 8080, 8888)) -> int:
    """Find an available port starting from candidates or random available port."""
    for p in candidate_ports:
        if not is_port_in_use(p):
            return p
    
    # Fallback to OS auto-assigned port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def open_browser(port: int):
    """Wait for server to start, then open the POS interface in default browser."""
    target_url = f"http://127.0.0.1:{port}/"
    for _ in range(20):
        time.sleep(0.3)
        if is_port_in_use(port):
            break
    try:
        webbrowser.open(target_url)
    except Exception as e:
        logger.error(f"Failed to open browser: {e}")

def main():
    logger.info(f"Starting {APP_NAME} v{APP_VERSION} standalone server...")
    
    # Check if POS application is already running on port 8000
    for test_port in (8000, 8001, 8002):
        if is_sky_cafe_running(test_port):
            logger.info(f"SKY Cafe POS is already running on port {test_port}. Opening browser window...")
            webbrowser.open(f"http://127.0.0.1:{test_port}/")
            sys.exit(0)

    # Find free port for FastAPI uvicorn server
    chosen_port = find_available_port()
    logger.info(f"Selected port {chosen_port} for backend server.")

    # Launch browser thread
    threading.Thread(target=open_browser, args=(chosen_port,), daemon=True).start()

    try:
        uvicorn.run(
            app,
            host="127.0.0.1",
            port=chosen_port,
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
