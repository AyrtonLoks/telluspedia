import math
from datetime import datetime, timezone
from app.domain.models.astronomy import SubsolarPoint

class SolarService:
    @staticmethod
    def calculate_subsolar_point(dt: datetime | None = None) -> SubsolarPoint:
        if dt is None:
            dt = datetime.now(timezone.utc)
        elif dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)

        # Day of year and decimal UTC hour
        day_of_year = dt.timetuple().tm_yday
        hour_utc = dt.hour + dt.minute / 60.0 + dt.second / 3600.0 + dt.microsecond / 3600000000.0

        # Fractional year in radians
        gamma = 2.0 * math.pi / 365.0 * (day_of_year - 1.0 + (hour_utc - 12.0) / 24.0)

        # NOAA Equation of Time (minutes)
        eqtime = 229.18 * (
            0.000075
            + 0.001868 * math.cos(gamma)
            - 0.032077 * math.sin(gamma)
            - 0.014615 * math.cos(2.0 * gamma)
            - 0.040849 * math.sin(2.0 * gamma)
        )

        # NOAA Solar Declination (radians)
        decl = (
            0.006918
            - 0.399912 * math.cos(gamma)
            + 0.070257 * math.sin(gamma)
            - 0.006758 * math.cos(2.0 * gamma)
            + 0.000907 * math.sin(2.0 * gamma)
            - 0.002697 * math.cos(3.0 * gamma)
            + 0.001480 * math.sin(3.0 * gamma)
        )
        decl_deg = math.degrees(decl)

        # Subsolar longitude (degrees):
        # 15 degrees per hour from solar noon (12:00 UTC) with equation of time offset
        time_offset = hour_utc - 12.0 + (eqtime / 60.0)
        subsolar_lng = -15.0 * time_offset

        # Normalize to [-180, 180]
        subsolar_lng = ((subsolar_lng + 180.0) % 360.0 + 360.0) % 360.0 - 180.0

        return SubsolarPoint(
            timestamp=dt,
            subsolar_latitude=round(decl_deg, 4),
            subsolar_longitude=round(subsolar_lng, 4),
            equation_of_time_minutes=round(eqtime, 3),
            declination_degrees=round(decl_deg, 4),
        )
