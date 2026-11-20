import asyncio
import logging
import warnings
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.core import redis_client
from app.core.config import Settings
from app.main import app
from app.services.weather_proxy_service import WeatherProxyService

client = TestClient(app)


def test_settings_uses_pydantic_v2_config_without_deprecation_warnings():
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        cfg = Settings(ALLOWED_ORIGINS="https://telluspedia.org, http://localhost:3000")

    assert cfg.ALLOWED_ORIGINS == ["https://telluspedia.org", "http://localhost:3000"]
    assert cfg.CORS_ALLOW_CREDENTIALS is False
    deprecation_msgs = [str(w.message) for w in caught if issubclass(w.category, DeprecationWarning)]
    assert not deprecation_msgs, f"Unexpected deprecation warnings: {deprecation_msgs}"


def test_settings_rejects_wildcard_cors_origin():
    with pytest.raises(ValueError, match="Wildcard"):
        Settings(ALLOWED_ORIGINS="*")


def test_cors_allows_configured_origin_without_credentials_and_blocks_unknown_origin():
    allowed = client.options(
        "/api/v1/weather",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert allowed.headers.get("access-control-allow-credentials") is None

    disallowed = client.options(
        "/api/v1/weather",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert disallowed.headers.get("access-control-allow-origin") is None


def test_health_endpoint_returns_healthy():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "telluspedia-data-pipeline"}


def test_weather_endpoint_logs_detail_and_returns_generic_502(monkeypatch, caplog):
    fail = AsyncMock(side_effect=RuntimeError("secret upstream host 10.0.0.5 refused"))
    monkeypatch.setattr(WeatherProxyService, "get_current_weather", fail)

    with caplog.at_level(logging.ERROR, logger="app.api.endpoints.weather"):
        response = client.get("/api/v1/weather", params={"lat": -15.79, "lng": -47.88})

    assert response.status_code == 502
    assert response.json() == {"detail": "Weather fetch failed"}
    assert "10.0.0.5" not in response.text
    assert any("Upstream weather fetch failed" in rec.message for rec in caplog.records)


def test_astronomy_endpoint_rejects_invalid_iso_timestamp():
    response = client.get("/api/v1/astronomy/solar-subpoint", params={"dt": "not-a-date"})
    assert response.status_code == 400


def test_redis_backoff_suppresses_repeated_reconnects_for_30s(monkeypatch):
    redis_client.reset_redis_state()
    clock = {"now": 100.0}
    monkeypatch.setattr(redis_client.time, "monotonic", lambda: clock["now"])

    attempts = {"count": 0}
    should_fail = {"value": True}

    class FakeRedis:
        def __init__(self):
            self.closed = False

        async def ping(self):
            if should_fail["value"]:
                raise ConnectionError("Redis down")
            return True

        async def aclose(self):
            self.closed = True

    def fake_from_url(*args, **kwargs):
        attempts["count"] += 1
        return FakeRedis()

    monkeypatch.setattr(redis_client.aioredis, "from_url", fake_from_url)

    async def scenario():
        # First attempt fails and activates 30s backoff
        assert await redis_client.get_redis() is None
        assert attempts["count"] == 1

        # Subsequent calls inside the 30s window skip reconnect entirely
        clock["now"] = 110.0
        assert await redis_client.get_redis() is None
        clock["now"] = 129.9
        assert await redis_client.get_redis() is None
        assert attempts["count"] == 1

        # Once backoff expires, reconnect is retried and succeeds
        should_fail["value"] = False
        clock["now"] = 130.1
        conn = await redis_client.get_redis()
        assert conn is not None
        assert attempts["count"] == 2

    try:
        asyncio.run(scenario())
    finally:
        redis_client.reset_redis_state()
