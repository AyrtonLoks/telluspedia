from fastapi import APIRouter, Query, HTTPException
from app.services.weather_proxy_service import WeatherProxyService
from app.domain.models.weather import WeatherResponse

router = APIRouter()

@router.get("", response_model=WeatherResponse)
async def get_weather(
    lat: float = Query(..., description="Latitude between -90 and 90"),
    lng: float = Query(..., description="Longitude between -180 and 180"),
):
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lng <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid coordinates range.")
    try:
        return await WeatherProxyService.get_current_weather(lat, lng)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Weather service upstream error: {str(e)}")
