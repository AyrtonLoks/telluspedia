/** Entidade histórica (Estado extinto) com fronteiras, dossiê e vigência (T36: tipo em arquivo próprio). */
import type { DossierCitations } from "./citation-types";
import type { HistoricalEraId } from "./historical-eras";

export interface HistoricalEntity {
  id: string; // ex.: "PRU", "SUN", "AHU", "GDR", "FRG", "TUR_HIST", "YUG", "CSK"
  wikidataQid: string;
  nameCommon: string;
  nameOfficial: string;
  capital: string;
  continent?: string;
  areaKm2?: number;
  numericCode?: string;
  era: HistoricalEraId;
  startYear: number;
  endYear: number;
  latitude: number;
  longitude: number;
  flagSvgUrl: string;
  governmentType: string;
  leaderTitle: string;
  historicalLeader: string;
  summary: string;
  successorIsos: string[]; // ex.: PRU -> ["DEU", "POL", "RUS"]
  predecessorIsos?: string[];
  indicators: {
    indicatorCode: string;
    indicatorName: string;
    category: "ECONOMY" | "DEMOGRAPHY" | "HEALTH" | "MILITARY";
    year: number;
    value: number;
    unit: string;
    sourcePrimary: string;
  }[];
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
}
