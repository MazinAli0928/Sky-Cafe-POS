# CAFE POS — Production-Grade Cafe Billing & POS System

A commercial-grade Cafe Billing & POS application featuring a React + Vite + Tailwind CSS frontend shell and a Python FastAPI + SQLAlchemy + SQLite backend.

---

## 🛠️ Stack Overview

- **Frontend**: React 19, Vite, Tailwind CSS v4, React Router v7, Lucide React icons, Recharts
- **Backend**: Python 3.12+, FastAPI, SQLAlchemy ORM, SQLite, Pydantic v2, Uvicorn
- **Database**: SQLite (`backend/cafe_pos.db`)

---

## 🚀 Quick Start Guide

### 1. Start FastAPI Backend & Database
```bash
# Navigate to backend directory
cd backend

# Install Python requirements
pip install -r requirements.txt

# Initialize & seed SQLite database (idempotent)
python -m app.seed

# Start FastAPI Uvicorn Server on port 8000
uvicorn app.main:app --reload --port 8000
```
Backend API will be running at: `http://localhost:8000`  
Interactive API Documentation: `http://localhost:8000/docs`

---

### 2. Start React Frontend
```bash
# In project root directory
npm install

# Start Vite Development Server
npm run dev
```
Frontend application will be running at: `http://localhost:5173`

---

## 📂 Project Architecture

```
cafe-pos/
├── backend/
│   ├── app/
│   │   ├── api/             # Health, Categories, Products, and Settings routers
│   │   ├── core/            # Config & CORS setup
│   │   ├── models/          # Category, Product, Settings SQLAlchemy ORM models
│   │   ├── schemas/         # Pydantic validation schemas
│   │   ├── database.py      # SQLite engine & session setup
│   │   ├── main.py          # FastAPI entrypoint
│   │   └── seed.py          # Database seeding script
│   ├── cafe_pos.db          # SQLite database file
│   └── requirements.txt
├── src/
│   ├── components/          # Reusable UI & Layout components
│   ├── config/              # Centralized theme tokens
│   ├── context/             # Cart, Settings, and Toast contexts
│   ├── pages/               # POS, Dashboard, Products, Categories, Reports, Settings
│   └── services/api.js      # Frontend API integration service
├── .env.example
└── README.md
```

---

## ⚡ API Endpoints Summary

- **Health Check**: `GET /api/health`
- **Categories**: `GET /api/categories`, `POST /api/categories`, `PUT /api/categories/{id}`, `DELETE /api/categories/{id}`, `PATCH /api/categories/{id}/status`
- **Products**: `GET /api/products?search=&category_id=&is_available=`, `POST /api/products`, `PUT /api/products/{id}`, `DELETE /api/products/{id}`, `PATCH /api/products/{id}/status`
- **Settings**: `GET /api/settings`, `PUT /api/settings`
