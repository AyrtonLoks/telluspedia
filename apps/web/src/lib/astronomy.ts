import * as THREE from "three";

export interface SubsolarPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

/** Mean real Earth–Moon center-to-center distance in km (IAU/JPL). */
export const MOON_MEAN_DISTANCE_KM = 384400;

/**
 * Compressed didactic Earth–Moon scene radius (in Earth radii).
 * Real mean distance is ~60.27 R⊕, which sits outside Earth-view camera framing;
 * TellusPedia compresses the mean orbit to 3.622 R⊕ (modulated by true lunar
 * perigee/apogee eccentricity, ~3.36–3.83 R⊕) while preserving the exact 3D
 * astronomical direction from Meeus Ch. 47.
 */
export const MOON_SCENE_ORBIT_RADIUS = 3.622;

/** Historical Apollo 11 Eagle touchdown timestamp (Mare Tranquillitatis). */
export const APOLLO11_LANDING_DATE = new Date("1969-07-20T20:17:40Z");

/**
 * Canonical UTC reference calendar date used for historical years without an exact date:
 * June 21, 12:00 UTC (Northern Summer Solstice at Prime Meridian solar noon).
 * Documented in docs/ARCHITECTURE.md (§2.2) for deterministic, balanced global daylight.
 */
export const YEAR_ONLY_REFERENCE_MONTH_UTC = 5; // 0-indexed: June
export const YEAR_ONLY_REFERENCE_DAY_UTC = 21;
export const YEAR_ONLY_REFERENCE_HOUR_UTC = 12;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function normalizeDeg360(deg: number): number {
  const m = ((deg % 360) + 360) % 360;
  return m === 360 ? 0 : m;
}

function normalizeDeg180(deg: number): number {
  return ((deg + 180) % 360 + 360) % 360 - 180;
}

/**
 * Converts a JS Date (UTC) to Julian Day (JD).
 * Reference: J2000.0 (2000-01-01T12:00:00Z) = 2451545.0.
 */
export function dateToJulianDay(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
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

/**
 * Converts Subsolar (or Sublunar) Latitude and Longitude to a normalized 3D Vector
 * in Three.js Earth-fixed coordinate space.
 * Aligns strictly with Three.js SphereGeometry (AGENTS.md §1):
 * x = -(sin(phi) * cos(theta))
 * y = cos(phi)
 * z = sin(phi) * sin(theta)
 */
export function getSunDirectionVector(lat: number, lng: number): THREE.Vector3 {
  const phi = (90 - lat) * DEG_TO_RAD;
  const theta = (lng + 180) * DEG_TO_RAD;

  const x = -(Math.sin(phi) * Math.cos(theta));
  const y = Math.cos(phi);
  const z = Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z).normalize();
}

/**
 * Meeus, Astronomical Algorithms (2nd ed.), Chapter 47, Table 47.A:
 * Principal periodic terms for lunar longitude Σl (1e-6 deg) and distance Σr (0.001 km).
 * Columns: [D, M, M', F, coeff_l, coeff_r]
 */
const MEEUS_LUNAR_LR_TERMS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [0, 0, 1, 0, 6288774, -20905355],
  [2, 0, -1, 0, 1274027, -3699111],
  [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925],
  [0, 1, 0, 0, -185116, 48888],
  [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158],
  [2, -1, -1, 0, 57066, -152138],
  [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586],
  [0, 1, -1, 0, -40923, -129620],
  [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755],
  [2, 0, 0, -2, 15327, 10321],
  [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661],
  [4, 0, -1, 0, 10675, -34782],
  [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636],
  [2, 1, -1, 0, -7888, 24208],
  [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379],
  [1, 1, 0, 0, 4987, -16675],
  [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445],
  [4, 0, 0, 0, 3861, -11650],
  [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003],
  [2, 0, -1, 2, -2602, 0],
  [2, -1, -2, 0, 2390, 10056],
];

/**
 * Meeus, Astronomical Algorithms (2nd ed.), Chapter 47, Table 47.B:
 * Principal periodic terms for lunar ecliptic latitude Σb (1e-6 deg).
 * Columns: [D, M, M', F, coeff_b]
 */
