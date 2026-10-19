import json
import httpx
from typing import Optional
from app.core.config import settings
from app.core.redis_client import get_redis
from app.domain.models.weather import WeatherResponse, CurrentWeather

class WeatherProxyService:
    @staticmethod
    async def get_current_weather(lat: float, lng: float) -> WeatherResponse:
        cache_key = f"weather:{round(lat, 2)}:{round(lng, 2)}"
        redis = await get_redis()

        if redis:
            try:
                cached_data = await redis.get(cache_key)
                if cached_data:
                    data = json.loads(cached_data)
                    data["cached"] = True
                    return WeatherResponse(**data)
            except Exception:
                pass

        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lng}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m"
        )

        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            raw = resp.json()

        current_raw = raw.get("current", {})
        weather_resp = WeatherResponse(
            latitude=lat,
            longitude=lng,
            current=CurrentWeather(
                temperature=current_raw.get("temperature_2m", 20.0),
                apparent_temperature=current_raw.get("apparent_temperature", 20.0),
                relative_humidity=current_raw.get("relative_humidity_2m", 50.0),
                precipitation=current_raw.get("precipitation", 0.0),
                weather_code=current_raw.get("weather_code", 0),
                wind_speed=current_raw.get("wind_speed_10m", 5.0),
            ),
            cached=False,
        )

        if redis:
            try:
                await redis.setex(
                    cache_key,
                    settings.WEATHER_CACHE_TTL_SECONDS,
                    weather_resp.model_dump_json(),
                )
            except Exception:
                pass

        return weather_resp
