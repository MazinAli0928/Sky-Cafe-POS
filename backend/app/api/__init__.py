from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.categories import router as categories_router
from app.api.products import router as products_router
from app.api.settings import router as settings_router
from app.api.orders import router as orders_router
from app.api.discounts import router as discounts_router
from app.api.analytics import router as analytics_router
from app.api.backup import router as backup_router
from app.api.printer import router as printer_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(categories_router)
api_router.include_router(products_router)
api_router.include_router(settings_router)
api_router.include_router(orders_router)
api_router.include_router(discounts_router)
api_router.include_router(analytics_router)
api_router.include_router(backup_router)
api_router.include_router(printer_router)