const MEEUS_LUNAR_B_TERMS: ReadonlyArray<readonly [number, number, number, number, number]> = [
  [0, 0, 0, 1, 5128122],
  [0, 0, 1, 1, 280602],
  [0, 0, 1, -1, 277693],
  [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413],
  [2, 0, -1, -1, 46271],
  [2, 0, 0, 1, 32573],
  [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266],
  [0, 0, 2, -1, 8822],
  [2, -1, 0, -1, 8216],
  [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200],
  [2, 1, 0, -1, -3359],
  [2, -1, -1, 1, 2463],
  [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065],
  [0, 1, -1, -1, -1870],
  [4, 0, -1, -1, 1828],
  [0, 1, 0, 1, -1794],
];

export interface LunarPosition {
  /** Geocentric ecliptic longitude λ (degrees in [0, 360)). */
  eclipticLongitudeDeg: number;
  /** Geocentric ecliptic latitude β (degrees in [-90, 90]). */
  eclipticLatitudeDeg: number;
  /** Geocentric right ascension α (degrees in [0, 360)). */
  rightAscensionDeg: number;
  /** Geocentric declination δ (degrees in [-90, 90]). */
  declinationDeg: number;
  /** Geocentric Earth–Moon center-to-center distance (km). */
  distanceKm: number;
  /** Sublunar geographic latitude (degrees, equals declination δ). */
  sublunarLatitude: number;
  /** Sublunar geographic longitude (degrees in [-180, 180], equals α - GMST). */
  sublunarLongitude: number;
  /** Sun–Moon ecliptic elongation λ_Moon - λ_Sun (degrees in [0, 360)). */
  elongationDeg: number;
  /** Illuminated fraction in [0, 1]. */
  illumination: number;
  /** Unit direction vector in TellusPedia Earth-fixed Three.js space. */
  earthFixedDirection: THREE.Vector3;
  /** Unit direction vector in TellusPedia Cosmic ecliptic Three.js space (X=xEcl, Y=zEcl, Z=-yEcl). */
  eclipticDirection: THREE.Vector3;
  /** Compressed Earth-fixed scene position relative to Earth center (radius ~3.36–3.83 R⊕). */
  scenePosition: THREE.Vector3;
  /** Compressed Cosmic ecliptic scene position relative to Earth center. */
  cosmicRelativePosition: THREE.Vector3;
  /** ISO UTC timestamp used for computation. */
  timestamp: string;
}

/**
 * Computes the geocentric astronomical position of the Moon for a given UTC Date
 * using Meeus (Astronomical Algorithms, Chapter 47) truncated periodic series
 * (accuracy < 0.03° in longitude/latitude, < 100 km in distance).
 */
