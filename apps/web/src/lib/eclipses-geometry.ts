/**
 * Geometria física de umbra/penumbra, alinhamento orbital colinear Terra–Lua–Sol e faixa de
 * totalidade 3D acima das nuvens para eclipses solares e lunares (D41).
 * Alinhada estritamente à projeção esférica não-espelhada do Three.js (AGENTS.md §1).
 */

import * as THREE from "three";
import {
  calculateLunarPosition,
  calculateSubsolarPoint,
  getSunDirectionVector,
  MOON_MEAN_DISTANCE_KM,
  MOON_SCENE_ORBIT_RADIUS,
} from "./astronomy";
import { ECLIPSES_CATALOG, type EclipseCatalogEntry } from "./eclipses-catalog";
import {
  clampEclipseOffsetMinutes,
  resolveEclipseTargetDate,
  type EclipseId,
} from "./eclipses-ids";
import { latLngToVector3, slerpVectors, vector3ToLatLng } from "./geo-spatial";

export const EARTH_RADIUS_KM_ECLIPSE = 6378.1;
export const MOON_RADIUS_KM_ECLIPSE = 1737.4;
export const SUN_RADIUS_KM_ECLIPSE = 695700.0;
export const AU_KM_ECLIPSE = 149597870.7;

/** Acima da camada de nuvens (`CLOUD_RADIUS = 1.006`) para nitidez cartográfica total. */
export const TOTALITY_RIBBON_RADIUS = 1.0074;
export const TOTALITY_CENTERLINE_RADIUS = 1.008;
export const ECLIPSE_SHADOW_SHELL_RADIUS = 1.007;

export interface EclipseInstantGeometry {
  eclipse: EclipseCatalogEntry;
  targetDate: Date;
  offsetMinutes: number;
  subsolarLat: number;
  subsolarLng: number;
  sublunarLat: number;
  sublunarLng: number;
  lunarDistanceKm: number;
  sunMoonSeparationDeg: number;
  umbralConeLengthKm: number;
  umbraRadiusKm: number;
  penumbraRadiusKm: number;
  umbraAngularRad: number;
  penumbraAngularRad: number;
  shadowLat: number;
  shadowLng: number;
  /** Rótulo da estação ou região imediatamente sob o eixo da umbra no minuto selecionado. */
  activeLocationPt: string;
  activeLocationEn: string;
  /** Vetor unitário 3D no referencial fixo da Terra apontando para o centro da sombra. */
  shadowDirection: THREE.Vector3;
  /** Vetor direção solar no referencial fixo da Terra. */
  sunDirection: THREE.Vector3;
  /** Vetor direção lunar geocêntrica real (Meeus Cap. 47) no referencial fixo da Terra. */
  moonDirection: THREE.Vector3;
  /**
   * Posição 3D da Lua no referencial local de `EarthOrientationGroup` em sizígia colinear estrita:
   * - Solar: sobre o raio exato `surfaceSpot + d * sunDirection` (compensa a compressão orbital de 60,3 → 3,62 R⊕
   *   para que o cone de umbra aponte paralelamente aos raios solares diretamente sobre a cidade eclipsada);
   * - Lunar: imersa no eixo anti-solar `-sunDirection` dentro do cone de umbra terrestre.
   */
  syzygyMoonLocalPos: THREE.Vector3;
  lunarUmbraImmersion: number;
  isTotalityActive: boolean;
}

/**
 * Interpola na esfera (SLERP) a posição instantânea do eixo de umbra usando os instantes UTC
 * calibrados (`timedCenterline`), garantindo precisão geográfica sobre cada cidade na hora real.
 */
export function interpolateCenterlineAtOffset(
  eclipse: EclipseCatalogEntry,
  offsetMinutes: number
): { lat: number; lng: number; direction: THREE.Vector3; active: boolean } {
  const [minM, maxM] = eclipse.windowMinutes;
  const clamped = clampEclipseOffsetMinutes(offsetMinutes);
  const active = clamped >= minM && clamped <= maxM;
  const timed = eclipse.timedCenterline;

  if (timed.length === 0) {
    const dir = latLngToVector3(eclipse.greatestLat, eclipse.greatestLng, 1.0).normalize();
    return { lat: eclipse.greatestLat, lng: eclipse.greatestLng, direction: dir, active };
  }

  const effectiveM = Math.max(timed[0]![2], Math.min(timed[timed.length - 1]![2], clamped));
  if (Math.abs(effectiveM) < 1e-4) {
    const dir = latLngToVector3(eclipse.greatestLat, eclipse.greatestLng, 1.0).normalize();
    return { lat: eclipse.greatestLat, lng: eclipse.greatestLng, direction: dir, active };
  }

  let segIdx = 0;
  for (let i = 0; i < timed.length - 1; i++) {
    if (effectiveM >= timed[i]![2] && effectiveM <= timed[i + 1]![2]) {
      segIdx = i;
      break;
    }
  }

  const a = timed[segIdx]!;
  const b = timed[Math.min(timed.length - 1, segIdx + 1)]!;
  const span = Math.max(1e-6, b[2] - a[2]);
  const t = Math.min(1, Math.max(0, (effectiveM - a[2]) / span));

  const v0 = latLngToVector3(a[0], a[1], 1.0);
  const v1 = latLngToVector3(b[0], b[1], 1.0);
  const dir = (t <= 1e-5 ? v0 : t >= 1 - 1e-5 ? v1 : slerpVectors(v0, v1, t)).normalize();
  const { lat, lng } = vector3ToLatLng(dir);
  return { lat, lng, direction: dir, active };
}

