/**
 * Constantes e tipos dos satélites sem o `satellite.js` (T35): o store e o painel usam estes;
 * o SGP4 (`satellites.ts`) só carrega quando a camada ISS_SATELLITES é ligada.
 */
export const ISS_NORAD_ID = 25544;

export type SatelliteCategory = "station" | "visual";

export interface SatelliteTle {
  name: string;
  noradId: number;
  category: SatelliteCategory;
  line1: string;
  line2: string;
  /** Época do TLE (ISO), para mostrar a idade do dado. */
  epoch: string;
}
