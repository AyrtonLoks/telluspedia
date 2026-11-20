import logging
import time
from typing import Optional
import redis.asyncio as aioredis
from app.core.config import settings

logger = logging.getLogger(__name__)

redis_client: Optional[aioredis.Redis] = None
_next_retry_at: float = 0.0


def mark_redis_unavailable(now: Optional[float] = None) -> None:
    """Clear the cached client and suppress reconnect attempts during the backoff window."""
    global redis_client, _next_retry_at
    redis_client = None
    current = time.monotonic() if now is None else now
    _next_retry_at = current + settings.REDIS_RECONNECT_BACKOFF_SECONDS


def reset_redis_state() -> None:
    """Reset module-level client and backoff timer (intended for tests and lifecycle hooks)."""
    global redis_client, _next_retry_at
    redis_client = None
    _next_retry_at = 0.0


async def get_redis() -> Optional[aioredis.Redis]:
    global redis_client, _next_retry_at
    if redis_client is not None:
        return redis_client

    now = time.monotonic()
    if now < _next_retry_at:
        return None

    candidate: Optional[aioredis.Redis] = None
    try:
        candidate = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=settings.REDIS_SOCKET_TIMEOUT_SECONDS,
            socket_timeout=settings.REDIS_SOCKET_TIMEOUT_SECONDS,
        )
        await candidate.ping()
        redis_client = candidate
        _next_retry_at = 0.0
    except Exception as exc:
        if candidate is not None:
            try:
                await candidate.aclose()
            except Exception:
                pass
        mark_redis_unavailable(now=now)
        logger.warning(
            "Redis unavailable; backing off reconnect for %.0fs: %s",
            settings.REDIS_RECONNECT_BACKOFF_SECONDS,
            exc,
        )

    return redis_client
