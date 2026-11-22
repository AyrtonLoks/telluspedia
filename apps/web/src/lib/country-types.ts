/** Tipos dos dados de país (T36): indicadores, Banco Mundial e o registro completo do país. */
import type { DossierCitations } from "./citation-types";
import type { HistoricalEraId } from "./historical-eras";

export type DataCompleteness = "full" | "partial" | "none";

export type CountryIndicatorCategory =
  | "ECONOMY"
  | "DEMOGRAPHY"
  | "GEOGRAPHY"
  | "HEALTH"
  | "MILITARY";

export interface CountryIndicator {
  indicatorCode: string;
  indicatorName: string;
  category: CountryIndicatorCategory;
  year: number;
  value: number;
  unit: string;
  sourcePrimary: string;
  sourceUrl?: string;
  referenceDate?: string;
}

export interface WorldBankIndicatorSpec {
  code: string;
  name: string;
  category: CountryIndicatorCategory;
  unit: string;
  sourcePrimary: string;
  sourceUrl: string;
  lastUpdated: string;
}

export interface WorldBankCountryEntry {
  nameOfficial: string | null;
  capital: string | null;
  continent: string | null;
  region: string | null;
  currencyCode: string | null;
  currencyName: string | null;
  indicators: Record<string, { value: number; year: number }>;
}

export interface CountryData {
  isoCode: string;
  iso2: string;
  numericCode: string | null;
  nameCommon: string;
  nameOfficial: string | null;
  capital: string | null;
  continent: string | null;
  region: string | null;
  population: number | null;
  areaKm2: number | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  flagSvgUrl: string;
  currencyCode: string | null;
  currencyName: string | null;
  governmentType: string | null;
  headOfState: string | null;
  headOfGov?: string | null;
  summary: string | null;
  completeness: DataCompleteness;
  dataSource?: string;
  referenceDate?: string;
  sourceUrl?: string;
  wikidataQid?: string;
  historicalLeader?: string;
  leaderTitle?: string;
  startYear?: number;
  endYear?: number;
  era?: HistoricalEraId;
  successorIsos?: string[];
  predecessorIsos?: string[];
  isHistoricalEntity?: boolean;
  indicators: CountryIndicator[];
  dossierSections: {
    dimension:
      | "GEOGRAPHY"
      | "GOVERNMENT_POLITICS"
      | "ECONOMY_SOCIAL"
      | "HISTORY"
      | "BIOGRAPHIES"
      | "CULTURE_HUMANITIES"
      | "BIOLOGY_HEALTH"
      | "NEWS_CURRENT_AFFAIRS";
    title: string;
    contentMarkdown: string;
    estimatedReadMin: number;
    citationsJson: DossierCitations;
  }[];
  milestones: {
    id: string;
    title: string;
    summary: string;
    year: number;
    exactDate?: string;
    category: "POLITICS_REGIMES" | "ECONOMY" | "WAR_MILITARY" | "SCIENCE_CULTURE" | "HEALTH_PANDEMICS";
    sourcePrimary: string;
    latitude?: number;
    longitude?: number;
    countryIso?: string;
    blocIsos?: string[];
    preferredAltitude?: number;
  }[];
}

export interface PilotCountryData extends Omit<CountryData, "completeness"> {
  completeness?: DataCompleteness;
  numericCode: string;
  nameOfficial: string;
  capital: string;
  continent: string;
  region: string;
  population: number;
  areaKm2: number;
  latitude: number;
  longitude: number;
  timezone: string;
  currencyCode: string;
  currencyName: string;
  governmentType: string;
  headOfState: string;
  summary: string;
}
