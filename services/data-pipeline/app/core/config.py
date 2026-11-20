from typing import Annotated, Any
from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


class Settings(BaseSettings):
    PROJECT_NAME: str = "TellusPedia Data & Astronomy Pipeline"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://telluspedia:telluspedia_secret@localhost:5432/telluspedia_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    WEATHER_CACHE_TTL_SECONDS: int = 900  # 15 minutes
    REDIS_RECONNECT_BACKOFF_SECONDS: float = 30.0
    REDIS_SOCKET_TIMEOUT_SECONDS: float = 1.5
    ALLOWED_ORIGINS: Annotated[list[str], NoDecode] = DEFAULT_ALLOWED_ORIGINS.copy()
    CORS_ALLOW_CREDENTIALS: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> list[str]:
        if value is None:
            return DEFAULT_ALLOWED_ORIGINS.copy()
        if isinstance(value, str):
            raw_items = [item.strip() for item in value.split(",")]
        elif isinstance(value, (list, tuple, set)):
            raw_items = [str(item).strip() for item in value]
        else:
            raise ValueError("ALLOWED_ORIGINS must be a comma-separated string or list of origins.")

        origins = [origin for origin in raw_items if origin]
        if any(origin == "*" for origin in origins):
            raise ValueError("Wildcard '*' is not permitted in ALLOWED_ORIGINS.")
        return origins or DEFAULT_ALLOWED_ORIGINS.copy()


settings = Settings()
