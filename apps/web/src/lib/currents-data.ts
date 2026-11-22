import {
  WIND_GRID_COLS,
  WIND_GRID_LATS,
  WIND_GRID_LNGS,
  WIND_GRID_POINT_COUNT,
  WIND_GRID_ROWS,
  type WindColorStop,
} from "./winds-data";
import type { CurrentUnit, OceanCurrentGrid } from "./winds-types";

/**
 * Motor puro de Correntes Oceânicas Superficiais (D27b):
 * - Grade global 9 × 16 = 144 pontos via Open-Meteo Marine (Copernicus/Mercator Ocean & NOAA).
 * - Convenção oceanográfica ("para onde a corrente flui": 0° = Norte, 90° = Leste, 270° = Oeste).
 * - Interpolação bilinear mascarada apenas em células oceânicas + envoltório contínuo em ±180°.
 * - Fallback climatológico físico explícito de giros oceânicos (Corrente do Golfo, Kuroshio,
 *   Humboldt, Benguela, Brasil, Agulhas e Circumpolar Antártica) rotulado conforme T05.
 */

const DEG2RAD = Math.PI / 180;
const KMH_TO_MS = 1 / 3.6;
const MS_TO_KNOTS = 1.9438444924;

/** Escala de normalização (m/s) para correntes superficiais (~1,2 m/s ≈ 2,3 nós). */
export const CURRENT_SCALE_MAX_MS = 1.2;

/** Paleta oceânica dedicada (índigo profundo → azul marinho → ciano → turquesa → espuma clara). */
export const CURRENT_COLOR_STOPS: readonly WindColorStop[] = [
  { at: 0.0, rgb: [0.18, 0.36, 0.78], hex: "#2d5cc7" }, // fluxo lento / giro interno
  { at: 0.25, rgb: [0.06, 0.56, 0.84], hex: "#0f8fd6" }, // corrente moderada
  { at: 0.5, rgb: [0.05, 0.74, 0.85], hex: "#0dbcd9" }, // corrente ativa
  { at: 0.75, rgb: [0.22, 0.88, 0.76], hex: "#38e0c2" }, // corrente de contorno oeste
  { at: 1.0, rgb: [0.86, 0.96, 1.0], hex: "#dbf5ff" }, // núcleo intenso (Golfo / Kuroshio / ACC)
];

export function currentMsToUnit(ms: number, unit: CurrentUnit): number {
  return unit === "knots" ? ms * MS_TO_KNOTS : ms;
}

export function currentUnitLabel(unit: CurrentUnit): string {
  return unit === "knots" ? "nós" : "m/s";
}

