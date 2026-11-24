/**
 * Motor científico de Lixo Marítimo, Giros Oceânicos e Advecção Lagrangiana (D29 / RN17).
 *
 * Combina duas camadas explícitas (T05 / RN02):
 * 1. Mapa observado dos 5 grandes giros oceânicos subtropicais de acumulação de microplásticos
 *    (NOAA Marine Debris Program, NOAA/AOML Global Drifter Program, Eriksen et al. 2014 e
 *    Lebreton et al. 2018).
 * 2. Modelo Lagrangiano acoplado impulsionado pelos campos reais de correntes superficiais
 *    (D27b, Open-Meteo Marine) + fator de deriva de vento (windage 1–3%, D27a NOAA GFS) +
 *    convergência subtropical de Ekman.
 */

import { sampleOceanCurrentGrid, type OceanCurrentSample } from "./currents-data";
import { sampleWindGrid, type WindSample } from "./winds-data";
import type { OceanCurrentGrid, WindGrid } from "./winds-types";
import type { CountrySpatialIndex } from "./historical-topology";
import {
  OCEAN_GYRES,
  type DebrisReleasePoint,
  type OceanGyre,
} from "./marine-debris-catalog";

export {
  DEBRIS_DENSITY_STOPS,
  DEBRIS_LAUNCH_PRESETS,
  DEFAULT_DEBRIS_HORIZON_MONTHS,
  DEFAULT_DEBRIS_WINDAGE,
  OCEAN_GYRES,
  getOceanGyre,
  type DebrisColorStop,
  type DebrisLaunchPreset,
  type DebrisReleasePoint,
  type MarineDebrisHorizonMonths,
  type MarineDebrisWindage,
  type OceanGyre,
  type OceanGyreId,
} from "./marine-debris-catalog";

export interface CoupledVelocitySample {
  u: number;
  v: number;
  speedMs: number;
  inOcean: boolean;
}

export interface DriftSimulationResult {
  origin: DebrisReleasePoint;
  windage: number;
  horizonMonths: number;
  /** Conjunto determinístico de trajetórias (central + dispersão turbulenta) em `[lat, lng][]`. */
  trajectories: ReadonlyArray<ReadonlyArray<readonly [number, number]>>;
  destinationGyre: OceanGyre;
  /** Meses estimados até atingir a zona principal do giro (null se ainda em trânsito no horizonte). */
  arrivalMonths: number | null;
  /** Distância acumulada (km) percorrida pela trajetória central. */
  distanceKm: number;
}

const DEG2RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;
const METERS_PER_DEG_LAT = 111_320;
const SECONDS_PER_DAY = 86_400;

function wrapLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function deltaLng(a: number, b: number): number {
  return wrapLng(a - b);
}

/** Distância ortodrômica aproximada (Haversine) em quilômetros. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = deltaLng(lng2, lng1) * DEG2RAD;
  const sLat = Math.sin(dLat / 2);
  const sLng = Math.sin(dLng / 2);
  const a = sLat * sLat + Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * sLng * sLng;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
}

/** Normaliza a distância elíptica de um ponto ao núcleo de um giro (≤ 1 dentro do núcleo). */
export function gyreNormalizedDistance(lat: number, lng: number, gyre: OceanGyre): number {
  const dLat = (lat - gyre.centerLat) / gyre.radiusLat;
  const dLng = deltaLng(lng, gyre.centerLng) / gyre.radiusLng;
  return Math.hypot(dLat, dLng);
}

/** Encontra o giro subtropical mais próximo de uma coordenada oceânica (ponderado pela bacia). */
export function findNearestGyre(lat: number, lng: number): OceanGyre {
  let best = OCEAN_GYRES[0];
  let bestScore = Infinity;
  for (const gyre of OCEAN_GYRES) {
    // Penaliza fortemente cruzar o equador (barreira dinâmica equatorial de convergência)
    const hemispherePenalty = (lat >= 0) !== (gyre.centerLat >= 0) ? 2.6 : 1.0;
    const score = gyreNormalizedDistance(lat, lng, gyre) * hemispherePenalty;
    if (score < bestScore) {
      bestScore = score;
      best = gyre;
    }
  }
  return best;
}

/**
 * Avalia densidade relativa observada [0..1] de microplásticos (soma gaussiana dos 5 giros).
 */
export function sampleObservedDebrisDensity(lat: number, lng: number): number {
  let density = 0;
  for (const gyre of OCEAN_GYRES) {
    const r = gyreNormalizedDistance(lat, lng, gyre);
    if (r > 3.2) continue;
    density += gyre.intensity * Math.exp(-0.5 * r * r);
  }
  return Math.min(1, density);
}

const scratchCurrent: OceanCurrentSample = { u: 0, v: 0, speed: 0, inOcean: false };
const scratchWind: WindSample = { u: 0, v: 0, speed: 0 };

