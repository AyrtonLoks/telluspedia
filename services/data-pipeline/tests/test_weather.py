from app.domain.models.weather import WeatherResponse, CurrentWeather
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
