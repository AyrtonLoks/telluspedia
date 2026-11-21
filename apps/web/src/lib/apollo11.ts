import * as THREE from "three";
import { latLngToVector3 } from "./geo-spatial";
import { APOLLO11_LANDING_DATE, calculateLunarPosition, getMoonScenePosition } from "./astronomy";
import { getScene, fact } from "./scenes/catalog";
import { cislunarControlPoints, selenographicToScene } from "./scenes/cislunar";

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
 * Pontos de controle da trajetória translunar — agora calculados pelo módulo genérico de cenas
 * Terra–Lua (`lib/scenes/cislunar.ts`) a partir dos dados da cena `glo-1969` (D12c).
 */
export function getApollo11ControlPoints(moonPos: THREE.Vector3 = MOON_DEFAULT_POSITION): THREE.Vector3[] {
  return cislunarControlPoints({ launchSite: CAPE_CANAVERAL_COORDS, landingSite: TRANQUILITY_BASE_COORDS }, moonPos);
}

export function selenographicToVector3(
  lat: number,
  lng: number,
  radius: number = MOON_RADIUS_UNITS,
  moonPos: THREE.Vector3 = MOON_DEFAULT_POSITION
): THREE.Vector3 {
  return selenographicToScene(lat, lng, radius, moonPos);
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
