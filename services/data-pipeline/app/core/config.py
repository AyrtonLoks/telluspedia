from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "TellusPedia Data & Astronomy Pipeline"
    API_V1_STR: str = "/api/v1"
    DATABASE_URL: str = "postgresql://telluspedia:telluspedia_secret@localhost:5432/telluspedia_db"
    REDIS_URL: str = "redis://localhost:6379/0"
    WEATHER_CACHE_TTL_SECONDS: int = 900  # 15 minutes

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
