/** Posições e órbitas dos planetas por efemérides keplerianas (T36). */
import * as THREE from "three";
import type { CelestialBodyId } from "./celestial-bodies";
import { bodySceneRadius } from "./cosmic-scale";
import { ASTROPHYSICAL_CATALOG, KEPLERIAN_DATA, type PlanetaryPosition } from "./astronomy-catalog";
import { mapDistanceToSceneRadius, solveKeplerEquation } from "./kepler";

/**
 * Calculates the heliocentric ecliptic coordinates and 3D scene position
 * for a planet on a given decimal year or Date.
 */
export function calculatePlanetaryPosition(
  bodyId: Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">,
  dateOrYear: Date | number
): PlanetaryPosition {
  const elements = KEPLERIAN_DATA[bodyId];
  const meta = ASTROPHYSICAL_CATALOG[bodyId];

  let decimalYear: number;
  if (typeof dateOrYear === "number") {
    decimalYear = dateOrYear;
  } else {
    const year = dateOrYear.getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1)).getTime();
    const end = new Date(Date.UTC(year + 1, 0, 1)).getTime();
    const frac = (dateOrYear.getTime() - start) / (end - start);
    decimalYear = year + frac;
  }

  // Centuries from J2000.0 (January 1, 2000, 12:00 TT)
  const T = (decimalYear - 2000.0) / 100.0;

  // Compute osculating elements at epoch T
  const a = elements.a0 + elements.aRate * T;
  const e = elements.e0 + elements.eRate * T;
  const I = (elements.I0 + elements.IRate * T) * (Math.PI / 180.0);
  const L = (elements.L0 + elements.LRate * T) * (Math.PI / 180.0);
  const varpi = (elements.varpi0 + elements.varpiRate * T) * (Math.PI / 180.0);
  const Omega = (elements.Omega0 + elements.OmegaRate * T) * (Math.PI / 180.0);

  const omega = varpi - Omega; // Argument of perihelion
  const M = L - varpi; // Mean anomaly

  // Solve Kepler's equation for Eccentric Anomaly E
  const E = solveKeplerEquation(M, e);

  // Position in orbital plane
  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * Math.sqrt(Math.max(0, 1.0 - e * e)) * Math.sin(E);

  const rAu = Math.sqrt(xPrime * xPrime + yPrime * yPrime);
  const trueAnomalyRad = Math.atan2(yPrime, xPrime);
  const trueAnomalyDeg = ((trueAnomalyRad * 180.0) / Math.PI + 360.0) % 360.0;

  // Rotate orbital coordinates into heliocentric ecliptic coordinates
  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosw = Math.cos(omega);
  const sinw = Math.sin(omega);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  // Basis vectors
  const Px = cosw * cosO - sinw * sinO * cosI;
  const Py = cosw * sinO + sinw * cosO * cosI;
  const Pz = sinw * sinI;

  const Qx = -sinw * cosO - cosw * sinO * cosI;
  const Qy = -sinw * sinO + cosw * cosO * cosI;
  const Qz = cosw * sinI;

  const xEcl = Px * xPrime + Qx * yPrime;
  const yEcl = Py * xPrime + Qy * yPrime;
  const zEcl = Pz * xPrime + Qz * yPrime;

  // Convert to Three.js coordinate space with power-law scale:
  // Scene coordinates: X = xEcl, Y = zEcl (ecliptic latitude), Z = -yEcl
  const sceneRadius = mapDistanceToSceneRadius(rAu);
  const scale = sceneRadius / rAu;

  const scenePos = new THREE.Vector3(xEcl * scale, zEcl * scale, -yEcl * scale);

  // Distances
  const kmPerAu = 149597870.7;
  const distanceSunMkm = Number(((rAu * kmPerAu) / 1e6).toFixed(2));

  return {
    id: bodyId,
    name: meta.name,
    namePt: meta.namePt,
    heliocentricAu: { x: xEcl, y: yEcl, z: zEcl },
    distanceSunAu: Number(rAu.toFixed(4)),
    distanceSunMkm,
    distanceEarthAu: 0, // computed below in computeAllPlanetaryPositions
    distanceEarthMkm: 0,
    trueAnomalyDeg: Number(trueAnomalyDeg.toFixed(2)),
    scenePosition: scenePos,
    visualRadius: bodySceneRadius(meta.equatorialRadiusKm, "visual"),
    color: meta.visualColor,
  };
}