function resolveNearestStationLabels(
  eclipse: EclipseCatalogEntry,
  offsetMinutes: number
): { pt: string; en: string } {
  let best = eclipse.stations[0];
  let bestDiff = Infinity;
  for (const st of eclipse.stations) {
    const d = Math.abs(st.offsetMinutes - offsetMinutes);
    if (d < bestDiff) {
      bestDiff = d;
      best = st;
    }
  }
  if (best && bestDiff <= 14) {
    return { pt: best.labelPt, en: best.labelEn };
  }
  return { pt: eclipse.regionPt, en: eclipse.regionEn };
}

/**
 * Calcula a geometria física completa do eclipse (Sol, Lua, cone de umbra/penumbra e interseção terrestre).
 */
export function computeEclipseGeometry(
  eclipseId: EclipseId,
  offsetMinutes = 0
): EclipseInstantGeometry {
  const eclipse = ECLIPSES_CATALOG[eclipseId];
  const safeOffset = clampEclipseOffsetMinutes(offsetMinutes);
  const targetDate = resolveEclipseTargetDate(eclipseId, safeOffset);

  const subsolar = calculateSubsolarPoint(targetDate);
  const lunar = calculateLunarPosition(targetDate);
  const sunDirection = getSunDirectionVector(subsolar.latitude, subsolar.longitude);
  const moonDirection = lunar.earthFixedDirection.clone().normalize();

  const dotSM = Math.max(-1, Math.min(1, sunDirection.dot(moonDirection)));
  const sunMoonSeparationDeg = THREE.MathUtils.radToDeg(Math.acos(dotSM));

  const dSunMoonKm =
    eclipse.kind === "solar_total"
      ? AU_KM_ECLIPSE - lunar.distanceKm
      : AU_KM_ECLIPSE + lunar.distanceKm;

  const umbralConeLengthKm =
    (MOON_RADIUS_KM_ECLIPSE * dSunMoonKm) / (SUN_RADIUS_KM_ECLIPSE - MOON_RADIUS_KM_ECLIPSE);
  const surfaceToMoonKm = Math.max(300_000, lunar.distanceKm - EARTH_RADIUS_KM_ECLIPSE);

  const rawUmbraRadiusKm = Math.max(
    eclipse.umbraWidthKm * 0.5,
    ((umbralConeLengthKm - surfaceToMoonKm) / umbralConeLengthKm) * MOON_RADIUS_KM_ECLIPSE
  );
  const penumbraConeHalfTan =
    (SUN_RADIUS_KM_ECLIPSE + MOON_RADIUS_KM_ECLIPSE) / dSunMoonKm;
  const penumbraRadiusKm =
    eclipse.kind === "solar_total"
      ? MOON_RADIUS_KM_ECLIPSE + surfaceToMoonKm * penumbraConeHalfTan
      : EARTH_RADIUS_KM_ECLIPSE * 0.98;

  const umbraRadiusKm =
    eclipse.kind === "solar_total" ? rawUmbraRadiusKm : eclipse.umbraWidthKm * 0.5;

  const umbraAngularRad =
    eclipse.kind === "solar_total"
      ? Math.max(0.026, umbraRadiusKm / EARTH_RADIUS_KM_ECLIPSE)
      : 0.42;
  const penumbraAngularRad =
    eclipse.kind === "solar_total"
      ? Math.min(0.58, Math.max(0.28, penumbraRadiusKm / EARTH_RADIUS_KM_ECLIPSE))
      : Math.PI * 0.5;

  const interp = interpolateCenterlineAtOffset(eclipse, safeOffset);
  const labels = resolveNearestStationLabels(eclipse, safeOffset);

  const compressedOrbitR =
    MOON_SCENE_ORBIT_RADIUS * (lunar.distanceKm / MOON_MEAN_DISTANCE_KM);
  let syzygyMoonLocalPos: THREE.Vector3;

  if (eclipse.kind === "solar_total") {
    const proj = Math.max(0, interp.direction.dot(sunDirection));
    const rayDist = Math.max(2.35, compressedOrbitR - proj);
    syzygyMoonLocalPos = interp.direction
      .clone()
      .addScaledVector(sunDirection, rayDist);
  } else {
    const antiSun = sunDirection.clone().negate();
    const northPerp = new THREE.Vector3(0, 1, 0)
      .addScaledVector(antiSun, -antiSun.y)
      .normalize();
    const eastPerp = new THREE.Vector3().crossVectors(northPerp, antiSun).normalize();
    const sweepCross = (safeOffset / Math.max(1, eclipse.windowMinutes[1])) * 0.42;
    syzygyMoonLocalPos = antiSun
      .clone()
      .multiplyScalar(compressedOrbitR)
      .addScaledVector(northPerp, eclipse.gamma * 0.16)
      .addScaledVector(eastPerp, sweepCross);
  }

  let lunarUmbraImmersion = 0;
  if (eclipse.kind === "lunar_total") {
    const halfWin = Math.max(1, eclipse.windowMinutes[1]);
    const norm = Math.abs(safeOffset) / halfWin;
    lunarUmbraImmersion = norm <= 0.35 ? 1.0 : Math.max(0, 1 - (norm - 0.35) / 0.65);
  }

  return {
    eclipse,
    targetDate,
    offsetMinutes: safeOffset,
    subsolarLat: subsolar.latitude,
    subsolarLng: subsolar.longitude,
    sublunarLat: lunar.sublunarLatitude,
    sublunarLng: lunar.sublunarLongitude,
    lunarDistanceKm: Number(lunar.distanceKm.toFixed(1)),
    sunMoonSeparationDeg: Number(sunMoonSeparationDeg.toFixed(3)),
    umbralConeLengthKm: Number(umbralConeLengthKm.toFixed(1)),
    umbraRadiusKm: Number(umbraRadiusKm.toFixed(1)),
    penumbraRadiusKm: Number(penumbraRadiusKm.toFixed(1)),
    umbraAngularRad,
    penumbraAngularRad,
    shadowLat: Number(interp.lat.toFixed(4)),
    shadowLng: Number(interp.lng.toFixed(4)),
    activeLocationPt: labels.pt,
    activeLocationEn: labels.en,
    shadowDirection: interp.direction,
    sunDirection,
    moonDirection,
    syzygyMoonLocalPos,
    lunarUmbraImmersion: Number(lunarUmbraImmersion.toFixed(3)),
    isTotalityActive: interp.active,
  };
}

