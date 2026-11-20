from pydantic import BaseModel

class CurrentWeather(BaseModel):
    temperature: float | None = None
    apparent_temperature: float | None = None
    relative_humidity: float | None = None
    precipitation: float | None = None
    weather_code: int | None = None
    wind_speed: float | None = None
    reference_time: int | None = None

class WeatherResponse(BaseModel):
    latitude: float
    longitude: float
    current: CurrentWeather
    cached: bool = False
