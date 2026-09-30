@echo off
TITLE CAFE POS — Application Launcher
COLOR 0A

echo ===================================================
echo             CAFE POS SYSTEM LAUNCHER               
echo ===================================================
echo.

:: 1. Check Python installation
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH!
    echo Please install Python 3.11+ to run the backend.
    pause
    exit /b 1
)

:: 2. Check Node.js installation
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js to run the frontend.
    pause
    exit /b 1
)

:: 3. Seed database if not present
if not exist "backend\cafe_pos.db" (
    echo [INFO] SQLite database not found. Initializing database and running migrations...
    cd backend
    python app/migrate_phase4.py
    python app/seed.py
    cd ..
    echo [INFO] Database initialized successfully!
    echo.
)

:: 4. Start FastAPI Backend Server
echo [1/3] Starting FastAPI Backend Server on http://localhost:8000 ...
start "Cafe POS Backend API" cmd /k "cd /d %~dp0backend && uvicorn app.main:app --reload --port 8000"

:: 5. Start Vite Frontend Server
echo [2/3] Starting Vite Frontend Server on http://localhost:5173 ...
start "Cafe POS Frontend Shell" cmd /k "cd /d %~dp0 && npm run dev"

:: 6. Wait & Open Browser
echo [3/3] Waiting for servers to initialize...
timeout /t 3 /nobreak >nul

echo Opening CAFE POS in default web browser...
start http://localhost:5173

echo.
echo ===================================================
echo CAFE POS IS NOW RUNNING!
echo - Frontend: http://localhost:5173
echo - Backend API: http://localhost:8000
echo - Swagger Docs: http://localhost:8000/docs
echo.
echo Leave the server windows open while using the application.
echo ===================================================
echo.
pause
