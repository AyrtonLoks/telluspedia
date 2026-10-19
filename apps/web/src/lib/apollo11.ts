import * as THREE from "three";
import { latLngToVector3 } from "./geo-spatial";

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
export const MOON_DEFAULT_POSITION = new THREE.Vector3(3.6, 0.4, 0);
export const MOON_RADIUS_UNITS = 0.27;

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

export const APOLLO11_PHASES: Apollo11Phase[] = [
  {
    id: 1,
    name: "Lançamento Saturn V & Órbita de Espera (EPO)",
    code: "FASE 1 — LANÇAMENTO",
    badge: "SATURN V / LEO",
    description:
      "Decolagem do Centro Espacial Kennedy (LC-39A) e inserção na órbita terrestre baixa a 185 km.",
    startProgress: 0.0,
    endProgress: 0.2,
    targetProgress: 0.08,
    historicalDate: "16/07/1969 13:32 UTC",
    historicalGET: "000:00:00",
  },
  {
    id: 2,
    name: "Injeção Translunar (TLI) & Trajetória Cislunar",
    code: "FASE 2 — INJEÇÃO TRANSLUNAR",
    badge: "TLI / CISLUNAR",
    description:
      "Reignição do 3º estágio S-IVB atingindo ~39.240 km/h para escapar do campo gravitacional terrestre.",
    startProgress: 0.2,
    endProgress: 0.55,
    targetProgress: 0.35,
    historicalDate: "16/07/1969 16:22 UTC",
    historicalGET: "002:50:13",
  },
  {
    id: 3,
    name: "Inserção em Órbita Lunar (CSM Columbia)",
    code: "FASE 3 — ÓRBITA LUNAR",
    badge: "LOI / CSM COLUMBIA",
    description:
      "Frenagem retrógrada com o motor SPS do Columbia e circularização orbital a ~110 km da superfície lunar.",
    startProgress: 0.55,
    endProgress: 0.82,
    targetProgress: 0.65,
    historicalDate: "19/07/1969 17:28 UTC",
    historicalGET: "075:49:50",
  },
  {
    id: 4,
    name: "Pouso do Módulo Lunar Eagle no Mar da Tranquilidade",
    code: "FASE 4 — POUSO LUNAR",
    badge: "TOUCHDOWN / EAGLE",
    description:
      "Descida motorizada (PDI) e alunissagem: 'Houston, Tranquility Base here. The Eagle has landed.'",
    startProgress: 0.82,
    endProgress: 1.0,
    targetProgress: 1.0,
    historicalDate: "20/07/1969 20:17 UTC",
    historicalGET: "102:45:40",
  },
];

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
 * Converts Selenographic coordinates (Latitude, Longitude) to 3D Cartesian coordinates
 * on the Moon surface where the near side (0°, 0°) faces Earth (-X direction).
 */
export function selenographicToVector3(
  lat: number,
  lng: number,
  radius: number = MOON_RADIUS_UNITS,
  moonPos: THREE.Vector3 = MOON_DEFAULT_POSITION
): THREE.Vector3 {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  const offsetX = -radius * Math.cos(latRad) * Math.cos(lngRad);
  const offsetY = radius * Math.sin(latRad);
  const offsetZ = radius * Math.cos(latRad) * Math.sin(lngRad);

  return moonPos.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));
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

  // Point 1: Atmospheric ascent climbing east/southeast over the Atlantic
  const p1 = latLngToVector3(26.5, -68.0, 1.06);

  // Point 2: Earth Parking Orbit (LEO) insertion over mid-Atlantic
  const p2 = latLngToVector3(14.0, -28.0, 1.2);

  // Point 3: Translunar Injection (TLI) expanding burn arc
  const p3 = new THREE.Vector3(1.15, 0.35, 1.25);

  // Point 4: Midcourse translunar coast (distance from Earth ~ 2.3)
  const p4 = new THREE.Vector3(2.15, 0.38, 0.82);

  // Point 5: Translunar approach to Lunar Sphere of Influence (SOI)
  const p5 = new THREE.Vector3(2.95, 0.44, 0.42);

  // Point 6: Lunar Orbit Insertion (LOI entry) approaching lunar limb from cislunar space
  const pLoiEntry = selenographicToVector3(15, -120, 0.44, moonPos);

  // Point 7: Behind the Moon (far side loop in radio shadow)
  const pLoiBehind = selenographicToVector3(10, 180, 0.42, moonPos);

  // Point 8: Lunar orbit swing around east limb
  const pLoiExit = selenographicToVector3(5, 100, 0.38, moonPos);

  // Point 9: Powered Descent Initiation (PDI) descent orbit on near side
  const pPdi = selenographicToVector3(2, 50, 0.33, moonPos);

  // Point 10: Final powered approach descending directly toward Mare Tranquillitatis
  const pApproach = selenographicToVector3(1, 28, 0.29, moonPos);

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
