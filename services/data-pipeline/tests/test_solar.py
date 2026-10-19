from datetime import datetime, timezone
from app.services.solar_service import SolarService

def test_equinox_solar_declination():
    # Around March 20 (equinox), solar declination should be close to 0 degrees
    dt = datetime(2026, 3, 20, 12, 0, 0, tzinfo=timezone.utc)
    res = SolarService.calculate_subsolar_point(dt)
    assert abs(res.subsolar_latitude) < 2.5
    # Near 12:00 UTC, longitude should be near 0 degrees
    assert abs(res.subsolar_longitude) < 5.0

def test_summer_solstice_solar_declination():
    # Around June 21 (solstice), solar declination should be near +23.4 degrees
    dt = datetime(2026, 6, 21, 12, 0, 0, tzinfo=timezone.utc)
    res = SolarService.calculate_subsolar_point(dt)
    assert 22.0 < res.subsolar_latitude < 24.0

def test_winter_solstice_solar_declination():
    # Around Dec 21 (solstice), solar declination should be near -23.4 degrees
    dt = datetime(2026, 12, 21, 12, 0, 0, tzinfo=timezone.utc)
    res = SolarService.calculate_subsolar_point(dt)
    assert -24.0 < res.subsolar_latitude < -22.0
