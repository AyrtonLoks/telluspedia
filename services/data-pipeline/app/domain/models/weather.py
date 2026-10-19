from pydantic import BaseModel
from typing import Optional

class CurrentWeather(BaseModel):
    temperature: float
    apparent_temperature: float
    relative_humidity: float
    precipitation: float
    weather_code: int
    wind_speed: float

class WeatherResponse(BaseModel):
    latitude: float
    longitude: float
    current: CurrentWeather
    cached: bool = False
