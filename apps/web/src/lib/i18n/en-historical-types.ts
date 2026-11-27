/**
 * Tipos estruturais para tradução inglesa sob demanda (`en`) de entidades históricas (D42).
 */

export interface EnHistoricalIndicatorTranslation {
  indicatorName: string;
  unit: string;
  sourcePrimary?: string;
}

export interface EnHistoricalDossierSectionTranslation {
  title: string;
  contentMarkdown: string;
  primarySource?: string;
}

export interface EnHistoricalEntityTranslation {
  nameCommon: string;
  nameOfficial: string;
  capital: string;
  continent?: string;
  governmentType: string;
  leaderTitle: string;
  historicalLeader: string;
  summary: string;
  indicators: Record<string, EnHistoricalIndicatorTranslation>;
  dossierSections: Record<string, EnHistoricalDossierSectionTranslation>;
}

export type EnHistoricalMap = Readonly<Record<string, EnHistoricalEntityTranslation>>;
