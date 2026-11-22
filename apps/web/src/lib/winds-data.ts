import type { WindAltitude, WindFieldPayload, WindGrid, WindUnit } from "./winds-types";

/**
 * Motor puro da camada de Ventos Globais (D27a):
 * - Grade global compacta 9 × 16 = 144 pontos (18° lat × 22,5° lng) compatível com NOAA GFS via Open-Meteo.
 * - Conversão meteorológica (direção "de onde sopra" → vetor u/v Leste/Norte em m/s).
 * - Interpolação bilinear esférica sem alocação (wrapper contínuo em ±180°).
 * - Climatologia física explícita (Alísios, Ventos de Oeste, Polares e Corrente de Jato) usada
 *   exclusivamente como fallback rotulado (T05) quando o provedor NOAA GFS está indisponível.
 */

export const WIND_GRID_LATS: readonly number[] = [-72, -54, -36, -18, 0, 18, 36, 54, 72];
export const WIND_GRID_LNGS: readonly number[] = [
  -180, -157.5, -135, -112.5, -90, -67.5, -45, -22.5,
  0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5,
];

export const WIND_GRID_ROWS = WIND_GRID_LATS.length;
export const WIND_GRID_COLS = WIND_GRID_LNGS.length;
export const WIND_GRID_POINT_COUNT = WIND_GRID_ROWS * WIND_GRID_COLS;

const DEG2RAD = Math.PI / 180;
const MS_TO_KMH = 3.6;
const MS_TO_KNOTS = 1.9438444924;

/** Escala de normalização (m/s) usada na rampa de cor do shader e na legenda de velocidade. */
export const WIND_SCALE_MAX_MS: Record<WindAltitude, number> = {
  surface: 24, // ~86 km/h / ~47 nós (ventania forte / Beaufort 9 em superfície)
  jet250: 70, // ~252 km/h / ~136 nós (núcleo da corrente de jato)
};

export interface WindColorStop {
  /** Posição normalizada [0..1]. */
  at: number;
  /** Cor RGB normalizada [0..1] para o shader GLSL. */
  rgb: readonly [number, number, number];
  /** Cor CSS para a barra de legenda. */
  hex: string;
}

/** Rampa perceptual alinhada entre o shader GPU e a legenda do painel. */
export const WIND_COLOR_STOPS: readonly WindColorStop[] = [
  { at: 0.0, rgb: [0.22, 0.74, 0.97], hex: "#38bdf8" }, // brisa calma (ciano)
  { at: 0.25, rgb: [0.20, 0.83, 0.60], hex: "#34d399" }, // moderado (esmeralda)
  { at: 0.5, rgb: [0.98, 0.80, 0.08], hex: "#facc15" }, // forte (amarelo)
  { at: 0.75, rgb: [0.98, 0.57, 0.24], hex: "#fb923c" }, // muito forte (laranja)
  { at: 1.0, rgb: [0.96, 0.25, 0.37], hex: "#f43f5e" }, // vendaval / núcleo de jato (rosa-vermelho)
];

export const WIND_ALTITUDE_META: Record<
  WindAltitude,
  { label: string; shortLabel: string; description: string }
> = {
  surface: {
    label: "Superfície (10 m)",
    shortLabel: "10 m",
    description: "Ventos a 10 metros acima da superfície (alísios, brisas sinóticas e ventos de oeste).",
  },
  jet250: {
    label: "Jato (250 hPa)",
    shortLabel: "250 hPa",
    description: "Correntes de jato em alta troposfera (~10,5 km de altitude), guiando frentes e ciclones.",
  },
};

export function msToUnit(ms: number, unit: WindUnit): number {
  return unit === "knots" ? ms * MS_TO_KNOTS : ms * MS_TO_KMH;
}

export function unitLabel(unit: WindUnit): string {
  return unit === "knots" ? "nós" : "km/h";
}

