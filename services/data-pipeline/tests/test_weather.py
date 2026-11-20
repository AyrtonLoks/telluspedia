from unittest.mock import AsyncMock

import httpx

from app.domain.models.weather import WeatherResponse
from app.services import weather_proxy_service
from app.services.weather_proxy_service import WeatherProxyService
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_weather_model_validation():
    sample = {
        "latitude": -15.79,
        "longitude": -47.88,
        "current": {
            "temperature": 24.5,
            "apparent_temperature": 25.1,
            "relative_humidity": 60.0,
            "precipitation": 0.0,
            "weather_code": 1,
            "wind_speed": 12.0,
        },
        "cached": False,
    }
    resp = WeatherResponse(**sample)
    assert resp.latitude == -15.79
    assert resp.longitude == -47.88
    assert resp.current.temperature == 24.5
    assert resp.current.relative_humidity == 60.0
    assert resp.cached is False

def test_weather_endpoint_invalid_coordinates():
    # Latitude out of bounds (> 90)
    response = client.get("/api/v1/weather?lat=95.0&lng=0.0")
    assert response.status_code == 400

    # Longitude out of bounds (> 180)
    response = client.get("/api/v1/weather?lat=0.0&lng=190.0")
    assert response.status_code == 400

    # Missing parameters
    response = client.get("/api/v1/weather")
    assert response.status_code == 422



def test_weather_endpoint_preserves_missing_measurements(monkeypatch):
    redis = AsyncMock()
    redis.get.return_value = None
    monkeypatch.setattr(weather_proxy_service, "get_redis", AsyncMock(return_value=redis))

    async def upstream(_client, url, *, params):
        assert url == "https://api.open-meteo.com/v1/forecast"
        assert params["latitude"] == 0
        assert params["longitude"] == -47.88
        return httpx.Response(
            200,
            request=httpx.Request("GET", url, params=params),
            json={"current": {"temperature_2m": None, "precipitation": 0, "wind_speed_10m": 12}},
        )

    monkeypatch.setattr(httpx.AsyncClient, "get", upstream)
    response = client.get("/api/v1/weather", params={"lat": 0, "lng": -47.88})

    assert response.status_code == 200
    assert response.json()["current"] == {
        "temperature": None,
        "apparent_temperature": None,
        "relative_humidity": None,
        "precipitation": 0,
        "weather_code": None,
        "wind_speed": 12,
    }
    redis.get.assert_awaited_once_with("weather:v2:0.0:-47.88")
    assert redis.setex.await_args.args[0] == "weather:v2:0.0:-47.88"


def test_weather_endpoint_hides_upstream_error(monkeypatch):
    fail = AsyncMock(side_effect=RuntimeError("Internal upstream failure"))
    monkeypatch.setattr(WeatherProxyService, "get_current_weather", fail)
    response = client.get("/api/v1/weather", params={"lat": 0, "lng": 0})

    assert response.status_code == 502
    assert response.json() == {"detail": "Weather fetch failed"}
