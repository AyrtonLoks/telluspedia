/**
 * Efemérides analíticas calibradas (NASA JPL Horizons) para Sondas do Espaço Profundo (D41):
 * - Voyager 1, Voyager 2, New Horizons e Telescópio Espacial James Webb (órbita de halo L2).
 */

import * as THREE from "three";
import { earthSystemScale, type CosmicScaleMode } from "./cosmic-scale";
import {
  DEEP_SPACE_PROBES_CATALOG,
  sanitizeNasaMissionUrl,
  type DeepSpaceProbeMetadata,
  type ProbeMilestone,
  type ProbeTrajectoryWaypoint,
} from "./deep-space-probes-catalog";
import { DEEP_SPACE_PROBE_IDS, isDeepSpaceProbeId, type DeepSpaceProbeId } from "./deep-space-probes-ids";
import { mapDistanceToSceneRadius } from "./kepler";
import { calculatePlanetaryPosition } from "./planet-orbits";

export {
  DEEP_SPACE_PROBE_IDS,
  DEEP_SPACE_PROBES_CATALOG,
  isDeepSpaceProbeId,
  sanitizeNasaMissionUrl,
  type DeepSpaceProbeId,
  type DeepSpaceProbeMetadata,
  type ProbeMilestone,
  type ProbeTrajectoryWaypoint,
};

/** Velocidade da luz no vácuo (km/s, CODATA) e unidade astronômica (km, IAU 2012). */
export const SPEED_OF_LIGHT_KM_S = 299792.458;
export const AU_IN_KM = 149597870.7;
/** Tempo-luz unidirecional por 1 UA: 499,0047838 segundos (~8 min 19 s). */
export const LIGHT_SECONDS_PER_AU = AU_IN_KM / SPEED_OF_LIGHT_KM_S;

const DEG_TO_RAD = Math.PI / 180;

export interface DeepSpaceProbePosition {
  id: DeepSpaceProbeId;
  isLaunched: boolean;
  decimalYear: number;
  heliocentricAu: { x: number; y: number; z: number };
  distanceSunAu: number;
  distanceSunMkm: number;
  distanceEarthAu: number;
  distanceEarthMkm: number;
  velocityKmS: number;
  velocityAuPerYear: number;
  /** Tempo-luz unidirecional Terra → Sonda em segundos. */
  oneWayLightSeconds: number;
  /** Tempo-luz de ida e volta (telemetria DSN) em segundos. */
  roundTripLightSeconds: number;
  /** Posição 3D comprimida na cena cósmica Three.js (sem NaN, respeitando folga orbital L2). */
  scenePosition: THREE.Vector3;
}

export function toDecimalYear(dateOrYear: Date | number): number {
  if (typeof dateOrYear === "number") {
    return Number.isFinite(dateOrYear) ? dateOrYear : 2026;
  }
  const y = dateOrYear.getUTCFullYear();
  const start = Date.UTC(y, 0, 1);
  const end = Date.UTC(y + 1, 0, 1);
  return y + (dateOrYear.getTime() - start) / (end - start);
}

function eclipticSphericalToAu(rAu: number, lonDeg: number, latDeg: number) {
  const lon = lonDeg * DEG_TO_RAD;
  const lat = latDeg * DEG_TO_RAD;
  const cosLat = Math.cos(lat);
  return {
    x: rAu * cosLat * Math.cos(lon),
    y: rAu * cosLat * Math.sin(lon),
    z: rAu * Math.sin(lat),
  };
}

function eclipticAuToScene(xEcl: number, yEcl: number, zEcl: number): THREE.Vector3 {
  const rAu = Math.hypot(xEcl, yEcl, zEcl);
  if (rAu < 1e-6) return new THREE.Vector3(0, 0, 0);
  const sceneR = mapDistanceToSceneRadius(rAu);
  const scale = sceneR / rAu;
  return new THREE.Vector3(xEcl * scale, zEcl * scale, -yEcl * scale);
}

/**
 * Formata o atraso de sinal eletromagnético (tempo-luz) em segundos, minutos ou horas+minutos.
 */
export function formatLightTime(seconds: number, locale: "pt-BR" | "en" = "pt-BR"): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  if (safe < 90) {
    const val = safe.toFixed(1);
    return locale === "en" ? `${val} light-sec` : `${val.replace(".", ",")} s-luz`;
  }
  const totalMin = safe / 60;
  if (totalMin < 60) {
    const m = Math.floor(totalMin);
    const s = Math.round(safe - m * 60);
    return `${m}m ${String(s).padStart(2, "0")}s`;
  }
  const hours = Math.floor(totalMin / 60);
  const mins = Math.round(totalMin - hours * 60);
  if (mins === 60) return `${hours + 1}h 00m`;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