export function formatWindSpeed(ms: number, unit: WindUnit): string {
  const value = msToUnit(Math.max(0, ms), unit);
  return `${Math.round(value).toLocaleString("pt-BR")} ${unitLabel(unit)}`;
}

/** Rótulos de marcação da barra de legenda para a altitude e unidade ativas. */
export function windScaleLabels(altitude: WindAltitude, unit: WindUnit): { at: number; text: string }[] {
  const maxMs = WIND_SCALE_MAX_MS[altitude];
  const fractions = [0, 0.25, 0.5, 0.75, 1];
  return fractions.map((at) => {
    const val = Math.round(msToUnit(maxMs * at, unit));
    const suffix = at === 1 ? "+" : "";
    return { at, text: `${val}${suffix}` };
  });
}

/**
 * Converte velocidade (m/s) e direção meteorológica (graus, 0° = vento vindo do Norte,
 * 90° = vindo do Leste, 270° = vindo do Oeste) nos componentes vetoriais (u Leste, v Norte).
 */
export function speedDirectionToUV(speedMs: number, fromDegrees: number): { u: number; v: number } {
  if (!Number.isFinite(speedMs) || !Number.isFinite(fromDegrees) || speedMs <= 0) {
    return { u: 0, v: 0 };
  }
  const rad = fromDegrees * DEG2RAD;
  const u = -speedMs * Math.sin(rad);
  const v = -speedMs * Math.cos(rad);
  return {
    u: Math.round(u * 100) / 100,
    v: Math.round(v * 100) / 100,
  };
}

export function computeWindStats(u: readonly number[], v: readonly number[]): {
  maxSpeedMs: number;
  meanSpeedMs: number;
} {
  const n = Math.min(u.length, v.length);
  if (n === 0) return { maxSpeedMs: 0, meanSpeedMs: 0 };
  let max = 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const spd = Math.hypot(u[i], v[i]);
    if (spd > max) max = spd;
    sum += spd;
  }
  return {
    maxSpeedMs: Math.round(max * 10) / 10,
    meanSpeedMs: Math.round((sum / n) * 10) / 10,
  };
}

export interface WindSample {
  u: number;
  v: number;
  speed: number;
}

/**
 * Interpolação bilinear esférica sobre a grade UV com envoltório contínuo em ±180° de longitude.
 * Escreve diretamente em `out` para manter zero alocações no loop de animação 3D.
 */
export function sampleWindGrid(grid: WindGrid, lat: number, lng: number, out: WindSample): WindSample {
  const rows = grid.lats.length;
  const cols = grid.lngs.length;
  if (rows < 2 || cols < 2) {
    out.u = 0;
    out.v = 0;
    out.speed = 0;
    return out;
  }

  const minLat = grid.lats[0];
  const maxLat = grid.lats[rows - 1];
  const latSpan = maxLat - minLat;
  const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
  const fRow = ((clampedLat - minLat) / latSpan) * (rows - 1);
  const r0 = Math.min(rows - 2, Math.floor(fRow));
  const r1 = r0 + 1;
  const ty = fRow - r0;

  // Envolve longitude para [-180, 180)
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

  const w00 = (1 - tx) * (1 - ty);
  const w10 = tx * (1 - ty);
  const w01 = (1 - tx) * ty;
  const w11 = tx * ty;

  const u = grid.u[i00] * w00 + grid.u[i10] * w10 + grid.u[i01] * w01 + grid.u[i11] * w11;
  const v = grid.v[i00] * w00 + grid.v[i10] * w10 + grid.v[i01] * w01 + grid.v[i11] * w11;

  out.u = u;
  out.v = v;
  out.speed = Math.hypot(u, v);
  return out;
}

/**
 * Gera grade climatológica física de referência (células de Hadley, Ferrel e Polares + ondas de Rossby)
 * usada exclusivamente como fallback rotulado (T05) quando o provedor NOAA GFS estiver indisponível.
 */
