/**
 * Pure-trigonometry NOAA solar subsolar-point calculation.
 * Kept free of Three.js imports so non-WebGL modules (e.g. SGP4 satellite
 * day/night classification in `satellites.ts`) never pull `three` into
 * non-3D initial client chunks (T25).
 */

export interface SubsolarPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

const RAD_TO_DEG = 180 / Math.PI;

function normalizeDeg180(deg: number): number {
  return ((deg + 180) % 360 + 360) % 360 - 180;
}

export function calculateSubsolarPoint(date: Date = new Date()): SubsolarPoint {
  const utcDate = new Date(date.toISOString());
  const startOfYear = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const dayOfYear = Math.floor((utcDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const hourUtc =
    utcDate.getUTCHours() +
    utcDate.getUTCMinutes() / 60.0 +
    utcDate.getUTCSeconds() / 3600.0;

  // Fractional year in radians
  const gamma = (2.0 * Math.PI / 365.0) * (dayOfYear - 1.0 + (hourUtc - 12.0) / 24.0);

  // NOAA Equation of Time (minutes)
  const eqtime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2.0 * gamma) -
      0.040849 * Math.sin(2.0 * gamma));

  // NOAA Solar Declination (radians)
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2.0 * gamma) +
    0.000907 * Math.sin(2.0 * gamma) -
    0.002697 * Math.cos(3.0 * gamma) +
    0.001480 * Math.sin(3.0 * gamma);

  const declinationDeg = decl * RAD_TO_DEG;

  // Subsolar longitude: 15 degrees per hour from solar noon (12:00 UTC)
  const timeOffset = hourUtc - 12.0 + eqtime / 60.0;
  const subsolarLng = normalizeDeg180(-15.0 * timeOffset);

  return {
    latitude: Number(declinationDeg.toFixed(4)),
    longitude: Number(subsolarLng.toFixed(4)),
    timestamp: utcDate.toISOString(),
  };
}
