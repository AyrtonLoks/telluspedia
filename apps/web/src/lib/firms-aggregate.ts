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

export interface FirmsPayload {
  hotspots: FirmsHotspot[];
  cells: FirmsCell[];
  /** Focos após o filtro de confiança (antes do corte de FIRMS_MAX_POINTS). */
  total: number;
  days: FirmsWindowDays;
  confidence: FirmsConfidenceFilter;
}

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

export function buildFirmsPayload(
  all: FirmsHotspot[],
  days: FirmsWindowDays,
  confidence: FirmsConfidenceFilter,
  maxPoints: number = FIRMS_MAX_POINTS
): FirmsPayload {
  const filtered = filterByConfidence(all, confidence);
  const cells = aggregateFirmsGrid(filtered);
  const hotspots =
    filtered.length > maxPoints ? [...filtered].sort((a, b) => b.frp - a.frp).slice(0, maxPoints) : filtered;
  return { hotspots, cells, total: filtered.length, days, confidence };
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
