from fastapi import APIRouter
from app.api.endpoints import astronomy, weather

api_router = APIRouter()
api_router.include_router(astronomy.router, prefix="/astronomy", tags=["Astronomy"])
api_router.include_router(weather.router, prefix="/weather", tags=["Weather"])
