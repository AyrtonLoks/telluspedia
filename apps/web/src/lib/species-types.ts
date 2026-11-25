/**
 * Tipos leves e constantes da camada Mapa de Espécies & Biodiversidade (D32 / RN13.7).
 * Zero importações pesadas para preservar First Load JS de `/` < 160 KiB (T25/T35).
 */

import type { BiomeId } from "./biomes-types";

export const TAXON_GROUPS = [
  "mammals",
  "birds",
  "reptiles",
  "amphibians",
  "marine",
] as const;

export type TaxonGroup = (typeof TAXON_GROUPS)[number];

export const IUCN_STATUS_CODES = ["CR", "EN", "VU", "NT", "LC"] as const;

export type IucnStatus = (typeof IUCN_STATUS_CODES)[number];

export interface SpeciesCatalogEntry {
  id: string;
  /** Chave taxonômica verificada na GBIF Backbone Taxonomy. */
  gbifTaxonKey: number;
  scientificName: string;
  commonNamePt: string;
  commonNameEn: string;
  taxonGroup: TaxonGroup;
  family: string;
  iucnStatus: IucnStatus;
  /** Países principais de ocorrência (ISO 3166-1 alpha-3). */
  countries: readonly string[];
  /** Biomas associados (D31 — Brasil IBGE e/ou Global WWF/RESOLVE). */
  biomeIds: readonly BiomeId[];
  centerLat: number;
  centerLng: number;
  /** Raio de referência (em graus) da zona focal para o halo no globo. */
  rangeRadiusDeg: number;
  populationNotePt: string;
  populationNoteEn: string;
  habitatPt: string;
  habitatEn: string;
  threatsPt: string;
  threatsEn: string;
  iucnUrl: string;
  gbifUrl: string;
}

export interface SpeciesOccurrencePoint {
  id: string;
  lat: number;
  lng: number;
  year: number | null;
  countryCode: string | null;
  locality: string | null;
  basisOfRecord: string;
  gbifUrl: string;
}

export interface SpeciesOccurrencesPayload {
  speciesId: string;
  taxonKey: number;
  scientificName: string;
  totalGbifCount: number;
  sampledCount: number;
  countryFilter: string | null;
  points: SpeciesOccurrencePoint[];
  gbifSearchUrl: string;
}

export function isTaxonGroup(value: unknown): value is TaxonGroup {
  return typeof value === "string" && (TAXON_GROUPS as readonly string[]).includes(value);
}

export function isIucnStatus(value: unknown): value is IucnStatus {
  return typeof value === "string" && (IUCN_STATUS_CODES as readonly string[]).includes(value);
}
