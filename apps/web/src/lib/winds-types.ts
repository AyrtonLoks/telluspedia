/**
 * Tipos leves da camada de Ventos Globais (D27a).
 * Separados do motor de interpolação/climatologia para manter o bundle inicial enxuto (T35).
 */

export type WindAltitude = "surface" | "jet250";
export type WindUnit = "kmh" | "knots";

export interface WindGrid {
  /** Latitudes em ordem crescente (-72 .. +72, passo 18°). */
  lats: number[];
  /** Longitudes em ordem crescente (-180 .. +157.5, passo 22.5°). */
  lngs: number[];
  /** Componente zonal u (m/s, positivo para Leste), row-major [latIdx * cols + lngIdx]. */
  u: number[];
  /** Componente meridional v (m/s, positivo para Norte), row-major [latIdx * cols + lngIdx]. */
  v: number[];
  /** Nível atmosférico representado pela grade. */
  altitude: WindAltitude;
  /** Horário de referência da rodada do modelo (ISO 8601). */
  modelTime: string;
  /** Velocidade máxima na grade (m/s). */
  maxSpeedMs: number;
  /** Velocidade média na grade (m/s). */
  meanSpeedMs: number;
}

export interface WindFieldPayload {
  surface: WindGrid;
  jet250: WindGrid;
}

export const DEFAULT_WIND_ALTITUDE: WindAltitude = "surface";
export const DEFAULT_WIND_UNIT: WindUnit = "kmh";