/**
 * Computes all 8 planets + Pluto positions at once, linking Earth distance to each body.
 */
export function computeAllPlanetaryPositions(
  dateOrYear: Date | number
): Record<Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">, PlanetaryPosition> {
  const planetIds: Array<Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">> = [
    "MERCURY",
    "VENUS",
    "EARTH",
    "MARS",
    "JUPITER",
    "SATURN",
    "URANUS",
    "NEPTUNE",
    "PLUTO",
  ];

  const results = {} as Record<
    Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">,
    PlanetaryPosition
  >;

  for (const id of planetIds) {
    results[id] = calculatePlanetaryPosition(id, dateOrYear);
  }

  const earth = results.EARTH;
  const kmPerAu = 149597870.7;

  for (const id of planetIds) {
    const p = results[id];
    const dx = p.heliocentricAu.x - earth.heliocentricAu.x;
    const dy = p.heliocentricAu.y - earth.heliocentricAu.y;
    const dz = p.heliocentricAu.z - earth.heliocentricAu.z;
    const distAu = Math.sqrt(dx * dx + dy * dy + dz * dz);
    p.distanceEarthAu = Number(distAu.toFixed(4));
    p.distanceEarthMkm = Number(((distAu * kmPerAu) / 1e6).toFixed(2));
  }

  return results;
}

/**
 * Generates smooth 3D Keplerian orbital loop points for a given planet.
 */
export function generateOrbitalPathPoints(
  bodyId: Exclude<CelestialBodyId, "SUN" | "MOON" | "HALLEY">,
  segments = 180,
  referenceYear = 2000
): THREE.Vector3[] {
  const elements = KEPLERIAN_DATA[bodyId];
  const T = (referenceYear - 2000.0) / 100.0;

  const a = elements.a0 + elements.aRate * T;
  const e = elements.e0 + elements.eRate * T;
  const I = (elements.I0 + elements.IRate * T) * (Math.PI / 180.0);
  const varpi = (elements.varpi0 + elements.varpiRate * T) * (Math.PI / 180.0);
  const Omega = (elements.Omega0 + elements.OmegaRate * T) * (Math.PI / 180.0);
  const omega = varpi - Omega;

  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosw = Math.cos(omega);
  const sinw = Math.sin(omega);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  const Px = cosw * cosO - sinw * sinO * cosI;
  const Py = cosw * sinO + sinw * cosO * cosI;
  const Pz = sinw * sinI;

  const Qx = -sinw * cosO - cosw * sinO * cosI;
  const Qy = -sinw * sinO + cosw * cosO * cosI;
  const Qz = cosw * sinI;

  const b = a * Math.sqrt(Math.max(0, 1.0 - e * e));
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * 2 * Math.PI;
    const xPrime = a * (Math.cos(theta) - e);
    const yPrime = b * Math.sin(theta);
    const rAu = Math.sqrt(xPrime * xPrime + yPrime * yPrime);

    const xEcl = Px * xPrime + Qx * yPrime;
    const yEcl = Py * xPrime + Qy * yPrime;
    const zEcl = Pz * xPrime + Qz * yPrime;

    const sceneRadius = mapDistanceToSceneRadius(rAu);
    const scale = sceneRadius / rAu;

    points.push(new THREE.Vector3(xEcl * scale, zEcl * scale, -yEcl * scale));
  }

  return points;
}
