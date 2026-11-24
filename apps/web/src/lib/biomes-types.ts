/**
 * Tipos e constantes leves da camada Mapa dos Biomas (D31).
 * Módulo sem importações pesadas para manter o First Load JS de `/` abaixo do orçamento (T25/T35).
 */

export type BiomeScope = "global" | "brazil";

export const DEFAULT_BIOME_SCOPE: BiomeScope = "global";

export const GLOBAL_BIOME_IDS = [
  "WWF_01",
  "WWF_02",
  "WWF_03",
  "WWF_04",
  "WWF_05",
  "WWF_06",
  "WWF_07",
  "WWF_08",
  "WWF_09",
  "WWF_10",
  "WWF_11",
  "WWF_12",
  "WWF_13",
  "WWF_14",
] as const;

export const BRAZIL_BIOME_IDS = [
  "BR_AMAZONIA",
  "BR_CERRADO",
  "BR_MATA_ATLANTICA",
  "BR_CAATINGA",
  "BR_PAMPA",
  "BR_PANTANAL",
] as const;

export type GlobalBiomeId = (typeof GLOBAL_BIOME_IDS)[number];
export type BrazilBiomeId = (typeof BRAZIL_BIOME_IDS)[number];
export type BiomeId = GlobalBiomeId | BrazilBiomeId;

const GLOBAL_ID_RE = /^WWF_(?:0[1-9]|1[0-4])$/;
const BRAZIL_ID_RE = /^BR_(?:AMAZONIA|CERRADO|MATA_ATLANTICA|CAATINGA|PANTANAL|PAMPA)$/;

export function isBiomeScope(value: unknown): value is BiomeScope {
  return value === "global" || value === "brazil";
}

export function isBiomeId(value: unknown): value is BiomeId {
  return typeof value === "string" && (GLOBAL_ID_RE.test(value) || BRAZIL_ID_RE.test(value));
}

export function isBiomeIdForScope(scope: BiomeScope, value: unknown): value is BiomeId {
  if (typeof value !== "string") return false;
  return scope === "brazil" ? BRAZIL_ID_RE.test(value) : GLOBAL_ID_RE.test(value);
}

/** Codifica escopo e filtro de bioma para a URL compartilhável (`?bioma=brazil,BR_CERRADO`). */
export function encodeBiomesView(scope: BiomeScope, filterId: BiomeId | null): string {
  return filterId && isBiomeIdForScope(scope, filterId) ? `${scope},${filterId}` : scope;
}

/** Lê escopo e filtro opcionais a partir do parâmetro `bioma` da URL compartilhável. */
export function readBiomesView(
  raw: string | null
): { scope: BiomeScope; filterId: BiomeId | null } | null {
  if (!raw) return null;
  const [scopePart, filterPart] = raw.split(",");
  if (!isBiomeScope(scopePart)) return null;
  const filterId = isBiomeIdForScope(scopePart, filterPart) ? filterPart : null;
  return { scope: scopePart, filterId };
}

type BiomePickerFn = (scope: BiomeScope, lat: number, lng: number) => BiomeId | null;
let registeredBiomePicker: BiomePickerFn | null = null;

/** Registra o picker espacial sob demanda (evita incluir biomes-data no bundle inicial de `/`). */
export function registerBiomePicker(fn: BiomePickerFn | null): void {
  registeredBiomePicker = fn;
}

/** Resolve o bioma carregado na coordenada clicada em O(1) (< 0,2 ms), ou null se a camada não carregou. */
export function pickLoadedBiomeAt(
  scope: BiomeScope,
  lat: number,
  lng: number
): BiomeId | null {
  return registeredBiomePicker ? registeredBiomePicker(scope, lat, lng) : null;
}