export function buildClimatologyWindField(nowIso: string = new Date().toISOString()): WindFieldPayload {
  const buildLevel = (altitude: WindAltitude): WindGrid => {
    const u: number[] = new Array(WIND_GRID_POINT_COUNT);
    const v: number[] = new Array(WIND_GRID_POINT_COUNT);

    let idx = 0;
    for (let r = 0; r < WIND_GRID_ROWS; r++) {
      const lat = WIND_GRID_LATS[r];
      const latRad = lat * DEG2RAD;
      const absLat = Math.abs(lat);
      const signLat = lat === 0 ? 0 : Math.sign(lat);

      for (let c = 0; c < WIND_GRID_COLS; c++) {
        const lng = WIND_GRID_LNGS[c];
        const lngRad = lng * DEG2RAD;

        if (altitude === "surface") {
          // Alísios tropicais (-u), Ventos de Oeste em latitudes médias (+u, mais fortes no Hemisfério Sul) e Polares (-u)
          const trade = -8.5 * Math.exp(-Math.pow(absLat / 24, 2));
          const southernBoost = lat < 0 ? 1.35 : 1.0;
          const westerly = 11.5 * southernBoost * Math.exp(-Math.pow((absLat - 48) / 14, 2));
          const polar = -5.5 * Math.exp(-Math.pow((absLat - 74) / 11, 2));
          const rossby = 2.4 * Math.sin(3 * lngRad + latRad * 2);

          const uVal = trade + westerly + polar + rossby * 0.6;
          // Convergência para a ZCIT nos trópicos e meandros baroclínicos nas latitudes médias
          const hadleyV = -signLat * 2.8 * Math.sin((absLat / 30) * Math.PI) * (absLat < 30 ? 1 : 0);
          const waveV = 3.2 * Math.cos(3 * lngRad - latRad * 1.5) * Math.sin(absLat * DEG2RAD);
          const vVal = hadleyV + waveV;

          u[idx] = Math.round(uVal * 100) / 100;
          v[idx] = Math.round(vVal * 100) / 100;
        } else {
          // Corrente de jato em 250 hPa (~10,5 km): forte fluxo para Leste em ±32°–54° com ondas de Rossby
          const subtropicalJet = 38 * Math.exp(-Math.pow((absLat - 34) / 11, 2));
          const polarJet = 30 * (lat < 0 ? 1.2 : 1.0) * Math.exp(-Math.pow((absLat - 54) / 11, 2));
          const equatorialEasterly = -8 * Math.exp(-Math.pow(absLat / 14, 2));
          const jetModulation = 1 + 0.22 * Math.sin(2 * lngRad + (lat < 0 ? 1.1 : -0.4));

          const uVal = (subtropicalJet + polarJet) * jetModulation + equatorialEasterly;
          const vVal = 13 * Math.cos(4 * lngRad + latRad * 2) * Math.exp(-Math.pow((absLat - 42) / 18, 2));

          u[idx] = Math.round(uVal * 100) / 100;
          v[idx] = Math.round(vVal * 100) / 100;
        }
        idx++;
      }
    }

    const stats = computeWindStats(u, v);
    return {
      lats: [...WIND_GRID_LATS],
      lngs: [...WIND_GRID_LNGS],
      u,
      v,
      altitude,
      modelTime: nowIso,
      ...stats,
    };
  };

  return {
    surface: buildLevel("surface"),
    jet250: buildLevel("jet250"),
  };
}

export interface OpenMeteoWindItem {
  current?: {
    time?: string;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
  hourly?: {
    time?: string[];
    wind_speed_250hPa?: (number | null)[];
    wind_direction_250hPa?: (number | null)[];
  };
}

/** Constrói a URL única de grade global (144 pontos) para o modelo NOAA GFS no Open-Meteo. */
export function buildOpenMeteoGfsUrl(): string {
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
    current: "wind_speed_10m,wind_direction_10m",
    hourly: "wind_speed_250hPa,wind_direction_250hPa",
    forecast_hours: "1",
    wind_speed_unit: "ms",
  });
  return `https://api.open-meteo.com/v1/gfs?${params.toString()}`;
}

