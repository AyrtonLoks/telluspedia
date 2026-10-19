from pydantic import BaseModel
from datetime import datetime

class SubsolarPoint(BaseModel):
    timestamp: datetime
    subsolar_latitude: float
    subsolar_longitude: float
    equation_of_time_minutes: float
    declination_degrees: float

class LunarPosition(BaseModel):
    timestamp: datetime
    phase_name: str
    illumination_fraction: float
    lunar_distance_km: float
