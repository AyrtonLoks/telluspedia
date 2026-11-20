from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from app.services.solar_service import SolarService
from app.domain.models.astronomy import SubsolarPoint

router = APIRouter()


@router.get("/solar-subpoint", response_model=SubsolarPoint)
def get_solar_subpoint(
    dt: str | None = Query(None, description="ISO timestamp (ex: 2026-10-19T12:00:00Z)"),
):
    parsed_dt = None
    if dt:
        try:
            parsed_dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail="Invalid 'dt' timestamp. Expected ISO 8601 format.",
            ) from exc
    return SolarService.calculate_subsolar_point(parsed_dt)