/**
 * Converte a resposta de 144 pontos do Open-Meteo GFS em `WindFieldPayload`.
 * Retorna `null` se a resposta estiver malformada ou com menos de 80% de células válidas.
 */
export function parseOpenMeteoGfsResponse(raw: unknown, fallbackIso: string): WindFieldPayload | null {
  if (!Array.isArray(raw) || raw.length !== WIND_GRID_POINT_COUNT) return null;

  const surfaceU: number[] = new Array(WIND_GRID_POINT_COUNT);
  const surfaceV: number[] = new Array(WIND_GRID_POINT_COUNT);
  const jetU: number[] = new Array(WIND_GRID_POINT_COUNT);
  const jetV: number[] = new Array(WIND_GRID_POINT_COUNT);

  let validSurface = 0;
  let validJet = 0;
  let surfaceTime = fallbackIso;
  let jetTime = fallbackIso;

  for (let i = 0; i < WIND_GRID_POINT_COUNT; i++) {
    const item = raw[i] as OpenMeteoWindItem | undefined;
    const sSpeed = item?.current?.wind_speed_10m;
    const sDir = item?.current?.wind_direction_10m;
    if (typeof sSpeed === "number" && Number.isFinite(sSpeed) && typeof sDir === "number" && Number.isFinite(sDir)) {
      const vec = speedDirectionToUV(sSpeed, sDir);
      surfaceU[i] = vec.u;
      surfaceV[i] = vec.v;
      validSurface++;
      if (surfaceTime === fallbackIso && typeof item?.current?.time === "string") {
        surfaceTime = `${item.current.time}:00Z`.replace(/Z:00Z$/, "Z").replace(/:00:00Z$/, ":00Z");
      }
    } else {
      surfaceU[i] = 0;
      surfaceV[i] = 0;
    }

    const jSpeed = item?.hourly?.wind_speed_250hPa?.[0];
    const jDir = item?.hourly?.wind_direction_250hPa?.[0];
    if (typeof jSpeed === "number" && Number.isFinite(jSpeed) && typeof jDir === "number" && Number.isFinite(jDir)) {
      const vec = speedDirectionToUV(jSpeed, jDir);
      jetU[i] = vec.u;
      jetV[i] = vec.v;
      validJet++;
      if (jetTime === fallbackIso && typeof item?.hourly?.time?.[0] === "string") {
        jetTime = `${item.hourly.time[0]}:00Z`.replace(/Z:00Z$/, "Z").replace(/:00:00Z$/, ":00Z");
      }
    } else {
      jetU[i] = 0;
      jetV[i] = 0;
    }
  }

  const minValid = Math.floor(WIND_GRID_POINT_COUNT * 0.8);
  if (validSurface < minValid || validJet < minValid) return null;

  return {
    surface: {
      lats: [...WIND_GRID_LATS],
      lngs: [...WIND_GRID_LNGS],
      u: surfaceU,
      v: surfaceV,
      altitude: "surface",
      modelTime: surfaceTime,
      ...computeWindStats(surfaceU, surfaceV),
    },
    jet250: {
      lats: [...WIND_GRID_LATS],
      lngs: [...WIND_GRID_LNGS],
      u: jetU,
      v: jetV,
      altitude: "jet250",
      modelTime: jetTime,
      ...computeWindStats(jetU, jetV),
    },
  };
}

export function isValidWindFieldPayload(value: unknown): value is WindFieldPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<WindFieldPayload>;
  const check = (g: WindGrid | undefined) =>
    !!g &&
    Array.isArray(g.lats) &&
    Array.isArray(g.lngs) &&
    Array.isArray(g.u) &&
    Array.isArray(g.v) &&
    g.lats.length >= 2 &&
    g.lngs.length >= 2 &&
    g.u.length === g.lats.length * g.lngs.length &&
    g.v.length === g.u.length;
  return check(v.surface) && check(v.jet250);
}
