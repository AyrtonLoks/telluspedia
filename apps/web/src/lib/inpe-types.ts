/**
 * Tipos leves e constantes padrão da integração INPE BDQueimadas & TerraBrasilis (D30).
 * Mantido sem dependências pesadas para preservar First Load JS de `/` < 160 KiB (T25).
 */

import type { FirmsHotspot } from "./observatory-data";

export type FireSourceProvider = "firms" | "inpe";

export type BrazilianBiomeId =
  | "amazonia"
  | "cerrado"
  | "mata_atlantica"
  | "caatinga"
  | "pantanal"
  | "pampa";

export type ProdesBiomeId = "amazonia" | "cerrado";

export const DEFAULT_FIRE_SOURCE: FireSourceProvider = "firms";
export const DEFAULT_PRODES_BIOME: ProdesBiomeId = "amazonia";

export interface InpeBiomeSummary {
  id: BrazilianBiomeId;
  namePt: string;
  nameEn: string;
  count: number;
  totalFrp: number;
  maxFrp: number;
}

export interface InpeBdQueimadasPayload {
  hotspots: FirmsHotspot[];
  total: number;
  referenceDate: string;
  byBiome: InpeBiomeSummary[];
  satellites: string[];
  scope: "America_Sul" | "Brasil";
  sourceUrl: string;
}

export interface ProdesAnnualRate {
  year: number;
  /** Taxa oficial anual de desmatamento por corte raso / supressão nativa em km² (INPE/PRODES). */
  km2: number;
  status: "consolidated" | "estimated";
}

export interface DeterAlertPoint {
  id: string;
  lat: number;
  lng: number;
  biome: ProdesBiomeId;
  uf: string;
  municipality: string;
  areaKm2: number;
  className: string;
  date: string;
}

export interface TerraBrasilisPayload {
  prodes: Record<ProdesBiomeId, readonly ProdesAnnualRate[]>;
  prodesReferenceYear: number;
  prodesCitation: string;
  prodesSourceUrls: Record<ProdesBiomeId, string>;
  deterAlerts: DeterAlertPoint[];
  deterWindowDays: number;
  deterTotalKm2: number;
  deterAvailable: boolean;
  deterPortalUrl: string;
}
