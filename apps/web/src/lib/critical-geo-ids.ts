/**
 * Identificadores ultraleves das lentes de Geografia Crítica — Legado de Milton Santos (D36).
 * Mantido separado dos textos, bibliografia e geometrias para preservar 0 bytes de impacto em `/`.
 */

export const CRITICAL_GEO_LENS_IDS = [
  "MTCI",
  "VERTICALITIES",
  "FOUR_BRAZILS",
] as const;

export type CriticalGeoLensId = (typeof CRITICAL_GEO_LENS_IDS)[number];

export const VERTICALITY_FOCUS_MODES = [
  "verticalities",
  "horizontalities",
  "both",
] as const;

export type VerticalityFocusMode = (typeof VERTICALITY_FOCUS_MODES)[number];

export const FOUR_BRAZILS_REGION_IDS = [
  "CONCENTRADA",
  "CENTRO_OESTE",
  "NORDESTE",
  "AMAZONIA",
] as const;

export type FourBrazilsRegionId = (typeof FOUR_BRAZILS_REGION_IDS)[number];

export const IBGE_REGION_IDS = [
  "NORTE",
  "NORDESTE",
  "CENTRO_OESTE",
  "SUDESTE",
  "SUL",
] as const;

export type IbgeRegionId = (typeof IBGE_REGION_IDS)[number];

export function isCriticalGeoLensId(value: unknown): value is CriticalGeoLensId {
  return (
    typeof value === "string" &&
    (CRITICAL_GEO_LENS_IDS as readonly string[]).includes(value)
  );
}

export function isFourBrazilsRegionId(value: unknown): value is FourBrazilsRegionId {
  return (
    typeof value === "string" &&
    (FOUR_BRAZILS_REGION_IDS as readonly string[]).includes(value)
  );
}
