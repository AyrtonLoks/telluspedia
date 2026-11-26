/**
 * Matemática esférica e ortodrômica pura para a Régua Geodésica (D37).
 *
 * Isolada de Three.js para custo zero no bundle SSR/inicial e testabilidade determinística.
 * Raio médio volumétrico/autálico terrestre IUGG/WGS84: R = 6371,0088 km.
 * Milha náutica internacional exata (BIPM): 1 nm = 1,852 km.
 */

export const EARTH_MEAN_RADIUS_KM = 6371.0088;
export const KM_PER_NAUTICAL_MILE = 1.852;
export const GEODESIC_RULER_RADIUS = 1.004;
export const MAX_RULER_POINTS = 16;

export interface GeoCoord {
  lat: number;
  lng: number;
}

export interface RulerWaypoint extends GeoCoord {
  id: string;
  label?: string;
}

export interface GeodesicSegmentMeasurement {
  index: number;
  from: RulerWaypoint;
  to: RulerWaypoint;
  distanceKm: number;
  distanceNm: number;
  cumulativeKm: number;
  cumulativeNm: number;
  initialAzimuthDeg: number;
  finalAzimuthDeg: number;
  centralAngleDeg: number;
  midpoint: GeoCoord;
}

export interface GeodesicRulerSummary {
  points: readonly RulerWaypoint[];
  segments: GeodesicSegmentMeasurement[];
  totalDistanceKm: number;
  totalDistanceNm: number;
  /** Azimute inicial do primeiro ao último ponto em linha ortodrômica direta (0°–360°). */
  directInitialAzimuthDeg: number | null;
  /** Azimute final de chegada na ortodrômica direta do primeiro ao último ponto (0°–360°). */
  directFinalAzimuthDeg: number | null;
  directDistanceKm: number;
  directDistanceNm: number;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function toRad(deg: number): number {
  return deg * DEG_TO_RAD;
}

function toDeg(rad: number): number {
  return rad * RAD_TO_DEG;
}

export function normalizeLongitude(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

export function clampLatitude(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}

export function kmToNauticalMiles(km: number): number {
  return km / KM_PER_NAUTICAL_MILE;
}

/** Ângulo central ortodrômico (em radianos) pela fórmula de Haversine numericamente estável. */
export function centralAngleRad(a: GeoCoord, b: GeoCoord): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat * 0.5);
  const sinDLng = Math.sin(dLng * 0.5);
  const h = Math.min(
    1,
    Math.max(0, sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng)
  );
  return 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Distância ortodrômica (grande círculo) em quilômetros via Haversine. */
export function haversineDistanceKm(a: GeoCoord, b: GeoCoord): number {
  return EARTH_MEAN_RADIUS_KM * centralAngleRad(a, b);
}

/** Azimute inicial verdadeiro (0° = Norte, 90° = Leste, 180° = Sul, 270° = Oeste). */
export function initialAzimuthDeg(a: GeoCoord, b: GeoCoord): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  if (Math.abs(x) < 1e-12 && Math.abs(y) < 1e-12) return 0;
  return ((toDeg(Math.atan2(y, x)) % 360) + 360) % 360;
}

/** Azimute final verdadeiro de chegada ao destino `b` seguindo o arco ortodrômico desde `a`. */
export function finalAzimuthDeg(a: GeoCoord, b: GeoCoord): number {
  if (centralAngleRad(a, b) < 1e-9) return 0;
  return (initialAzimuthDeg(b, a) + 180) % 360;
}

/** Ponto médio esférico entre `a` e `b` (com fallback seguro para pares antipodais). */
export function sphericalMidpoint(a: GeoCoord, b: GeoCoord): GeoCoord {
  const lat1 = toRad(a.lat);
  const lng1 = toRad(a.lng);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);

  const bx = Math.cos(lat2) * Math.cos(dLng);
  const by = Math.cos(lat2) * Math.sin(dLng);
  const sinSum = Math.sin(lat1) + Math.sin(lat2);
  const cosHyp = Math.hypot(Math.cos(lat1) + bx, by);

  if (Math.abs(sinSum) < 1e-9 && cosHyp < 1e-9) {
    // Par antipodal: escolhe ponto médio equatorial ortogonal determinístico
    return { lat: 0, lng: normalizeLongitude(a.lng + 90) };
  }

  const midLat = toDeg(Math.atan2(sinSum, cosHyp));
  const midLng = normalizeLongitude(toDeg(lng1 + Math.atan2(by, Math.cos(lat1) + bx)));
  return {
    lat: Number(midLat.toFixed(4)),
    lng: Number(midLng.toFixed(4)),
  };
}

const CARDINALS_PT = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"] as const;
const CARDINALS_EN = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] as const;

export function azimuthToCardinal(deg: number, locale: "pt-BR" | "en" = "pt-BR"): string {
  const normalized = ((deg % 360) + 360) % 360;
  const idx = Math.round(normalized / 45) % 8;
  return locale === "en" ? CARDINALS_EN[idx] : CARDINALS_PT[idx];
}

export function formatCoordPair(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lng).toFixed(2)}°${ew}`;
}

/** Consolida medições ortodrômicas para 2+ pontos consecutivos na superfície terrestre. */
export function computeGeodesicRulerSummary(points: readonly RulerWaypoint[]): GeodesicRulerSummary {
  const segments: GeodesicSegmentMeasurement[] = [];
  let cumulativeKm = 0;

  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1]!;
    const to = points[i]!;
    const angleRad = centralAngleRad(from, to);
    const distanceKm = EARTH_MEAN_RADIUS_KM * angleRad;
    const distanceNm = kmToNauticalMiles(distanceKm);
    cumulativeKm += distanceKm;

    segments.push({
      index: i,
      from,
      to,
      distanceKm,
      distanceNm,
      cumulativeKm,
      cumulativeNm: kmToNauticalMiles(cumulativeKm),
      initialAzimuthDeg: initialAzimuthDeg(from, to),
      finalAzimuthDeg: finalAzimuthDeg(from, to),
      centralAngleDeg: toDeg(angleRad),
      midpoint: sphericalMidpoint(from, to),
    });
  }

  const first = points[0];
  const last = points.length >= 2 ? points[points.length - 1] : undefined;
  const directDistanceKm = first && last ? haversineDistanceKm(first, last) : 0;

  return {
    points,
    segments,
    totalDistanceKm: cumulativeKm,
    totalDistanceNm: kmToNauticalMiles(cumulativeKm),
    directInitialAzimuthDeg: first && last ? initialAzimuthDeg(first, last) : null,
    directFinalAzimuthDeg: first && last ? finalAzimuthDeg(first, last) : null,
    directDistanceKm,
    directDistanceNm: kmToNauticalMiles(directDistanceKm),
  };
}
