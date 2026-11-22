/** Órbita do cometa 1P/Halley (T36): elementos do JPL SBDB, posição e caminho orbital. */
import * as THREE from "three";
import { mapDistanceToSceneRadius, solveKeplerEquation } from "./kepler";
import { calculatePlanetaryPosition } from "./planet-orbits";

/**
 * 1P/Halley osculating orbital elements (JPL Small-Body Database, J2000 ecliptic, 1986 perihelion epoch).
 * Note: `argPerihelionDeg` (ω = 111.33249°) is already the argument of perihelion, NOT longitude of perihelion ϖ.
 */
export const HALLEY_ORBITAL_ELEMENTS = {
  semiMajorAxisAu: 17.834144,
  eccentricity: 0.9671429,
  inclinationDeg: 162.26269,
  ascendingNodeDeg: 58.42008,
  argPerihelionDeg: 111.33249,
  perihelionYear: 1986.1081, // 1986-02-09 ~11:00 UTC (JD 2446470.96)
  periodYears: 75.316,
} as const;

/** Heliocentric distance (AU) below which water-ice sublimation activates Halley's visible tails. */
export const HALLEY_TAIL_ACTIVATION_AU = 4.5;

export interface HalleyPosition {
  heliocentricAu: { x: number; y: number; z: number };
  distanceSunAu: number;
  distanceSunMkm: number;
  distanceEarthAu: number;
  distanceEarthMkm: number;
  meanAnomalyRad: number;
  scenePosition: THREE.Vector3;
  /** Unit vector in Three.js scene space pointing strictly anti-solar (ion tail axis). */
  tailDirection: THREE.Vector3;
  /** Unit vector in Three.js scene space along Halley's orbital velocity (dust tail curves toward -velocity). */
  orbitalVelocityDirection: THREE.Vector3;
  /** True only when heliocentric distance is below sublimation threshold (< HALLEY_TAIL_ACTIVATION_AU). */
  hasTail: boolean;
  /** Normalized outgassing activity in [0, 1], 0 beyond HALLEY_TAIL_ACTIVATION_AU and ~1 at perihelion. */
  activityFactor: number;
  /** Ion tail length in scene units (0 when inactive). */
  tailLength: number;
  /** Ion tail opacity in [0, 0.85] (0 when inactive). */
  tailOpacity: number;
  /** Dust tail length in scene units (0 when inactive). */
  dustTailLength: number;
  /** Dust tail opacity in [0, 0.65] (0 when inactive). */
  dustTailOpacity: number;
  /** Diffuse coma sprite radius in scene units. */
  comaRadius: number;
  /** Diffuse coma sprite opacity in [0, 1]. */
  comaOpacity: number;
  isPerihelionPassage: boolean;
}

export const DEG_TO_RAD = Math.PI / 180.0;
export const KM_PER_AU = 149597870.7;

export function getHalleyBasisVectors() {
  const I = HALLEY_ORBITAL_ELEMENTS.inclinationDeg * DEG_TO_RAD;
  const Omega = HALLEY_ORBITAL_ELEMENTS.ascendingNodeDeg * DEG_TO_RAD;
  const omega = HALLEY_ORBITAL_ELEMENTS.argPerihelionDeg * DEG_TO_RAD;

  const cosO = Math.cos(Omega);
  const sinO = Math.sin(Omega);
  const cosw = Math.cos(omega);
  const sinw = Math.sin(omega);
  const cosI = Math.cos(I);
  const sinI = Math.sin(I);

  return {
    Px: cosw * cosO - sinw * sinO * cosI,
    Py: cosw * sinO + sinw * cosO * cosI,
    Pz: sinw * sinI,
    Qx: -sinw * cosO - cosw * sinO * cosI,
    Qy: -sinw * sinO + cosw * cosO * cosI,
    Qz: cosw * sinI,
  };
}

/**
 * Computes 1P/Halley orbital position, heliocentric and Earth distances,
 * orbital velocity direction, coma intensity, and dual-tail parameters.
 */
