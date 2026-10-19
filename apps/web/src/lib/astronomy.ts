import * as THREE from "three";

export interface SubsolarPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
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

  const declinationDeg = (decl * 180.0) / Math.PI;

  // Subsolar longitude: 15 degrees per hour from solar noon (12:00 UTC)
  const timeOffset = hourUtc - 12.0 + eqtime / 60.0;
  let subsolarLng = -15.0 * timeOffset;
  subsolarLng = ((subsolarLng + 180.0) % 360.0 + 360.0) % 360.0 - 180.0;

  return {
    latitude: Number(declinationDeg.toFixed(4)),
    longitude: Number(subsolarLng.toFixed(4)),
    timestamp: utcDate.toISOString(),
  };
}

/**
 * Converts Subsolar Latitude and Longitude to a normalized 3D Vector in Three.js coordinate space.
 * Aligns strictly with Three.js SphereGeometry:
 * x = -(sin(phi) * cos(theta))
 * y = cos(phi)
 * z = sin(phi) * sin(theta)
 */
export function getSunDirectionVector(lat: number, lng: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(Math.sin(phi) * Math.cos(theta));
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z).normalize();
}

/**
 * Computes lunar illumination and orbit position angle.
 */
export function getLunarPhase(date: Date = new Date()) {
  // Known reference new moon: 2000-01-06 18:14 UTC
  const refNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14)).getTime();
  const synodicMonthMs = 29.53058867 * 24 * 60 * 60 * 1000;
  const elapsed = date.getTime() - refNewMoon;
  const phaseCycle = ((elapsed % synodicMonthMs) + synodicMonthMs) % synodicMonthMs;
  const phaseFraction = phaseCycle / synodicMonthMs; // 0 to 1

  let phaseName = "Nova";
  if (phaseFraction < 0.03 || phaseFraction > 0.97) phaseName = "Lua Nova";
  else if (phaseFraction < 0.22) phaseName = "Crescente Inicial";
  else if (phaseFraction < 0.28) phaseName = "Quarto Crescente";
  else if (phaseFraction < 0.47) phaseName = "Gibosa Crescente";
  else if (phaseFraction < 0.53) phaseName = "Lua Cheia";
  else if (phaseFraction < 0.72) phaseName = "Gibosa Minguante";
  else if (phaseFraction < 0.78) phaseName = "Quarto Minguante";
  else phaseName = "Minguante Final";

  // Illumination fraction (0 to 1)
  const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * phaseFraction));

  return {
    phaseFraction,
    phaseName,
    illumination: Math.round(illumination * 100) / 100,
  };
}