/**
 * Calcula posição heliocêntrica (UA), distância geocêntrica (UA / mi km), velocidade (km/s),
 * atraso de sinal em tempo-luz e posição 3D segura na cena cósmica para qualquer época da timeline.
 */
export function calculateProbePosition(
  probeId: DeepSpaceProbeId,
  dateOrYear: Date | number,
  scaleMode: CosmicScaleMode = "visual"
): DeepSpaceProbePosition {
  const meta = DEEP_SPACE_PROBES_CATALOG[probeId];
  const decimalYear = toDecimalYear(dateOrYear);
  const earth = calculatePlanetaryPosition("EARTH", decimalYear);
  const isLaunched = decimalYear >= meta.launchDecimalYear;

  if (probeId === "JWST") {
    const ex = earth.heliocentricAu.x;
    const ey = earth.heliocentricAu.y;
    const ez = earth.heliocentricAu.z;
    const eNorm = Math.hypot(ex, ey, ez) || 1;
    const ux = ex / eNorm;
    const uy = ey / eNorm;
    const uz = ez / eNorm;

    const haloPhase = ((decimalYear - 2022.06) / 0.495) * Math.PI * 2;
    const l2OffsetAu = isLaunched ? 0.0100 : 0.0001;
    const haloAmpAu = isLaunched ? 0.0038 : 0;

    const tx = -uy;
    const ty = ux;
    const xEcl = ex + ux * l2OffsetAu + tx * Math.cos(haloPhase) * haloAmpAu;
    const yEcl = ey + uy * l2OffsetAu + ty * Math.cos(haloPhase) * haloAmpAu;
    const zEcl = ez + uz * l2OffsetAu + Math.sin(haloPhase) * haloAmpAu;

    const rSunAu = Math.hypot(xEcl, yEcl, zEcl);
    const dEarthAu = Math.hypot(xEcl - ex, yEcl - ey, zEcl - ez);
    const oneWaySec = dEarthAu * LIGHT_SECONDS_PER_AU;

    const earthSceneDir =
      earth.scenePosition.lengthSq() > 1e-6
        ? earth.scenePosition.clone().normalize()
        : new THREE.Vector3(1, 0, 0);
    const earthScale = earthSystemScale(scaleMode);
    const l2VisualClearance = Math.max(0.95, 2.4 * earthScale);
    const haloVisualRadius = Math.max(0.22, 0.45 * earthScale);
    const sceneTangent = new THREE.Vector3(-earthSceneDir.z, 0, earthSceneDir.x).normalize();
    const scenePos = earth.scenePosition
      .clone()
      .addScaledVector(earthSceneDir, l2VisualClearance)
      .addScaledVector(sceneTangent, Math.cos(haloPhase) * haloVisualRadius)
      .add(new THREE.Vector3(0, Math.sin(haloPhase) * haloVisualRadius * 0.85, 0));

    return {
      id: probeId,
      isLaunched,
      decimalYear,
      heliocentricAu: { x: xEcl, y: yEcl, z: zEcl },
      distanceSunAu: Number(rSunAu.toFixed(4)),
      distanceSunMkm: Number(((rSunAu * AU_IN_KM) / 1e6).toFixed(2)),
      distanceEarthAu: Number(dEarthAu.toFixed(5)),
      distanceEarthMkm: Number(((dEarthAu * AU_IN_KM) / 1e6).toFixed(2)),
      velocityKmS: meta.asymptoticSpeedKmS,
      velocityAuPerYear: meta.asymptoticAuPerYear,
      oneWayLightSeconds: Number(oneWaySec.toFixed(2)),
      roundTripLightSeconds: Number((oneWaySec * 2).toFixed(2)),
      scenePosition: scenePos,
    };
  }

  const wps = meta.waypoints!;
  const first = wps[0]!;
  const last = wps[wps.length - 1]!;

  let rAu: number;
  let lonDeg: number;
  let latDeg: number;
  let speedAuYr = meta.asymptoticAuPerYear;

  if (decimalYear <= first.year) {
    rAu = first.rAu;
    lonDeg = first.eclLonDeg;
    latDeg = first.eclLatDeg;
    speedAuYr = 0;
  } else if (decimalYear >= last.year) {
    rAu = last.rAu + (decimalYear - last.year) * meta.asymptoticAuPerYear;
    lonDeg = last.eclLonDeg;
    latDeg = last.eclLatDeg;
    speedAuYr = meta.asymptoticAuPerYear;
  } else {
    let segIdx = 0;
    for (let i = 0; i < wps.length - 1; i++) {
      if (decimalYear >= wps[i]!.year && decimalYear <= wps[i + 1]!.year) {
        segIdx = i;
        break;
      }
    }
    const a = wps[segIdx]!;
    const b = wps[segIdx + 1]!;
    const span = Math.max(1e-6, b.year - a.year);
    const t = Math.min(1, Math.max(0, (decimalYear - a.year) / span));
    rAu = a.rAu + (b.rAu - a.rAu) * t;
    let dLon = ((b.eclLonDeg - a.eclLonDeg + 540) % 360) - 180;
    if (b.year - a.year > 1.0 && b.eclLonDeg < a.eclLonDeg && segIdx === 0) {
      dLon = b.eclLonDeg + 360 - a.eclLonDeg;
    }
    lonDeg = (a.eclLonDeg + dLon * t + 360) % 360;
    latDeg = a.eclLatDeg + (b.eclLatDeg - a.eclLatDeg) * t;
    speedAuYr = Math.abs(b.rAu - a.rAu) / span;
  }

  const helio = eclipticSphericalToAu(rAu, lonDeg, latDeg);
  const scenePos = eclipticAuToScene(helio.x, helio.y, helio.z);
  const dEarthAu = Math.hypot(
    helio.x - earth.heliocentricAu.x,
    helio.y - earth.heliocentricAu.y,
    helio.z - earth.heliocentricAu.z
  );
  const oneWaySec = dEarthAu * LIGHT_SECONDS_PER_AU;
  const velocityKmS =
    decimalYear >= last.year
      ? meta.asymptoticSpeedKmS
      : Number(((speedAuYr * AU_IN_KM) / (365.25 * 86400)).toFixed(2));

  return {
    id: probeId,
    isLaunched,
    decimalYear,
    heliocentricAu: helio,
    distanceSunAu: Number(rAu.toFixed(3)),
    distanceSunMkm: Number(((rAu * AU_IN_KM) / 1e6).toFixed(2)),
    distanceEarthAu: Number(dEarthAu.toFixed(3)),
    distanceEarthMkm: Number(((dEarthAu * AU_IN_KM) / 1e6).toFixed(2)),
    velocityKmS,
    velocityAuPerYear: Number(speedAuYr.toFixed(3)),
    oneWayLightSeconds: Number(oneWaySec.toFixed(1)),
    roundTripLightSeconds: Number((oneWaySec * 2).toFixed(1)),
    scenePosition: scenePos,
  };
}

