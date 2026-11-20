import json
import httpx
from app.core.config import settings
from app.core.redis_client import get_redis
from app.domain.models.weather import WeatherResponse, CurrentWeather

class WeatherProxyService:
    @staticmethod
    async def get_current_weather(lat: float, lng: float) -> WeatherResponse:
        # Refresh entries from before the provider timestamp was stored.
        cache_key = f"weather:v3:{round(lat, 2)}:{round(lng, 2)}"
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

        params = {
            "latitude": lat,
            "longitude": lng,
            "timeformat": "unixtime",
            "current": (
                "temperature_2m,relative_humidity_2m,apparent_temperature,"
                "precipitation,weather_code,wind_speed_10m"
            ),
        }

        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get("https://api.open-meteo.com/v1/forecast", params=params)
            resp.raise_for_status()
            raw = resp.json()

        current_raw = raw.get("current") or {}
        weather_resp = WeatherResponse(
            latitude=lat,
            longitude=lng,
            current=CurrentWeather(
                temperature=current_raw.get("temperature_2m"),
                apparent_temperature=current_raw.get("apparent_temperature"),
                relative_humidity=current_raw.get("relative_humidity_2m"),
                precipitation=current_raw.get("precipitation"),
                weather_code=current_raw.get("weather_code"),
                wind_speed=current_raw.get("wind_speed_10m"),
                reference_time=current_raw.get("time"),
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
