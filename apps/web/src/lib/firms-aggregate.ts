/**
 * Agregação dos focos do FIRMS para o globo (D05) — funções puras.
 * O CSV mundial de 5 dias tem ~190 mil linhas: o servidor filtra por confiança, agrega tudo
 * numa grade regular (heatmap em zoom distante) e manda ao cliente só os focos mais intensos.
 */
import type { FirmsHotspot } from "./observatory-data";

/** Janelas aceitas pela API "area" do FIRMS (1 a 5 dias por consulta). */
export const FIRMS_WINDOWS = [1, 2, 5] as const;
export type FirmsWindowDays = (typeof FIRMS_WINDOWS)[number];

/** "nominal" oculta focos de baixa confiança (padrão); "all" mostra todos. */
export type FirmsConfidenceFilter = "nominal" | "all";

/** Lado da célula da grade de agregação, em graus. */
export const FIRMS_CELL_DEG = 1;
/** Quantos focos individuais (os de maior FRP) vão para o cliente. */
export const FIRMS_MAX_POINTS = 5000;

export interface FirmsCell {
  /** Centro da célula. */
  lat: number;
  lng: number;
  count: number;
  frpSum: number;
  frpMax: number;
  /** Data (AAAA-MM-DD) do foco mais recente na célula. */
  latestDate: string;
}

export interface FirmsCountryStats {
  count: number;
  frpSum: number;
  frpMax: number;
}

export interface FirmsPayload {
  hotspots: FirmsHotspot[];
  cells: FirmsCell[];
  /** Focos após o filtro de confiança (antes do corte de FIRMS_MAX_POINTS). */
  total: number;
  /** Estatísticas por país (ISO 3166-1 alfa-3), contando todos os focos da janela. */
  byCountry: Record<string, FirmsCountryStats>;
  days: FirmsWindowDays;
  confidence: FirmsConfidenceFilter;
  /** Lista completa filtrada — fica só no servidor (recortes por área visível); não é serializada. */
  all: FirmsHotspot[];
}

/** Recorte geográfico: minLng,minLat,maxLng,maxLat. minLng > maxLng = atravessa o antimeridiano. */
export interface FirmsBbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

/** Teto de focos devolvidos num recorte de área visível (os de maior FRP). */
export const FIRMS_MAX_BBOX_POINTS = 12000;

export function parseFirmsWindow(value: string | null | undefined): FirmsWindowDays {
  const n = Number(value);
  return (FIRMS_WINDOWS as readonly number[]).includes(n) ? (n as FirmsWindowDays) : 1;
}

export function parseFirmsConfidence(value: string | null | undefined): FirmsConfidenceFilter {
  return value === "all" ? "all" : "nominal";
}

export function filterByConfidence(hotspots: FirmsHotspot[], filter: FirmsConfidenceFilter): FirmsHotspot[] {
  return filter === "all" ? hotspots : hotspots.filter((h) => h.confidence !== "low");
}

export function aggregateFirmsGrid(hotspots: FirmsHotspot[], cellDeg: number = FIRMS_CELL_DEG): FirmsCell[] {
  const cells = new Map<string, FirmsCell & { latSum: number; lngSum: number }>();
  for (const h of hotspots) {
    const row = Math.floor((h.lat + 90) / cellDeg);
    const col = Math.floor((h.lng + 180) / cellDeg);
    const key = `${row}:${col}`;
    const c = cells.get(key);
    if (c) {
      c.count += 1;
      c.frpSum += h.frp;
      c.frpMax = Math.max(c.frpMax, h.frp);
      c.latSum += h.lat;
      c.lngSum += h.lng;
      if (h.acqDate > c.latestDate) c.latestDate = h.acqDate;
    } else {
      cells.set(key, {
        lat: 0,
        lng: 0,
        count: 1,
        frpSum: h.frp,
        frpMax: h.frp,
        latestDate: h.acqDate,
        latSum: h.lat,
        lngSum: h.lng,
      });
    }
  }
  // Posição = centróide dos focos da célula (o mancha fica onde o fogo está, não no canto da grade).
  return [...cells.values()].map(({ latSum, lngSum, ...c }) => ({
    ...c,
    lat: round(latSum / c.count, 3),
    lng: round(lngSum / c.count, 3),
    frpSum: round(c.frpSum, 1),
  }));
}

export function aggregateByCountry(
  hotspots: FirmsHotspot[],
  countryOf: (lat: number, lng: number) => string | null
): Record<string, FirmsCountryStats> {
  const out: Record<string, FirmsCountryStats> = {};
  for (const h of hotspots) {
    const iso = countryOf(h.lat, h.lng);
    if (!iso) continue;
    const c = (out[iso] ??= { count: 0, frpSum: 0, frpMax: 0 });
    c.count += 1;
    c.frpSum += h.frp;
    c.frpMax = Math.max(c.frpMax, h.frp);
  }
  for (const c of Object.values(out)) c.frpSum = round(c.frpSum, 1);
  return out;
}

const topByFrp = (list: FirmsHotspot[], n: number) =>
  list.length > n ? [...list].sort((a, b) => b.frp - a.frp).slice(0, n) : list;

export function buildFirmsPayload(
  all: FirmsHotspot[],
  days: FirmsWindowDays,
  confidence: FirmsConfidenceFilter,
  options: { maxPoints?: number; countryOf?: (lat: number, lng: number) => string | null } = {}
): FirmsPayload {
  const filtered = filterByConfidence(all, confidence);
  return {
    hotspots: topByFrp(filtered, options.maxPoints ?? FIRMS_MAX_POINTS),
    cells: aggregateFirmsGrid(filtered),
    total: filtered.length,
    byCountry: options.countryOf ? aggregateByCountry(filtered, options.countryOf) : {},
    days,
    confidence,
    all: filtered,
  };
}

export function parseFirmsBbox(value: string | null | undefined): FirmsBbox | null {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLat > maxLat || minLat < -90 || maxLat > 90 || Math.abs(minLng) > 180 || Math.abs(maxLng) > 180) return null;
  return { minLng, minLat, maxLng, maxLat };
}

export function inFirmsBbox(lat: number, lng: number, b: FirmsBbox): boolean {
  if (lat < b.minLat || lat > b.maxLat) return false;
  return b.minLng <= b.maxLng ? lng >= b.minLng && lng <= b.maxLng : lng >= b.minLng || lng <= b.maxLng;
}

/** Todos os focos dentro do recorte (até o teto, mantendo os de maior FRP). */
export function selectFirmsInBbox(
  all: FirmsHotspot[],
  bbox: FirmsBbox,
  max: number = FIRMS_MAX_BBOX_POINTS
): { hotspots: FirmsHotspot[]; total: number } {
  const inside = all.filter((h) => inFirmsBbox(h.lat, h.lng, bbox));
  return { hotspots: topByFrp(inside, max), total: inside.length };
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