/**
 * Gera a trilha 3D de voo da sonda (ou o anel da órbita de halo L2 para o James Webb).
 */
export function generateProbeTrajectoryPoints(
  probeId: DeepSpaceProbeId,
  dateOrYear: Date | number,
  scaleMode: CosmicScaleMode = "visual",
  segments = 64
): THREE.Vector3[] {
  const decimalYear = toDecimalYear(dateOrYear);
  const meta = DEEP_SPACE_PROBES_CATALOG[probeId];

  if (probeId === "JWST") {
    const earth = calculatePlanetaryPosition("EARTH", decimalYear);
    const earthSceneDir =
      earth.scenePosition.lengthSq() > 1e-6
        ? earth.scenePosition.clone().normalize()
        : new THREE.Vector3(1, 0, 0);
    const earthScale = earthSystemScale(scaleMode);
    const l2VisualClearance = Math.max(0.95, 2.4 * earthScale);
    const haloVisualRadius = Math.max(0.22, 0.45 * earthScale);
    const sceneTangent = new THREE.Vector3(-earthSceneDir.z, 0, earthSceneDir.x).normalize();
    const center = earth.scenePosition.clone().addScaledVector(earthSceneDir, l2VisualClearance);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const ang = (i / segments) * Math.PI * 2;
      pts.push(
        center
          .clone()
          .addScaledVector(sceneTangent, Math.cos(ang) * haloVisualRadius)
          .add(new THREE.Vector3(0, Math.sin(ang) * haloVisualRadius * 0.85, 0))
      );
    }
    return pts;
  }

  const endYear = Math.max(meta.launchDecimalYear + 0.5, decimalYear);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const y = meta.launchDecimalYear + ((endYear - meta.launchDecimalYear) * i) / segments;
    pts.push(calculateProbePosition(probeId, y, scaleMode).scenePosition);
  }
  return pts;
}
