/**
 * Tipos estruturais para tradução sob demanda (`en`) das cenas históricas e crônicas (D42).
 */

export interface EnQuoteTranslation {
  text: string;
  source?: string;
}

export interface EnScenePointTranslation {
  name: string;
  description?: string;
  quote?: EnQuoteTranslation;
  facts?: Record<string, string>;
}

export interface EnScenePhaseTranslation {
  label: string;
  description?: string;
  facts?: Record<string, string>;
}

export interface EnSceneParticipantTranslation {
  name?: string;
  role: string;
  description?: string;
}

export interface EnSceneChronicleTranslation {
  place?: string;
  text: string;
  quote?: EnQuoteTranslation;
}

export interface EnSceneHudTranslation {
  badge: string;
  subtitle?: string;
  period?: string;
  startLabel: string;
  endLabel: string;
  progressLabel: string;
  quoteTitle?: string;
  stepStats?: Record<string, { label: string; unit?: string; note?: string }>;
  cameras?: string[];
  finalQuoteText?: string;
}

export interface EnSceneTranslation {
  title: string;
  summary: string;
  subtitle?: string;
  sourceLabels?: Record<string, string>;
  trajectoryLabel?: string;
  launchSiteName?: string;
  landingSiteName?: string;
  points?: Record<string, EnScenePointTranslation>;
  phases?: Record<string, EnScenePhaseTranslation>;
  participants?: EnSceneParticipantTranslation[];
  chronicle?: EnSceneChronicleTranslation[];
  dossierMarkdown?: string;
  hud?: EnSceneHudTranslation;
}

export type EnScenesMap = Readonly<Record<string, EnSceneTranslation>>;
