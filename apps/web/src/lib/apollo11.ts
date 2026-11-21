import * as THREE from "three";
import { latLngToVector3 } from "./geo-spatial";
import { APOLLO11_LANDING_DATE, calculateLunarPosition, getMoonScenePosition } from "./astronomy";
import { getScene, fact } from "./scenes/catalog";

/**
 * Apollo 11 Mission Reference Coordinates
 * Source: NASA Apollo 11 Mission Report (SP-238)
 */
export const CAPE_CANAVERAL_COORDS = {
  lat: 28.5721,
  lng: -80.648,
  name: "Cabo Canaveral — Plataforma LC-39A (KSC)",
  altitudeKm: 0,
};

export const TRANQUILITY_BASE_COORDS = {
  lat: 0.674,
  lng: 23.4729,
  name: "Base da Tranquilidade — Mare Tranquillitatis",
  altitudeKm: 0,
};

export const EARTH_RADIUS_UNITS = 1.0;
export const LAUNCH_PAD_RADIUS_UNITS = 1.002;
/**
 * Astronomical Earth-fixed Moon position at Apollo 11 touchdown (1969-07-20 20:17:40 UTC),
 * computed via Meeus Ch. 47 in compressed TellusPedia scene coordinates (~3.67 R⊕).
 */
export const APOLLO11_LUNAR_EPHEMERIS = calculateLunarPosition(APOLLO11_LANDING_DATE);
export const MOON_DEFAULT_POSITION = getMoonScenePosition(APOLLO11_LANDING_DATE, "earth");
export const MOON_RADIUS_UNITS = 0.27;

/**
 * Calibrated side-profile camera framing Earth, Cape Canaveral, the full translunar arc,
 * and the real 1969-07-20 Moon cleanly inside the viewport (altitude <= MAX_CAMERA_ALTITUDE 6.0).
 */
export const APOLLO11_WIDE_CAMERA = {
  lat: 12,
  lng: -148,
  altitude: 6.0,
} as const;

/**
 * Calibrated lunar-perspective camera derived from the real 1969-07-20 Moon coordinates,
 * framing Tranquility Base and the Moon in the foreground with Earth behind.
 */
export const APOLLO11_MOON_CAMERA = {
  lat: Number((APOLLO11_LUNAR_EPHEMERIS.sublunarLatitude + 2).toFixed(2)),
  lng: Number((APOLLO11_LUNAR_EPHEMERIS.sublunarLongitude - 3).toFixed(2)),
  altitude: 4.8,
} as const;

export const APOLLO11_CONSTANTS = {
  REAL_EARTH_MOON_DISTANCE_KM: 384400,
  TLI_MAX_SPEED_KMH: 39240, // ~10.9 km/s escape speed
  LEO_ORBIT_SPEED_KMH: 28000,
  LUNAR_ORBIT_SPEED_KMH: 5800,
  TOTAL_OUTBOUND_GET_SECONDS: 370000, // ~102h 45m 40s to landing
};

export interface Apollo11Phase {
  id: number;
  name: string;
  code: string;
  badge: string;
  description: string;
  startProgress: number;
  endProgress: number;
  targetProgress: number;
  historicalDate: string;
  historicalGET: string;
}

/** Fases da missão — vêm da cena `src/data/scenes/glo-1969.json` (D12b). */
export const APOLLO11_PHASES: Apollo11Phase[] = (() => {
  const traj = getScene("glo-1969")?.trajectories.find((t) => t.kind === "cislunar");
  if (!traj || traj.kind !== "cislunar") throw new Error("cena glo-1969 sem trajetória Terra–Lua");
  return traj.phases.map((p) => ({
    id: fact<number>(p.facts, "phaseNumber"),
    name: p.label,
    code: fact<string>(p.facts, "code"),
    badge: fact<string>(p.facts, "badge"),
    description: p.description ?? "",
    startProgress: fact<number>(p.facts, "startProgress"),
    endProgress: fact<number>(p.facts, "endProgress"),
    targetProgress: fact<number>(p.facts, "targetProgress"),
    historicalDate: fact<string>(p.facts, "historicalDate"),
    historicalGET: fact<string>(p.facts, "historicalGET"),
  }));
})();

/**
 * Returns the active phase object given progress t in [0, 1].
 */
