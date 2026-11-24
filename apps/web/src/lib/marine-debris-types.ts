/**
 * Tipos e padrões leves de Lixo Marítimo & Giros Oceânicos (D29).
 * Separado de `marine-debris-data.ts` para manter `/` abaixo de 160 KiB (T25).
 */

export type OceanGyreId =
  | "north-pacific"
  | "south-pacific"
  | "north-atlantic"
  | "south-atlantic"
  | "indian-ocean";

export type MarineDebrisWindage = 0.01 | 0.02 | 0.03;
export type MarineDebrisHorizonMonths = 12 | 24 | 36;

export const DEFAULT_DEBRIS_WINDAGE: MarineDebrisWindage = 0.02;
export const DEFAULT_DEBRIS_HORIZON_MONTHS: MarineDebrisHorizonMonths = 24;

export interface DebrisReleasePoint {
  lat: number;
  lng: number;
  label?: string;
}