export function calculateLunarPosition(date: Date = new Date()): LunarPosition {
  const jd = dateToJulianDay(date);
  const T = (jd - 2451545.0) / 36525.0;
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Fundamental arguments (degrees)
  const Lp = normalizeDeg360(
    218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000
  );
  const D = normalizeDeg360(
    297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000
  );
  const M = normalizeDeg360(
    357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000
  );
  const Mp = normalizeDeg360(
    134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000
  );
  const F = normalizeDeg360(
    93.2720950 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000
  );

  // Additive planetary / flattening arguments (degrees)
  const A1 = normalizeDeg360(119.75 + 131.849 * T);
  const A2 = normalizeDeg360(53.09 + 479264.290 * T);
  const A3 = normalizeDeg360(313.45 + 481266.484 * T);

  const E = 1.0 - 0.002516 * T - 0.0000074 * T2;
  const E2 = E * E;

  let sumL = 0;
  let sumR = 0;
  for (const [d, m, mp, f, cl, cr] of MEEUS_LUNAR_LR_TERMS) {
    const arg = (d * D + m * M + mp * Mp + f * F) * DEG_TO_RAD;
    const eMult = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E2 : 1;
    sumL += cl * eMult * Math.sin(arg);
    sumR += cr * eMult * Math.cos(arg);
  }
  sumL +=
    3958 * Math.sin(A1 * DEG_TO_RAD) +
    1962 * Math.sin((Lp - F) * DEG_TO_RAD) +
    318 * Math.sin(A2 * DEG_TO_RAD);

  let sumB = 0;
  for (const [d, m, mp, f, cb] of MEEUS_LUNAR_B_TERMS) {
    const arg = (d * D + m * M + mp * Mp + f * F) * DEG_TO_RAD;
    const eMult = Math.abs(m) === 1 ? E : Math.abs(m) === 2 ? E2 : 1;
    sumB += cb * eMult * Math.sin(arg);
  }
  sumB +=
    -2235 * Math.sin(Lp * DEG_TO_RAD) +
    382 * Math.sin(A3 * DEG_TO_RAD) +
    175 * Math.sin((A1 - F) * DEG_TO_RAD) +
    175 * Math.sin((A1 + F) * DEG_TO_RAD) +
    127 * Math.sin((Lp - Mp) * DEG_TO_RAD) -
    115 * Math.sin((Lp + Mp) * DEG_TO_RAD);

  const eclipticLongitudeDeg = normalizeDeg360(Lp + sumL / 1e6);
  const eclipticLatitudeDeg = sumB / 1e6;
  const distanceKm = 385000.56 + sumR / 1000;

  // Mean obliquity of the ecliptic (Meeus Eq. 22.2)
  const epsRad =
    (23.4392911 - 0.013004167 * T - 1.63889e-7 * T2 + 5.03611e-7 * T3) * DEG_TO_RAD;
  const lamRad = eclipticLongitudeDeg * DEG_TO_RAD;
  const betRad = eclipticLatitudeDeg * DEG_TO_RAD;

  // Geocentric equatorial coordinates (RA, Dec)
  const raDeg = normalizeDeg360(
    Math.atan2(
      Math.sin(lamRad) * Math.cos(epsRad) - Math.tan(betRad) * Math.sin(epsRad),
      Math.cos(lamRad)
    ) * RAD_TO_DEG
  );
  const sinDec = Math.max(
    -1,
    Math.min(1, Math.sin(betRad) * Math.cos(epsRad) + Math.cos(betRad) * Math.sin(epsRad) * Math.sin(lamRad))
  );
  const decDeg = Math.asin(sinDec) * RAD_TO_DEG;

  // Greenwich Mean Sidereal Time (Meeus Eq. 12.4)
  const gmstDeg = normalizeDeg360(
    280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T2 - T3 / 38710000
  );
  const sublunarLatitude = decDeg;
  const sublunarLongitude = normalizeDeg180(raDeg - gmstDeg);

  // Apparent solar ecliptic longitude (Meeus Ch. 25, ~0.01° accuracy) for true phase/elongation
  const L0 = normalizeDeg360(280.46646 + 36000.76983 * T + 0.0003032 * T2);
  const sunCenter =
    (1.914602 - 0.004817 * T - 0.000014 * T2) * Math.sin(M * DEG_TO_RAD) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * DEG_TO_RAD) +
    0.000289 * Math.sin(3 * M * DEG_TO_RAD);
  const sunLonDeg = normalizeDeg360(L0 + sunCenter);
  const elongationDeg = normalizeDeg360(eclipticLongitudeDeg - sunLonDeg);

  // Geocentric phase illumination fraction
  const cosElongation = Math.cos(betRad) * Math.cos(elongationDeg * DEG_TO_RAD);
  const illumination = Math.max(0, Math.min(1, 0.5 * (1 - cosElongation)));

  // 3D directions in Earth-fixed geographic space and Cosmic ecliptic space
  const earthFixedDirection = getSunDirectionVector(sublunarLatitude, sublunarLongitude);
  const cosB = Math.cos(betRad);
  const xEcl = cosB * Math.cos(lamRad);
  const yEcl = cosB * Math.sin(lamRad);
  const zEcl = Math.sin(betRad);
  const eclipticDirection = new THREE.Vector3(xEcl, zEcl, -yEcl).normalize();

  // Compressed scene radius modulated by true perigee/apogee eccentricity
  const compressedRadius = MOON_SCENE_ORBIT_RADIUS * (distanceKm / MOON_MEAN_DISTANCE_KM);
  const scenePosition = earthFixedDirection.clone().multiplyScalar(compressedRadius);
  const cosmicRelativePosition = eclipticDirection.clone().multiplyScalar(compressedRadius);

  return {
    eclipticLongitudeDeg: Number(eclipticLongitudeDeg.toFixed(4)),
    eclipticLatitudeDeg: Number(eclipticLatitudeDeg.toFixed(4)),
    rightAscensionDeg: Number(raDeg.toFixed(4)),
    declinationDeg: Number(decDeg.toFixed(4)),
    distanceKm: Number(distanceKm.toFixed(1)),
    sublunarLatitude: Number(sublunarLatitude.toFixed(4)),
    sublunarLongitude: Number(sublunarLongitude.toFixed(4)),
    elongationDeg: Number(elongationDeg.toFixed(2)),
    illumination: Number(illumination.toFixed(4)),
    earthFixedDirection,
    eclipticDirection,
    scenePosition,
    cosmicRelativePosition,
    timestamp: date.toISOString(),
  };
}

