/**
 * Focos do FIRMS para o globo (D05) — funções puras.
 *
 * Princípio: cada ponto desenhado é um foco detectado (nada de manchas sintéticas que “somem” ao
 * aproximar). O servidor filtra por confiança, conta por país e envia TODOS os focos da janela
 * num formato colunar compacto (`FirmsColumns`); o cliente decodifica.
 */
import type { FirmsHotspot } from "./observatory-data";

/** Janelas aceitas pela API "area" do FIRMS (1 a 5 dias por consulta). */
export const FIRMS_WINDOWS = [1, 2, 5] as const;
export type FirmsWindowDays = (typeof FIRMS_WINDOWS)[number];

/** "nominal" oculta focos de baixa confiança (padrão); "all" mostra todos. */
export type FirmsConfidenceFilter = "nominal" | "all";

/** Versão do formato da resposta; vai na URL para não reaproveitar respostas antigas do cache HTTP. */
export const FIRMS_SCHEMA = 3;

export interface FirmsCountryStats {
  count: number;
  frpSum: number;
  frpMax: number;
}

export interface FirmsPayload {
  /** Todos os focos da janela após o filtro de confiança. */
  hotspots: FirmsHotspot[];
  total: number;
  /** Estatísticas por país (ISO 3166-1 alfa-3), contando todos os focos da janela. */
  byCountry: Record<string, FirmsCountryStats>;
  days: FirmsWindowDays;
  confidence: FirmsConfidenceFilter;
}

/**
 * Formato colunar (≈30 bytes por foco em JSON). Coordenadas com 3 casas (~110 m, abaixo do pixel
 * de 375 m do VIIRS); datas indexadas em `dates`; confiança 0 = baixa, 1 = nominal, 2 = alta;
 * dayNight 0 = noite, 1 = dia, -1 = desconhecido; hora HHMM como número (-1 = desconhecida).
 */
export interface FirmsColumns {
  format: "firms-columns-v1";
  count: number;
  lat: number[];
  lng: number[];
  frp: number[];
  brightness: number[];
  confidence: number[];
  dateIndex: number[];
  dates: string[];
  time: number[];
  dayNight: number[];
  satellite: number[];
  satellites: FirmsHotspot["satellite"][];
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

export function buildFirmsPayload(
  all: FirmsHotspot[],
  days: FirmsWindowDays,
  confidence: FirmsConfidenceFilter,
  options: { countryOf?: (lat: number, lng: number) => string | null } = {}
): FirmsPayload {
  const filtered = filterByConfidence(all, confidence);
  return {
    hotspots: filtered,
    total: filtered.length,
    byCountry: options.countryOf ? aggregateByCountry(filtered, options.countryOf) : {},
    days,
    confidence,
  };
}

const CONFIDENCE_CODE: Record<FirmsHotspot["confidence"], number> = { low: 0, nominal: 1, high: 2 };
const CONFIDENCE_FROM_CODE: FirmsHotspot["confidence"][] = ["low", "nominal", "high"];

export function encodeFirmsColumns(hotspots: FirmsHotspot[]): FirmsColumns {
  const dates: string[] = [];
  const dateIdx = new Map<string, number>();
  const satellites: FirmsHotspot["satellite"][] = [];
  const out: FirmsColumns = {
    format: "firms-columns-v1",
    count: hotspots.length,
    lat: [],
    lng: [],
    frp: [],
    brightness: [],
    confidence: [],
    dateIndex: [],
    dates,
    time: [],
    dayNight: [],
    satellite: [],
    satellites,
  };
  for (const h of hotspots) {
    let d = dateIdx.get(h.acqDate);
    if (d === undefined) {
      d = dates.length;
      dates.push(h.acqDate);
      dateIdx.set(h.acqDate, d);
    }
    let s = satellites.indexOf(h.satellite);
    if (s < 0) s = satellites.push(h.satellite) - 1;
    out.lat.push(round(h.lat, 3));
    out.lng.push(round(h.lng, 3));
    out.frp.push(round(h.frp, 1));
    out.brightness.push(Math.round(h.brightness));
    out.confidence.push(CONFIDENCE_CODE[h.confidence]);
    out.dateIndex.push(d);
    out.time.push(h.acqTime ? Number(h.acqTime) : -1);
    out.dayNight.push(h.daynight === "D" ? 1 : h.daynight === "N" ? 0 : -1);
    out.satellite.push(s);
  }
  return out;
}

function isNumberArray(v: unknown, n: number): v is number[] {
  return Array.isArray(v) && v.length === n;
}

/** Decodifica o formato colunar; devolve null se a estrutura não bater (resposta antiga/corrompida). */
export function decodeFirmsColumns(cols: unknown): FirmsHotspot[] | null {
  const c = cols as Partial<FirmsColumns> | null;
  if (!c || c.format !== "firms-columns-v1" || typeof c.count !== "number") return null;
  const n = c.count;
  const keys = ["lat", "lng", "frp", "brightness", "confidence", "dateIndex", "time", "dayNight", "satellite"] as const;
  if (!keys.every((k) => isNumberArray(c[k], n)) || !Array.isArray(c.dates) || !Array.isArray(c.satellites)) return null;
  const out: FirmsHotspot[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const acqDate = c.dates[c.dateIndex![i]] ?? "";
    const t = c.time![i];
    const acqTime = t >= 0 ? String(t).padStart(4, "0") : undefined;
    const dn = c.dayNight![i];
    out[i] = {
      id: `firms-${acqDate}-${acqTime ?? "----"}-${c.lat![i]}-${c.lng![i]}-${i}`,
      lat: c.lat![i],
      lng: c.lng![i],
      frp: c.frp![i],
      brightness: c.brightness![i],
      confidence: CONFIDENCE_FROM_CODE[c.confidence![i]] ?? "nominal",
      satellite: c.satellites[c.satellite![i]] ?? "VIIRS",
      acqDate,
      ...(acqTime ? { acqTime } : {}),
      ...(dn === 1 ? { daynight: "D" as const } : dn === 0 ? { daynight: "N" as const } : {}),
    };
  }
  return out;
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