/**
 * Velocidade Lagrangiana acoplada (m/s):
 *   v_drift = v_current + windage * v_wind_10m + v_ekman_convergence
 *
 * O termo de Ekman reproduz o transporte líquido para a direita do vento no HN (esquerda no HS)
 * e a convergência lenta para o núcleo subtropical da bacia ativa. Escreve em `out` sem alocar.
 */
export function computeCoupledDriftVelocity(
  lat: number,
  lng: number,
  currents: OceanCurrentGrid | null,
  surfaceWind: WindGrid | null,
  windage: number,
  out: CoupledVelocitySample
): CoupledVelocitySample {
  let u = 0;
  let v = 0;
  let inOcean = true;

  if (currents) {
    sampleOceanCurrentGrid(currents, lat, lng, scratchCurrent);
    inOcean = scratchCurrent.inOcean;
    if (!inOcean) {
      out.u = 0;
      out.v = 0;
      out.speedMs = 0;
      out.inOcean = false;
      return out;
    }
    u += scratchCurrent.u;
    v += scratchCurrent.v;
  }

  if (surfaceWind) {
    sampleWindGrid(surfaceWind, lat, lng, scratchWind);
    const w = Math.max(0, Math.min(0.06, windage));
    // Componente direta de windage + leve deflexão de Ekman (~25° direita no HN / esquerda no HS)
    const ekmanAngle = (lat >= 0 ? -25 : 25) * DEG2RAD;
    const cosE = Math.cos(ekmanAngle);
    const sinE = Math.sin(ekmanAngle);
    const wu = scratchWind.u * cosE - scratchWind.v * sinE;
    const wv = scratchWind.u * sinE + scratchWind.v * cosE;
    u += w * wu;
    v += w * wv;
  }

  // Convergência subtropical de Ekman (bombeamento suave em direção ao núcleo do giro da bacia)
  const target = findNearestGyre(lat, lng);
  const dLat = target.centerLat - lat;
  const dLng = deltaLng(target.centerLng, lng);
  const normDist = gyreNormalizedDistance(lat, lng, target);
  if (normDist < 4.5 && normDist > 0.12) {
    const distDeg = Math.hypot(dLat, dLng) || 1;
    const dirLng = dLng / distDeg;
    const dirLat = dLat / distDeg;
    // Velocidade radial convergente (~0,06–0,12 m/s) + rotação tangencial coerente com o hemisfério
    const radialMag = 0.115 * Math.min(1, normDist) * Math.exp(-0.15 * Math.max(0, normDist - 1.2));
    const swirlSign = target.rotation === "clockwise" ? 1 : -1;
    const swirlMag = 0.065 * Math.exp(-0.32 * Math.max(0, normDist - 0.8));
    u += dirLng * radialMag + dirLat * swirlSign * swirlMag;
    v += dirLat * radialMag - dirLng * swirlSign * swirlMag;
  }

  out.u = u;
  out.v = v;
  out.speedMs = Math.hypot(u, v);
  out.inOcean = true;
  return out;
}

function isLand(
  lat: number,
  lng: number,
  spatialIndex: CountrySpatialIndex | null | undefined
): boolean {
  if (!spatialIndex) return false;
  return spatialIndex([wrapLng(lng), lat]) !== null;
}

/**
 * Se o ponto clicado cair ligeiramente em terra (costa), procura o ponto oceânico adjacente
 * mais próximo num raio de até 3° para permitir lançamento educativo a partir de cidades costeiras.
 */
export function snapToNearestOcean(
  lat: number,
  lng: number,
  currents: OceanCurrentGrid | null,
  spatialIndex?: CountrySpatialIndex | null
): { lat: number; lng: number } | null {
  const probe: CoupledVelocitySample = { u: 0, v: 0, speedMs: 0, inOcean: false };
  const validOcean = (pLat: number, pLng: number) => {
    if (pLat < -72 || pLat > 72) return false;
    if (isLand(pLat, pLng, spatialIndex)) return false;
    if (!currents) return true;
    computeCoupledDriftVelocity(pLat, pLng, currents, null, 0, probe);
    return probe.inOcean;
  };

  if (validOcean(lat, lng)) return { lat, lng: wrapLng(lng) };

  const radii = [0.6, 1.2, 2.0, 3.0];
  const bearings = 12;
  for (const r of radii) {
    for (let i = 0; i < bearings; i++) {
      const a = (i / bearings) * Math.PI * 2;
      const candLat = Math.max(-71, Math.min(71, lat + r * Math.sin(a)));
      const candLng = wrapLng(lng + (r * Math.cos(a)) / Math.max(0.25, Math.cos(candLat * DEG2RAD)));
      if (validOcean(candLat, candLng)) {
        return { lat: Number(candLat.toFixed(2)), lng: Number(candLng.toFixed(2)) };
      }
    }
  }
  return null;
}

/**
 * Simula um conjunto determinístico de 5 traçadores Lagrangianos a partir de um ponto costeiro
 * ou oceânico usando integração RK2 (ponto médio) acoplada a correntes + ventos (`D27`).
 */