/**
 * Convenience helper returning the Moon's compressed 3D scene position relative to Earth
 * in Earth-fixed ("earth") or Cosmic ecliptic ("cosmic") coordinates.
 */
export function getMoonScenePosition(
  date: Date = new Date(),
  mode: "earth" | "cosmic" = "earth"
): THREE.Vector3 {
  const lunar = calculateLunarPosition(date);
  return mode === "cosmic" ? lunar.cosmicRelativePosition : lunar.scenePosition;
}

/**
 * Computes lunar illumination and phase from true astronomical Sun–Moon elongation (Meeus Ch. 47).
 */
export function getLunarPhase(date: Date = new Date()) {
  const lunar = calculateLunarPosition(date);
  const phaseFraction = lunar.elongationDeg / 360;

  let phaseName = "Lua Nova";
  if (phaseFraction < 0.03 || phaseFraction > 0.97) phaseName = "Lua Nova";
  else if (phaseFraction < 0.22) phaseName = "Crescente Inicial";
  else if (phaseFraction < 0.28) phaseName = "Quarto Crescente";
  else if (phaseFraction < 0.47) phaseName = "Gibosa Crescente";
  else if (phaseFraction < 0.53) phaseName = "Lua Cheia";
  else if (phaseFraction < 0.72) phaseName = "Gibosa Minguante";
  else if (phaseFraction < 0.78) phaseName = "Quarto Minguante";
  else phaseName = "Minguante Final";

  return {
    phaseFraction,
    phaseName,
    illumination: Math.round(lunar.illumination * 100) / 100,
  };
}

/**
 * Resolves the canonical UTC astronomical Date from the active TellusPedia epoch state
 * (Apollo 11 historical landing > milestone exactDate > milestone year > selectedYear > now).
 */
export function resolveAstronomicalDate(input: {
  selectedYear?: number | null;
  selectedMilestoneExactDate?: string | null;
  selectedMilestoneYear?: number | null;
  activeScene?: string | null;
  now?: Date;
}): Date {
  const now = input.now ?? new Date();

  // Explicit Apollo 11 scene always locks to the exact touchdown timestamp (1969-07-20T20:17:40Z)
  // so OrbitingMoon and Apollo11Trajectory stay 100% synchronized (never diverging by date-only 12:00Z).
  if (input.activeScene === "APOLLO11") {
    return new Date(APOLLO11_LANDING_DATE.getTime());
  }

  if (input.selectedMilestoneExactDate) {
    const raw = input.selectedMilestoneExactDate;
    const parsed = new Date(raw.includes("T") ? raw : `${raw}T12:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  if (typeof input.selectedMilestoneYear === "number" && Number.isFinite(input.selectedMilestoneYear)) {
    return new Date(
      Date.UTC(
        Math.trunc(input.selectedMilestoneYear),
        YEAR_ONLY_REFERENCE_MONTH_UTC,
        YEAR_ONLY_REFERENCE_DAY_UTC,
        YEAR_ONLY_REFERENCE_HOUR_UTC,
        0,
        0
      )
    );
  }

  if (typeof input.selectedYear === "number" && Number.isFinite(input.selectedYear)) {
    const wholeYear = Math.floor(input.selectedYear);
    const frac = input.selectedYear - wholeYear;
    if (Math.abs(frac) >= 1e-4) {
      const start = Date.UTC(wholeYear, 0, 1);
      const end = Date.UTC(wholeYear + 1, 0, 1);
      return new Date(start + frac * (end - start));
    }
    if (wholeYear !== now.getUTCFullYear()) {
      return new Date(
        Date.UTC(
          wholeYear,
          YEAR_ONLY_REFERENCE_MONTH_UTC,
          YEAR_ONLY_REFERENCE_DAY_UTC,
          YEAR_ONLY_REFERENCE_HOUR_UTC,
          0,
          0
        )
      );
    }
  }

  return now;
}
