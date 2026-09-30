import os
import sys
import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings, setup_app_logging, APP_NAME, APP_VERSION
from app.database import engine, Base
from app.api import api_router
from app.seed import seed_database
from app.database import SessionLocal

# Setup persistent logging to %LOCALAPPDATA%\SKY Cafe POS\logs\app.log
setup_app_logging()

# Auto-create tables on startup
Base.metadata.create_all(bind=engine)

# Seed initial users & settings if empty
try:
    seed_database()
except Exception as e:
    logging.warning(f"Database seed notice: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    openapi_url="/api/openapi.json"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API endpoints under /api
app.include_router(api_router, prefix="/api")

# Global unhandled exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact system administrator."}
    )

# Static frontend assets serving (Vite build dist)
_HERE = os.path.dirname(os.path.abspath(__file__))
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    DIST_DIR = os.path.join(sys._MEIPASS, "dist")
else:
    DIST_DIR = os.path.normpath(os.path.join(_HERE, "..", "..", "dist"))

if os.path.exists(DIST_DIR):
    logging.info(f"Serving production frontend SPA from: {DIST_DIR}")
    
    # Mount assets folder
    assets_dir = os.path.join(DIST_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    # Serve index.html for all non-API SPA routes
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Don't intercept /api calls
        if full_path.startswith("api/"):
            return JSONResponse(status_code=404, content={"detail": "API route not found"})
        
        target_file = os.path.join(DIST_DIR, full_path)
        if os.path.isfile(target_file):
            return FileResponse(target_file)
        
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return JSONResponse(status_code=404, content={"detail": "Frontend index.html missing"})
else:
    @app.get("/")
    def root():
        return {
            "application": APP_NAME,
            "version": APP_VERSION,
            "status": "Running backend development server",
            "health": "/api/health"
        }
