/**
 * Ids dos indicadores e constantes temporais leves do mapa temático (T35 / D34):
 * o store e a barra superior só precisam disto; metadados, paletas e formatação ficam
 * em `choropleth.ts`, que re-exporta este arquivo.
 */
export const CHOROPLETH_INDICATOR_IDS = [
  "NY.GDP.MKTP.CD",
  "NY.GDP.PCAP.CD",
  "SP.POP.TOTL",
  "SP.DYN.LE00.IN",
  "MS.MIL.XPND.GD.ZS",
  "EN.GHG.CO2.PC.CE.AR5",
  "EG.FEC.RNEW.ZS",
  "NASA_FIRMS",
] as const;

export type ChoroplethIndicatorId = (typeof CHOROPLETH_INDICATOR_IDS)[number];

export const CHOROPLETH_MIN_YEAR = 1990;
export const CHOROPLETH_MAX_YEAR = 2024;

export function isChoroplethIndicatorId(value: unknown): value is ChoroplethIndicatorId {
  return typeof value === "string" && (CHOROPLETH_INDICATOR_IDS as readonly string[]).includes(value);
}

/** Indicadores do Banco Mundial com séries anuais reais 1990–2024 em `worldbank-timeseries.json`. */
export function isTemporalChoroplethIndicator(
  indicatorId: ChoroplethIndicatorId | null | undefined
): boolean {
  return Boolean(indicatorId && indicatorId !== "NASA_FIRMS");
}

export function clampChoroplethYear(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return Math.max(CHOROPLETH_MIN_YEAR, Math.min(CHOROPLETH_MAX_YEAR, rounded));
}