export function calculateHalleyPosition(dateOrYear: Date | number): HalleyPosition {
  let decimalYear: number;
  if (typeof dateOrYear === "number") {
    decimalYear = dateOrYear;
  } else {
    const year = dateOrYear.getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1)).getTime();
    const end = new Date(Date.UTC(year + 1, 0, 1)).getTime();
    decimalYear = year + (dateOrYear.getTime() - start) / (end - start);
  }

  const a = HALLEY_ORBITAL_ELEMENTS.semiMajorAxisAu;
  const e = HALLEY_ORBITAL_ELEMENTS.eccentricity;
  const { Px, Py, Pz, Qx, Qy, Qz } = getHalleyBasisVectors();

  // Normalize mean anomaly strictly into [0, 2*PI) for any epoch (including years < 1986)
  const TWO_PI = 2 * Math.PI;
  const elapsed = decimalYear - HALLEY_ORBITAL_ELEMENTS.perihelionYear;
  const rawM = (((elapsed / HALLEY_ORBITAL_ELEMENTS.periodYears) * TWO_PI) % TWO_PI + TWO_PI) % TWO_PI;
  const meanAnomalyRad = rawM === 0 || rawM >= TWO_PI ? 0 : rawM;

  const E = solveKeplerEquation(meanAnomalyRad, e);
  const bFactor = Math.sqrt(Math.max(0, 1.0 - e * e));
  const xPrime = a * (Math.cos(E) - e);
  const yPrime = a * bFactor * Math.sin(E);
  const rAu = Math.sqrt(xPrime * xPrime + yPrime * yPrime);

  // Heliocentric ecliptic coordinates (AU)
  const xEcl = Px * xPrime + Qx * yPrime;
  const yEcl = Py * xPrime + Qy * yPrime;
  const zEcl = Pz * xPrime + Qz * yPrime;

  // Orbital velocity tangent (proportional to dr/dE since dE/dt > 0)
  const vxPrime = -Math.sin(E);
  const vyPrime = bFactor * Math.cos(E);
  const vxEcl = Px * vxPrime + Qx * vyPrime;
  const vyEcl = Py * vxPrime + Qy * vyPrime;
  const vzEcl = Pz * vxPrime + Qz * vyPrime;

  const sceneRadius = mapDistanceToSceneRadius(rAu);
  const scale = sceneRadius / rAu;
  const scenePos = new THREE.Vector3(xEcl * scale, zEcl * scale, -yEcl * scale);

  // Ion tail direction points strictly anti-solar (away from origin)
  const tailDirection = scenePos.clone().normalize();
  const orbitalVelocityDirection = new THREE.Vector3(vxEcl, vzEcl, -vyEcl).normalize();

  // True 3D Euclidean distance to Earth: |r_comet - r_Earth|
  const earth = calculatePlanetaryPosition("EARTH", dateOrYear);
  const dx = xEcl - earth.heliocentricAu.x;
  const dy = yEcl - earth.heliocentricAu.y;
  const dz = zEcl - earth.heliocentricAu.z;
  const distEarthAu = Math.sqrt(dx * dx + dy * dy + dz * dz);

  // Physical outgassing activity: visible tails only below ~4.5 AU, peaking at perihelion (~0.586 AU)
  const perihelionAu = a * (1.0 - e);
  const hasTail = rAu < HALLEY_TAIL_ACTIVATION_AU;
  const rawActivity = hasTail
    ? Math.min(1, Math.max(0, (HALLEY_TAIL_ACTIVATION_AU - rAu) / (HALLEY_TAIL_ACTIVATION_AU - perihelionAu)))
    : 0;
  const activityFactor = hasTail ? Math.pow(rawActivity, 1.35) : 0;

  const tailLength = hasTail ? Number((activityFactor * 18.0).toFixed(3)) : 0;
  const tailOpacity = hasTail ? Number((activityFactor * 0.92).toFixed(3)) : 0;
  const dustTailLength = hasTail ? Number((activityFactor * 13.5).toFixed(3)) : 0;
  const dustTailOpacity = hasTail ? Number((activityFactor * 0.78).toFixed(3)) : 0;
  // Sprite diameter (radius = comaRadius / 2) — always comfortably larger than nucleus diameter (~0.32)
  const comaRadius = Number((0.75 + activityFactor * 2.05).toFixed(3));
  const comaOpacity = Number((0.24 + activityFactor * 0.68).toFixed(3));

  const isPerihelionPassage = rAu <= 1.5;

  return {
    heliocentricAu: { x: xEcl, y: yEcl, z: zEcl },
    distanceSunAu: Number(rAu.toFixed(4)),
    distanceSunMkm: Number(((rAu * KM_PER_AU) / 1e6).toFixed(2)),
    distanceEarthAu: Number(distEarthAu.toFixed(4)),
    distanceEarthMkm: Number(((distEarthAu * KM_PER_AU) / 1e6).toFixed(2)),
    meanAnomalyRad,
    scenePosition: scenePos,
    tailDirection,
    orbitalVelocityDirection,
    hasTail,
    activityFactor: Number(activityFactor.toFixed(4)),
    tailLength,
    tailOpacity,
    dustTailLength,
    dustTailOpacity,
    comaRadius,
    comaOpacity,
    isPerihelionPassage,
  };
}

/**
 * Generates smooth 3D orbital trajectory loop for 1P/Halley.
 */
export function generateHalleyOrbitalPath(segments = 240): THREE.Vector3[] {
  const a = HALLEY_ORBITAL_ELEMENTS.semiMajorAxisAu;
  const e = HALLEY_ORBITAL_ELEMENTS.eccentricity;
  const { Px, Py, Pz, Qx, Qy, Qz } = getHalleyBasisVectors();

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