/**
 * Gera a fita geodésica 3D (malha triangular + bordas norte/sul) da faixa de totalidade sobre a esfera.
 */
export function buildTotalityRibbonGeometry(
  centerline: ReadonlyArray<readonly [lat: number, lng: number]>,
  umbraWidthKm: number,
  sphereRadius = TOTALITY_RIBBON_RADIUS
): THREE.BufferGeometry {
  const dense: THREE.Vector3[] = [];
  const stepsPerSeg = 12;

  for (let i = 0; i < centerline.length - 1; i++) {
    const a = latLngToVector3(centerline[i]![0], centerline[i]![1], 1.0);
    const b = latLngToVector3(centerline[i + 1]![0], centerline[i + 1]![1], 1.0);
    const limit = i === centerline.length - 2 ? stepsPerSeg : stepsPerSeg - 1;
    for (let s = 0; s <= limit; s++) {
      dense.push(slerpVectors(a, b, s / stepsPerSeg).normalize());
    }
  }

  const halfAngleRad = Math.max(0.019, (umbraWidthKm * 0.5) / EARTH_RADIUS_KM_ECLIPSE);
  const sinH = Math.sin(halfAngleRad);
  const cosH = Math.cos(halfAngleRad);

  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const tangent = new THREE.Vector3();
  const side = new THREE.Vector3();
  const left = new THREE.Vector3();
  const right = new THREE.Vector3();

  for (let i = 0; i < dense.length; i++) {
    const p = dense[i]!;
    if (i === 0 && dense.length > 1) {
      tangent.subVectors(dense[1]!, p);
    } else if (i === dense.length - 1 && dense.length > 1) {
      tangent.subVectors(p, dense[i - 1]!);
    } else if (dense.length > 2) {
      tangent.subVectors(dense[i + 1]!, dense[i - 1]!);
    } else {
      tangent.set(0, 1, 0);
    }

    side.crossVectors(p, tangent);
    if (side.lengthSq() < 1e-10) side.set(0, 1, 0).cross(p);
    side.normalize();

    left.copy(p).multiplyScalar(cosH).addScaledVector(side, sinH).multiplyScalar(sphereRadius);
    right.copy(p).multiplyScalar(cosH).addScaledVector(side, -sinH).multiplyScalar(sphereRadius);

    positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
    const u = dense.length > 1 ? i / (dense.length - 1) : 0;
    uvs.push(u, 0, u, 1);

    if (i < dense.length - 1) {
      const base = i * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Gera os pontos 3D da linha central da totalidade para renderização nítida sobre a fita de umbra.
 */
export function buildTotalityCenterlinePoints(
  centerline: ReadonlyArray<readonly [lat: number, lng: number]>,
  sphereRadius = TOTALITY_CENTERLINE_RADIUS
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const steps = 12;
  for (let i = 0; i < centerline.length - 1; i++) {
    const a = latLngToVector3(centerline[i]![0], centerline[i]![1], sphereRadius);
    const b = latLngToVector3(centerline[i + 1]![0], centerline[i + 1]![1], sphereRadius);
    const limit = i === centerline.length - 2 ? steps : steps - 1;
    for (let s = 0; s <= limit; s++) {
      points.push(slerpVectors(a, b, s / steps));
    }
  }
  return points;
}