export function simulateDriftTrajectories(params: {
  origin: DebrisReleasePoint;
  currents: OceanCurrentGrid | null;
  surfaceWind: WindGrid | null;
  windage: number;
  horizonMonths: number;
  spatialIndex?: CountrySpatialIndex | null;
}): DriftSimulationResult {
  const { currents, surfaceWind, windage, horizonMonths, spatialIndex } = params;
  const snapped = snapToNearestOcean(params.origin.lat, params.origin.lng, currents, spatialIndex);
  const startLat = snapped?.lat ?? params.origin.lat;
  const startLng = snapped?.lng ?? wrapLng(params.origin.lng);

  // Passo de integração: 3 dias simulados por iteração (bom equilíbrio entre precisão e fluidez)
  const stepDays = 3;
  const dtSeconds = stepDays * SECONDS_PER_DAY;
  const totalDays = Math.max(30, horizonMonths * 30);
  const steps = Math.round(totalDays / stepDays);
  const sampleEvery = Math.max(1, Math.floor(steps / 96));

  // 5 traçadores: central + 4 perturbações de ±0,55° representando dispersão sub-grade
  const offsets: readonly (readonly [number, number])[] = [
    [0, 0],
    [0.55, 0.55],
    [-0.55, 0.55],
    [0.55, -0.55],
    [-0.55, -0.55],
  ];

  const vel1: CoupledVelocitySample = { u: 0, v: 0, speedMs: 0, inOcean: false };
  const vel2: CoupledVelocitySample = { u: 0, v: 0, speedMs: 0, inOcean: false };

  const trajectories: Array<Array<readonly [number, number]>> = [];
  let centralDistanceKm = 0;
  let arrivalMonths: number | null = null;
  let centralEndLat = startLat;
  let centralEndLng = startLng;

  for (let tIdx = 0; tIdx < offsets.length; tIdx++) {
    const [oLat, oLng] = offsets[tIdx];
    let lat = Math.max(-71, Math.min(71, startLat + oLat));
    let lng = wrapLng(startLng + oLng);
    if (isLand(lat, lng, spatialIndex)) {
      lat = startLat;
      lng = startLng;
    }

    const path: Array<readonly [number, number]> = [[lat, lng]];

    for (let s = 1; s <= steps; s++) {
      computeCoupledDriftVelocity(lat, lng, currents, surfaceWind, windage, vel1);
      if (!vel1.inOcean || vel1.speedMs < 1e-4) break;

      const cosLat1 = Math.max(0.25, Math.cos(lat * DEG2RAD));
      const halfDLat = ((vel1.v * dtSeconds) / METERS_PER_DEG_LAT) * 0.5;
      const halfDLng = ((vel1.u * dtSeconds) / (METERS_PER_DEG_LAT * cosLat1)) * 0.5;
      const midLat = Math.max(-71, Math.min(71, lat + halfDLat));
      const midLng = wrapLng(lng + halfDLng);

      computeCoupledDriftVelocity(midLat, midLng, currents, surfaceWind, windage, vel2);
      const uEff = vel2.inOcean ? vel2.u : vel1.u;
      const vEff = vel2.inOcean ? vel2.v : vel1.v;

      const cosLat = Math.max(0.25, Math.cos(lat * DEG2RAD));
      const nextLat = Math.max(-71, Math.min(71, lat + (vEff * dtSeconds) / METERS_PER_DEG_LAT));
      const nextLng = wrapLng(lng + (uEff * dtSeconds) / (METERS_PER_DEG_LAT * cosLat));

      // Se colidir com costa, tenta deslizar apenas em latitude ou longitude
      let resolvedLat = nextLat;
      let resolvedLng = nextLng;
      if (isLand(resolvedLat, resolvedLng, spatialIndex)) {
        if (!isLand(lat, nextLng, spatialIndex)) {
          resolvedLat = lat;
        } else if (!isLand(nextLat, lng, spatialIndex)) {
          resolvedLng = lng;
        } else {
          break;
        }
      }

      if (tIdx === 0) {
        centralDistanceKm += haversineKm(lat, lng, resolvedLat, resolvedLng);
        if (arrivalMonths === null) {
          for (const gyre of OCEAN_GYRES) {
            if (gyreNormalizedDistance(resolvedLat, resolvedLng, gyre) <= 1.05) {
              arrivalMonths = Math.max(1, Math.round((s * stepDays) / 30));
              break;
            }
          }
        }
      }

      lat = resolvedLat;
      lng = resolvedLng;

      if (s % sampleEvery === 0 || s === steps) {
        path.push([lat, lng]);
      }
    }

    if (tIdx === 0) {
      centralEndLat = lat;
      centralEndLng = lng;
    }
    trajectories.push(path);
  }

  const destinationGyre = findNearestGyre(centralEndLat, centralEndLng);

  return {
    origin: {
      lat: Number(startLat.toFixed(2)),
      lng: Number(startLng.toFixed(2)),
      label: params.origin.label,
    },
    windage,
    horizonMonths,
    trajectories,
    destinationGyre,
    arrivalMonths,
    distanceKm: Math.round(centralDistanceKm),
  };
}
