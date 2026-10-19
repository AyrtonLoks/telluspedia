import redis.asyncio as aioredis
from typing import Optional
from app.core.config import settings

redis_client: Optional[aioredis.Redis] = None

async def get_redis() -> Optional[aioredis.Redis]:
    global redis_client
    if redis_client is None:
        try:
            redis_client = aioredis.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
            await redis_client.ping()
        except Exception:
            redis_client = None
    return redis_client