export function formatCurrentSpeed(ms: number, unit: CurrentUnit): string {
  const value = currentMsToUnit(Math.max(0, ms), unit);
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: unit === "ms" ? 2 : 1,
    maximumFractionDigits: unit === "ms" ? 2 : 1,
  })} ${currentUnitLabel(unit)}`;
}

export function currentScaleLabels(unit: CurrentUnit): { at: number; text: string }[] {
  const fractions = [0, 0.25, 0.5, 0.75, 1];
  return fractions.map((at) => {
    const val = currentMsToUnit(CURRENT_SCALE_MAX_MS * at, unit);
    const formatted =
      at === 0
        ? "0"
        : val.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          });
    return { at, text: at === 1 ? `${formatted}+` : formatted };
  });
}

/**
 * Converte velocidade (m/s) e direção oceanográfica (graus, "para onde a corrente flui":
 * 0° = para Norte, 90° = para Leste, 180° = para Sul, 270° = para Oeste) em (u Leste, v Norte).
 */
export function oceanSpeedDirectionToUV(speedMs: number, towardDegrees: number): { u: number; v: number } {
  if (!Number.isFinite(speedMs) || !Number.isFinite(towardDegrees) || speedMs <= 0) {
    return { u: 0, v: 0 };
  }
  const rad = towardDegrees * DEG2RAD;
  const u = speedMs * Math.sin(rad);
  const v = speedMs * Math.cos(rad);
  return {
    u: Math.round(u * 1000) / 1000,
    v: Math.round(v * 1000) / 1000,
  };
}

export interface OceanCurrentSample {
  u: number;
  v: number;
  speed: number;
  inOcean: boolean;
}

/**
 * Interpolação bilinear mascarada apenas pelos vértices oceânicos da grade, com envoltório contínuo em ±180°.
 * Escreve diretamente em `out` para manter zero alocações no `useFrame`.
 */
export function sampleOceanCurrentGrid(
  grid: OceanCurrentGrid,
  lat: number,
  lng: number,
  out: OceanCurrentSample
): OceanCurrentSample {
  const rows = grid.lats.length;
  const cols = grid.lngs.length;
  if (rows < 2 || cols < 2) {
    out.u = 0;
    out.v = 0;
    out.speed = 0;
    out.inOcean = false;
    return out;
  }

  const minLat = grid.lats[0];
  const maxLat = grid.lats[rows - 1];
  const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
  const fRow = ((clampedLat - minLat) / (maxLat - minLat)) * (rows - 1);
  const r0 = Math.min(rows - 2, Math.floor(fRow));
  const r1 = r0 + 1;
  const ty = fRow - r0;

  const wrappedLng = ((((lng + 180) % 360) + 360) % 360) - 180;
  const lngStep = 360 / cols;
  const fCol = (wrappedLng - grid.lngs[0]) / lngStep;
  const c0 = ((Math.floor(fCol) % cols) + cols) % cols;
  const c1 = (c0 + 1) % cols;
  const tx = fCol - Math.floor(fCol);

  const i00 = r0 * cols + c0;
  const i10 = r0 * cols + c1;
  const i01 = r1 * cols + c0;
  const i11 = r1 * cols + c1;

  const w00 = (1 - tx) * (1 - ty) * (grid.mask[i00] > 0.5 ? 1 : 0);
  const w10 = tx * (1 - ty) * (grid.mask[i10] > 0.5 ? 1 : 0);
  const w01 = (1 - tx) * ty * (grid.mask[i01] > 0.5 ? 1 : 0);
  const w11 = tx * ty * (grid.mask[i11] > 0.5 ? 1 : 0);

  const oceanWeight = w00 + w10 + w01 + w11;
  if (oceanWeight < 0.25) {
    out.u = 0;
    out.v = 0;
    out.speed = 0;
    out.inOcean = false;
    return out;
  }

  const inv = 1 / oceanWeight;
  const u = (grid.u[i00] * w00 + grid.u[i10] * w10 + grid.u[i01] * w01 + grid.u[i11] * w11) * inv;
  const v = (grid.v[i00] * w00 + grid.v[i10] * w10 + grid.v[i01] * w01 + grid.v[i11] * w11) * inv;

  out.u = u;
  out.v = v;
  out.speed = Math.hypot(u, v);
  out.inOcean = true;
  return out;
}

/**
 * Máscara continental aproximada usada apenas no fallback climatológico offline (quando a API
 * Open-Meteo Marine não retornou a máscara real de terra/mar). No globo, a camada também aplica
 * o índice espacial Natural Earth (110m) para recorte costeiro exato.
 */
function isApproxLand(lat: number, lng: number): boolean {
  // Antártida
  if (lat <= -68) return true;
  // América do Norte
  if (lat >= 18 && lat <= 68 && lng >= -128 && lng <= -68) return true;
  // Groenlândia
  if (lat >= 62 && lat <= 78 && lng >= -55 && lng <= -18) return true;
  // América do Sul
  if (lat >= -50 && lat <= 10 && lng >= -76 && lng <= -38 && !(lat < -25 && lng < -70) && !(lat < -35 && lng > -58)) return true;
  // África
  if (lat >= -32 && lat <= 32 && lng >= -14 && lng <= 44 && !(lat < 4 && lng < 8)) return true;
  // Eurásia
  if (lat >= 16 && lat <= 70 && lng >= -6 && lng <= 132 && !(lat < 26 && lng > 52 && lng < 98)) return true;
  // Austrália
  if (lat >= -36 && lat <= -14 && lng >= 114 && lng <= 152) return true;
  return false;
}

function computeOceanStats(u: readonly number[], v: readonly number[], mask: readonly number[]) {
  let max = 0;
  let sum = 0;
  let oceanCells = 0;
  for (let i = 0; i < u.length; i++) {
    if (mask[i] < 0.5) continue;
    const spd = Math.hypot(u[i], v[i]);
    if (spd > max) max = spd;
    sum += spd;
    oceanCells++;
  }
  return {
    maxSpeedMs: Math.round(max * 100) / 100,
    meanSpeedMs: oceanCells > 0 ? Math.round((sum / oceanCells) * 100) / 100 : 0,
    oceanCells,
  };
}

/**
 * Climatologia física de referência dos grandes giros oceânicos superficiais (fallback explícito T05):
 * Corrente do Golfo, Kuroshio, Humboldt, Benguela, Brasil, Agulhas, Equatoriais e Circumpolar Antártica.
 */
export function buildClimatologyCurrentsGrid(nowIso: string = new Date().toISOString()): OceanCurrentGrid {
  const u: number[] = new Array(WIND_GRID_POINT_COUNT);
  const v: number[] = new Array(WIND_GRID_POINT_COUNT);
  const mask: number[] = new Array(WIND_GRID_POINT_COUNT);

  let idx = 0;
  for (let r = 0; r < WIND_GRID_ROWS; r++) {
    const lat = WIND_GRID_LATS[r];
    const absLat = Math.abs(lat);

    for (let c = 0; c < WIND_GRID_COLS; c++) {
      const lng = WIND_GRID_LNGS[c];

      if (isApproxLand(lat, lng)) {
        mask[idx] = 0;
        u[idx] = 0;
        v[idx] = 0;
        idx++;
        continue;
      }

      mask[idx] = 1;

      // Fluxo zonal base: Equatoriais para Oeste, Contracorrente Equatorial (~5°N), Circumpolar Antártica (Leste)
      let uVal = -0.36 * Math.exp(-Math.pow((absLat - 12) / 11, 2));
      uVal += 0.28 * Math.exp(-Math.pow((lat - 5) / 5, 2));
      uVal += 0.55 * Math.exp(-Math.pow((lat + 52) / 11, 2)); // Circumpolar Antártica (ACC)
      uVal += 0.28 * Math.exp(-Math.pow((lat - 44) / 11, 2)); // Deriva do Atlântico / Pacífico Norte

      let vVal = 0;

      // Corrente do Golfo (Atlântico NW → NE)
      const gulf = Math.exp(-(Math.pow((lat - 34) / 11, 2) + Math.pow((lng + 64) / 20, 2)));
      uVal += 0.72 * gulf;
      vVal += 0.65 * gulf;

      // Corrente de Kuroshio (Pacífico NW → NE)
      const kuroshio = Math.exp(-(Math.pow((lat - 32) / 11, 2) + Math.pow((lng - 142) / 22, 2)));
      uVal += 0.68 * kuroshio;
      vVal += 0.58 * kuroshio;

      // Corrente de Humboldt / Peru (Pacífico SE → Norte)
      const humboldt = Math.exp(-(Math.pow((lat + 22) / 16, 2) + Math.pow((lng + 82) / 12, 2)));
      vVal += 0.48 * humboldt;
      uVal -= 0.14 * humboldt;

      // Corrente de Benguela (Atlântico SE → Norte)
      const benguela = Math.exp(-(Math.pow((lat + 22) / 14, 2) + Math.pow((lng - 8) / 12, 2)));
      vVal += 0.42 * benguela;
      uVal -= 0.16 * benguela;

      // Corrente do Brasil (Atlântico SW → Sul)
      const brazil = Math.exp(-(Math.pow((lat + 24) / 14, 2) + Math.pow((lng + 40) / 14, 2)));
      vVal -= 0.44 * brazil;
      uVal -= 0.1 * brazil;

      // Corrente das Agulhas (Índico SW → SW)
      const agulhas = Math.exp(-(Math.pow((lat + 32) / 10, 2) + Math.pow((lng - 30) / 14, 2)));
      uVal -= 0.52 * agulhas;
      vVal -= 0.42 * agulhas;

      u[idx] = Math.round(uVal * 1000) / 1000;
      v[idx] = Math.round(vVal * 1000) / 1000;
      idx++;
    }
  }

  return {
    lats: [...WIND_GRID_LATS],
    lngs: [...WIND_GRID_LNGS],
    u,
    v,
    mask,
    modelTime: nowIso,
    ...computeOceanStats(u, v, mask),
  };
}

export interface OpenMeteoMarineItem {
  current_units?: {
    ocean_current_velocity?: string;
  };
  current?: {
    time?: string;
    ocean_current_velocity?: number | null;
    ocean_current_direction?: number | null;
  };
}

/** Constrói URL única (144 pontos globais) para correntes superficiais na API Open-Meteo Marine. */
export function buildOpenMeteoMarineUrl(): string {
  const lats: number[] = [];
  const lngs: number[] = [];
  for (const lat of WIND_GRID_LATS) {
    for (const lng of WIND_GRID_LNGS) {
      lats.push(lat);
      lngs.push(lng);
    }
  }
  const params = new URLSearchParams({
    latitude: lats.join(","),
    longitude: lngs.join(","),
    current: "ocean_current_velocity,ocean_current_direction",
  });
  return `https://marine-api.open-meteo.com/v1/marine?${params.toString()}`;
}

