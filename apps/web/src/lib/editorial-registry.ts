/**
 * Registro ultraleve de cobertura editorial por país (D35 / RN13).
 *
 * Contém apenas o mapa `ISO3 → pacote lazy` (zero textos ou JSONs embutidos),
 * mantendo impacto de 0 bytes no orçamento First Load JS de `/` (`< 160 KiB` gzip).
 */

export type EditorialPackId =
  | "pilots"
  | "g20-asia-oceania"
  | "g20-europe-northamerica"
  | "lusophony"
  | "latin-america";

export type EditorialDimension =
  | "GEOGRAPHY"
  | "GOVERNMENT_POLITICS"
  | "ECONOMY_SOCIAL"
  | "HISTORY"
  | "BIOGRAPHIES"
  | "CULTURE_HUMANITIES"
  | "BIOLOGY_HEALTH";

export const RN13_CORE_DIMENSIONS: readonly EditorialDimension[] = [
  "GEOGRAPHY",
  "GOVERNMENT_POLITICS",
  "ECONOMY_SOCIAL",
  "HISTORY",
  "BIOGRAPHIES",
  "CULTURE_HUMANITIES",
  "BIOLOGY_HEALTH",
] as const;

export const EDITORIAL_COUNTRY_PACK: Readonly<Record<string, EditorialPackId>> = {
  // 6 Pilotos (enriquecidos com as 7 dimensões RN13 em pt-BR e en)
  BRA: "pilots",
  DEU: "pilots",
  USA: "pilots",
  JPN: "pilots",
  ZAF: "pilots",
  EGY: "pilots",
  // G20 — Ásia, Oriente Médio & Oceania (7 novos)
  CHN: "g20-asia-oceania",
  IND: "g20-asia-oceania",
  KOR: "g20-asia-oceania",
  AUS: "g20-asia-oceania",
  IDN: "g20-asia-oceania",
  TUR: "g20-asia-oceania",
  SAU: "g20-asia-oceania",
  // G20 — Europa & América do Norte (6 novos)
  GBR: "g20-europe-northamerica",
  FRA: "g20-europe-northamerica",
  ITA: "g20-europe-northamerica",
  CAN: "g20-europe-northamerica",
  RUS: "g20-europe-northamerica",
  MEX: "g20-europe-northamerica",
  // Lusofonia / CPLP (5 novos)
  PRT: "lusophony",
  AGO: "lusophony",
  MOZ: "lusophony",
  GNB: "lusophony",
  TLS: "lusophony",
  // América Latina (5 novos)
  ARG: "latin-america",
  COL: "latin-america",
  CHL: "latin-america",
  PER: "latin-america",
  URY: "latin-america",
};

export const EDITORIAL_COUNTRY_ISOS: readonly string[] = Object.keys(EDITORIAL_COUNTRY_PACK);

export function hasEditorialProfile(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return Object.hasOwn(EDITORIAL_COUNTRY_PACK, iso.toUpperCase());
}

export function getEditorialPackId(iso: string | null | undefined): EditorialPackId | null {
  if (!iso) return null;
  const upper = iso.toUpperCase();
  return EDITORIAL_COUNTRY_PACK[upper] ?? null;
}