export function getMissionPhase(progress: number): Apollo11Phase {
  const clamped = Math.max(0, Math.min(1, progress));
  for (const phase of APOLLO11_PHASES) {
    if (clamped >= phase.startProgress && clamped <= phase.endProgress) {
      return phase;
    }
  }
  return APOLLO11_PHASES[APOLLO11_PHASES.length - 1];
}

/**
 * Formats seconds into HHH:MM:SS Ground Elapsed Time (GET).
 */
export function formatGET(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(3, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Computes realistic flight telemetry (speed, distance, GET) at progress t in [0, 1].
 */
export function getMissionTelemetry(progress: number) {
  const clamped = Math.max(0, Math.min(1, progress));
  const phase = getMissionPhase(clamped);

  const totalSeconds = clamped * APOLLO11_CONSTANTS.TOTAL_OUTBOUND_GET_SECONDS;
  const getFormatted = formatGET(totalSeconds);

  let speedKmH = 0;
  let distanceKm = 0;

  if (clamped < 0.2) {
    // Phase 1: Launch and LEO
    const subT = clamped / 0.2;
    speedKmH = Math.round(1500 + subT * (APOLLO11_CONSTANTS.LEO_ORBIT_SPEED_KMH - 1500));
    distanceKm = Math.round(subT * 185);
  } else if (clamped < 0.55) {
    // Phase 2: TLI translunar coast
    const subT = (clamped - 0.2) / (0.55 - 0.2);
    // Speed peaks at 39,240 km/h, slows at L1 equigravisphere down to ~3,600 km/h, then accelerates to ~6,000 km/h
    if (subT < 0.8) {
      const slowT = subT / 0.8;
      speedKmH = Math.round(39240 - slowT * (39240 - 3600));
    } else {
      const accelT = (subT - 0.8) / 0.2;
      speedKmH = Math.round(3600 + accelT * (6000 - 3600));
    }
    distanceKm = Math.round(185 + subT * (350000 - 185));
  } else if (clamped < 0.82) {
    // Phase 3: Lunar Orbit Insertion
    const subT = (clamped - 0.55) / (0.82 - 0.55);
    speedKmH = Math.round(5800 + Math.sin(subT * Math.PI) * 350);
    distanceKm = Math.round(350000 + subT * (384400 - 350000));
  } else {
    // Phase 4: Powered Descent Initiation and Touchdown
    const subT = (clamped - 0.82) / 0.18;
    speedKmH = Math.max(0, Math.round(5800 * (1 - subT))) || 0;
    distanceKm = 384400;
  }

  return {
    progress: clamped,
    phase,
    speedKmH,
    distanceKm,
    getFormatted,
  };
}

/**
 * Builds an orthonormal selenographic basis at `moonPos` where:
 * - `nearDir` (0°, 0°) points strictly toward Earth (origin), reflecting tidal locking
 * - `upDir` aligns with celestial/geographic north projected perpendicular to `nearDir`
 * - `eastDir` points toward lunar east (Mare Crisium / Mare Tranquillitatis side)
 */
function buildSelenographicBasis(moonPos: THREE.Vector3) {
  const nearDir = moonPos.clone().negate().normalize();
  const worldNorth = new THREE.Vector3(0, 1, 0);
  const upDir = worldNorth
    .clone()
    .addScaledVector(nearDir, -worldNorth.dot(nearDir));
  if (upDir.lengthSq() < 1e-6) {
    upDir.set(0, 0, 1);
  }
  upDir.normalize();
  const eastDir = new THREE.Vector3().crossVectors(upDir, nearDir).normalize();
  return { nearDir, upDir, eastDir };
}

/**
 * Converts Selenographic coordinates (Latitude, Longitude) to 3D Cartesian coordinates
 * on the Moon surface where the near side (0°, 0°) faces Earth (origin).
 */
export function selenographicToVector3(
  lat: number,
  lng: number,
  radius: number = MOON_RADIUS_UNITS,
  moonPos: THREE.Vector3 = MOON_DEFAULT_POSITION
): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  const { nearDir, upDir, eastDir } = buildSelenographicBasis(moonPos);

  const cosLat = Math.cos(latRad);
  const offset = new THREE.Vector3()
    .addScaledVector(nearDir, radius * cosLat * Math.cos(lngRad))
    .addScaledVector(upDir, radius * Math.sin(latRad))
    .addScaledVector(eastDir, radius * cosLat * Math.sin(lngRad));

  return moonPos.clone().add(offset);
}

/**
 * Control points for the 3D translunar Catmull-Rom spline.
 * Connects Cape Canaveral (radius 1.002) through translunar cislunar space,
 * enters lunar orbit looping behind the Moon (far side, radio shadow),
 * and descends to Tranquility Base on the near side of the Moon.
 */
export function getApollo11ControlPoints(
  moonPos: THREE.Vector3 = MOON_DEFAULT_POSITION
): THREE.Vector3[] {
  // Point 0: Exact Cape Canaveral coordinates on Earth surface at radius 1.002
  const p0 = latLngToVector3(
    CAPE_CANAVERAL_COORDS.lat,
    CAPE_CANAVERAL_COORDS.lng,
    LAUNCH_PAD_RADIUS_UNITS
  );

  // Build cislunar frame oriented from Earth toward the real astronomical Moon position
  const moonDist = moonPos.length();
  const moonDir = moonPos.clone().divideScalar(moonDist || 1);
  const { upDir, eastDir } = buildSelenographicBasis(moonPos);
  // Lunar west direction (free-return approach side)
  const westDir = eastDir.clone().negate();

  // Point 1: Atmospheric ascent climbing east/southeast over the Atlantic
  const p1 = latLngToVector3(26.5, -68.0, 1.08);

  // Point 2: Earth Parking Orbit (LEO) insertion heading toward translunar plane
  const p2Dir = p1
    .clone()
    .normalize()
    .lerp(moonDir.clone().addScaledVector(westDir, 0.55).normalize(), 0.45)
    .normalize();
  const p2 = p2Dir.multiplyScalar(1.24);

  // Point 3: Translunar Injection (TLI) expanding burn arc
  const p3 = moonDir
    .clone()
    .multiplyScalar(moonDist * 0.42)
    .addScaledVector(westDir, 0.78)
    .addScaledVector(upDir, 0.28);

  // Point 4: Midcourse translunar coast
  const p4 = moonDir
    .clone()
    .multiplyScalar(moonDist * 0.64)
    .addScaledVector(westDir, 0.64)
    .addScaledVector(upDir, 0.22);

  // Point 5: Translunar approach to Lunar Sphere of Influence (SOI)
  const p5 = moonDir
    .clone()
    .multiplyScalar(moonDist * 0.84)
    .addScaledVector(westDir, 0.48)
    .addScaledVector(upDir, 0.14);

  // Point 6: Lunar Orbit Insertion (LOI entry) approaching lunar west limb from cislunar space
  const pLoiEntry = selenographicToVector3(15, -120, 0.44, moonPos);

  // Point 7: Behind the Moon (far side loop in radio shadow)
  const pLoiBehind = selenographicToVector3(10, 180, 0.42, moonPos);

  // Point 8: Lunar orbit swing around east limb
  const pLoiExit = selenographicToVector3(5, 100, 0.38, moonPos);

  // Point 9: Powered Descent Initiation (PDI) descent orbit on near side
  const pPdi = selenographicToVector3(2, 50, 0.33, moonPos);

  // Point 10: Final powered approach descending directly toward Mare Tranquillitatis
  const pApproach = selenographicToVector3(1, 28, 0.295, moonPos);

  // Point 11: Touchdown at Tranquility Base on lunar surface (radius 0.27) facing Earth
  const pLanding = selenographicToVector3(
    TRANQUILITY_BASE_COORDS.lat,
    TRANQUILITY_BASE_COORDS.lng,
    MOON_RADIUS_UNITS,
    moonPos
  );

  return [
    p0,
    p1,
    p2,
    p3,
    p4,
    p5,
    pLoiEntry,
    pLoiBehind,
    pLoiExit,
    pPdi,
    pApproach,
    pLanding,
  ];
}

/**
 * Creates the continuous 3D CatmullRomCurve3 trajectory for the mission.
 */
export function createApollo11TrajectoryCurve(
  moonPos: THREE.Vector3 = MOON_DEFAULT_POSITION
): THREE.CatmullRomCurve3 {
  const points = getApollo11ControlPoints(moonPos);
  return new THREE.CatmullRomCurve3(points, false, "centripetal", 0.5);
}
