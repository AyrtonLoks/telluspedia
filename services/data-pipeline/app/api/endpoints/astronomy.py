from fastapi import APIRouter, Query
from datetime import datetime
from app.services.solar_service import SolarService
from app.domain.models.astronomy import SubsolarPoint

router = APIRouter()

@router.get("/solar-subpoint", response_model=SubsolarPoint)
def get_solar_subpoint(dt: str | None = Query(None, description="ISO timestamp (ex: 2026-10-19T12:00:00Z)")):
    parsed_dt = None
    if dt:
        parsed_dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
    return SolarService.calculate_subsolar_point(parsed_dt)