/**
 * Converte a resposta de 144 pontos da Open-Meteo Marine em `OceanCurrentGrid`.
 * Células com `ocean_current_velocity === null` são automaticamente marcadas como terra (`mask = 0`).
 * Exige ao menos 60 células oceânicas válidas.
 */
export function parseOpenMeteoMarineResponse(raw: unknown, fallbackIso: string): OceanCurrentGrid | null {
  if (!Array.isArray(raw) || raw.length !== WIND_GRID_POINT_COUNT) return null;

  const u: number[] = new Array(WIND_GRID_POINT_COUNT);
  const v: number[] = new Array(WIND_GRID_POINT_COUNT);
  const mask: number[] = new Array(WIND_GRID_POINT_COUNT);

  let modelTime = fallbackIso;

  for (let i = 0; i < WIND_GRID_POINT_COUNT; i++) {
    const item = raw[i] as OpenMeteoMarineItem | undefined;
    const rawVel = item?.current?.ocean_current_velocity;
    const rawDir = item?.current?.ocean_current_direction;

    if (
      typeof rawVel === "number" &&
      Number.isFinite(rawVel) &&
      typeof rawDir === "number" &&
      Number.isFinite(rawDir)
    ) {
      const unitStr = item?.current_units?.ocean_current_velocity ?? "km/h";
      const speedMs = unitStr === "m/s" ? rawVel : rawVel * KMH_TO_MS;
      const vec = oceanSpeedDirectionToUV(speedMs, rawDir);
      mask[i] = 1;
      u[i] = vec.u;
      v[i] = vec.v;
      if (modelTime === fallbackIso && typeof item?.current?.time === "string") {
        modelTime = `${item.current.time}:00Z`.replace(/Z:00Z$/, "Z").replace(/:00:00Z$/, ":00Z");
      }
    } else {
      mask[i] = 0;
      u[i] = 0;
      v[i] = 0;
    }
  }

  const stats = computeOceanStats(u, v, mask);
  if (stats.oceanCells < 60) return null;

  return {
    lats: [...WIND_GRID_LATS],
    lngs: [...WIND_GRID_LNGS],
    u,
    v,
    mask,
    modelTime,
    ...stats,
  };
}

export function isValidOceanCurrentGrid(value: unknown): value is OceanCurrentGrid {
  if (!value || typeof value !== "object") return false;
  const g = value as Partial<OceanCurrentGrid>;
  const expected = Array.isArray(g.lats) && Array.isArray(g.lngs) ? g.lats.length * g.lngs.length : 0;
  return (
    expected >= 4 &&
    Array.isArray(g.u) &&
    Array.isArray(g.v) &&
    Array.isArray(g.mask) &&
    g.u.length === expected &&
    g.v.length === expected &&
    g.mask.length === expected &&
    typeof g.oceanCells === "number" &&
    g.oceanCells > 0
  );
}
