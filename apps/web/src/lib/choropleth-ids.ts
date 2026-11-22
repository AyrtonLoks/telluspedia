/**
 * Ids dos indicadores do mapa temático (T35): o store e a barra superior só precisam disto;
 * metadados, paletas e formatação ficam em `choropleth.ts`, que re-exporta este arquivo.
 */
export const CHOROPLETH_INDICATOR_IDS = [
  "NY.GDP.MKTP.CD",
  "NY.GDP.PCAP.CD",
  "SP.POP.TOTL",
  "SP.DYN.LE00.IN",
  "MS.MIL.XPND.GD.ZS",
  "NASA_FIRMS",
] as const;

export type ChoroplethIndicatorId = (typeof CHOROPLETH_INDICATOR_IDS)[number];

export function isChoroplethIndicatorId(value: unknown): value is ChoroplethIndicatorId {
  return typeof value === "string" && (CHOROPLETH_INDICATOR_IDS as readonly string[]).includes(value);
}
