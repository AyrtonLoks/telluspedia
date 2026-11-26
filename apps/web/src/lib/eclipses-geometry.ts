/**
 * Geometria física de umbra/penumbra e faixa de totalidade 3D para eclipses solares e lunares (D41).
 * Alinhada estritamente à projeção esférica não-espelhada do Three.js (AGENTS.md §1).
 */

import * as THREE from "three";
import { calculateLunarPosition, calculateSubsolarPoint, getSunDirectionVector } from "./astronomy";
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

export const TOTALITY_RIBBON_RADIUS = 1.0028;
export const TOTALITY_CENTERLINE_RADIUS = 1.0033;
export const ECLIPSE_SHADOW_SHELL_RADIUS = 1.0018;

export interface EclipseInstantGeometry {
  eclipse: EclipseCatalogEntry;
  targetDate: Date;
  offsetMinutes: number;
  /** Ponto subsolar em coordenadas geográficas (graus). */
  subsolarLat: number;
  subsolarLng: number;
  /** Ponto sublunar em coordenadas geográficas (graus, Meeus Cap. 47). */
  sublunarLat: number;
  sublunarLng: number;
  /** Distância geocêntrica Terra–Lua em km no instante do eclipse. */
  lunarDistanceKm: number;
  /** Separação angular geocêntrica entre os vetores Sol e Lua (graus: ~0° solar, ~180° lunar). */
  sunMoonSeparationDeg: number;
  /** Comprimento do cone de umbra lunar (km) a partir do centro da Lua. */
  umbralConeLengthKm: number;
  /** Raio físico da umbra projetada na superfície terrestre (km). */
  umbraRadiusKm: number;
  /** Raio físico da penumbra projetada na superfície terrestre (km). */
  penumbraRadiusKm: number;
  /** Raio angular da umbra sobre a esfera terrestre (radianos, com piso mínimo de legibilidade visual). */
  umbraAngularRad: number;
  /** Raio angular da penumbra sobre a esfera terrestre (radianos). */
  penumbraAngularRad: number;
  /** Coordenada instantânea do centro da sombra (ou zênite sublunar no eclipse lunar). */
  shadowLat: number;
  shadowLng: number;
  /** Vetor unitário 3D no referencial fixo da Terra apontando para o centro da sombra. */
  shadowDirection: THREE.Vector3;
  /** Vetor direção solar no referencial fixo da Terra. */
  sunDirection: THREE.Vector3;
  /** Vetor direção lunar no referencial fixo da Terra. */
  moonDirection: THREE.Vector3;
  /** Fração de imersão da Lua na umbra terrestre em [0, 1] (0 em eclipses solares). */
  lunarUmbraImmersion: number;
  /** Verdadeiro enquanto o offset está dentro da janela central de totalidade na superfície. */
  isTotalityActive: boolean;
}

/**
 * Interpola na esfera (SLERP) a posição instantânea do eixo de umbra ao longo da linha central
 * calibrada do eclipse, garantindo que `offsetMinutes = 0` coincida exatamente com `(greatestLat, greatestLng)`.
 */
export function interpolateCenterlineAtOffset(
  eclipse: EclipseCatalogEntry,
  offsetMinutes: number
): { lat: number; lng: number; direction: THREE.Vector3; active: boolean } {
  const [minM, maxM] = eclipse.windowMinutes;
  const clamped = clampEclipseOffsetMinutes(offsetMinutes);
  const active = clamped >= minM && clamped <= maxM;
  const pts = eclipse.centerline;
  const gIdx = Math.max(0, Math.min(pts.length - 1, eclipse.greatestCenterlineIndex));

  if (pts.length === 0) {
    const dir = latLngToVector3(eclipse.greatestLat, eclipse.greatestLng, 1.0).normalize();
    return { lat: eclipse.greatestLat, lng: eclipse.greatestLng, direction: dir, active };
  }
  if (Math.abs(clamped) < 1e-4 || pts.length === 1) {
    const [gLat, gLng] = pts[gIdx]!;
    const dir = latLngToVector3(gLat, gLng, 1.0).normalize();
    return { lat: gLat, lng: gLng, direction: dir, active };
  }

  let floatIdx: number;
  if (clamped < 0) {
    const frac = minM < 0 ? Math.min(1, Math.max(0, (clamped - minM) / (0 - minM))) : 1;
    floatIdx = frac * gIdx;
  } else {
    const frac = maxM > 0 ? Math.min(1, Math.max(0, clamped / maxM)) : 0;
    floatIdx = gIdx + frac * (pts.length - 1 - gIdx);
  }

  const i0 = Math.max(0, Math.min(pts.length - 1, Math.floor(floatIdx)));
  const i1 = Math.max(0, Math.min(pts.length - 1, Math.ceil(floatIdx)));
  const t = floatIdx - i0;
  const v0 = latLngToVector3(pts[i0]![0], pts[i0]![1], 1.0);
  const v1 = latLngToVector3(pts[i1]![0], pts[i1]![1], 1.0);
  const dir = (i0 === i1 ? v0 : slerpVectors(v0, v1, t)).normalize();
  const { lat, lng } = vector3ToLatLng(dir);
  return { lat, lng, direction: dir, active };
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

  // Distância Sol–Lua aproximada durante sizígia
  const dSunMoonKm =
    eclipse.kind === "solar_total"
      ? AU_KM_ECLIPSE - lunar.distanceKm
      : AU_KM_ECLIPSE + lunar.distanceKm;

  // Comprimento do cone de umbra lunar: L_u = R_Moon * d_SunMoon / (R_Sun - R_Moon)
  const umbralConeLengthKm =
    (MOON_RADIUS_KM_ECLIPSE * dSunMoonKm) / (SUN_RADIUS_KM_ECLIPSE - MOON_RADIUS_KM_ECLIPSE);

  // Distância da superfície terrestre sublunar ao centro da Lua
  const surfaceToMoonKm = Math.max(300_000, lunar.distanceKm - EARTH_RADIUS_KM_ECLIPSE);

  // Raios físicos da umbra e penumbra na superfície terrestre
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

  // Raios angulares na esfera unitária (piso visual sutil de 0.028 rad ≈ 180 km para a umbra ser legível do espaço)
  const umbraAngularRad =
    eclipse.kind === "solar_total"
      ? Math.max(0.028, umbraRadiusKm / EARTH_RADIUS_KM_ECLIPSE)
      : 0.42;
  const penumbraAngularRad =
    eclipse.kind === "solar_total"
      ? Math.min(0.62, Math.max(0.28, penumbraRadiusKm / EARTH_RADIUS_KM_ECLIPSE))
      : Math.PI * 0.5;

  const interp = interpolateCenterlineAtOffset(eclipse, safeOffset);

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
    shadowDirection: interp.direction,
    sunDirection,
    moonDirection,
    lunarUmbraImmersion: Number(lunarUmbraImmersion.toFixed(3)),
    isTotalityActive: interp.active,
  };
}

/**
 * Gera a fita geodésica 3D (malha triangular sobre a esfera) da faixa de totalidade de um eclipse solar.
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

  // Meia-largura angular real com piso mínimo de legibilidade cartográfica (~115 km = 0.018 rad)
  const halfAngleRad = Math.max(0.018, (umbraWidthKm * 0.5) / EARTH_RADIUS_KM_ECLIPSE);
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
