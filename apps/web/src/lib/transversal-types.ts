import type { MilestoneItem } from "./milestones";

export type TransversalKind = "personality" | "theme";

export const TRANSVERSAL_ENTITY_IDS = [
  "isaac-newton",
  "albert-einstein",
  "dom-pedro-ii",
  "luis-de-camoes",
  "milton-santos",
  "space-race",
  "decolonization",
  "pandemics",
  "scientific-revolutions",
] as const;

export type TransversalEntityId = (typeof TRANSVERSAL_ENTITY_IDS)[number];

export function isTransversalEntityId(value: string | null | undefined): value is TransversalEntityId {
  if (!value) return false;
  return (TRANSVERSAL_ENTITY_IDS as readonly string[]).includes(value);
}

export interface TransversalEntityMeta {
  id: TransversalEntityId;
  kind: TransversalKind;
  titlePt: string;
  titleEn: string;
  shortLabelPt: string;
  shortLabelEn: string;
  spanLabel: string;
  startYear: number;
  endYear: number;
  countryIsos: readonly string[];
  dossierSlug?: string;
  tellusEntityId?: string;
  defaultCamera: { lat: number; lng: number; altitude: number };
}

export interface TransversalMilestone extends MilestoneItem {
  titleEn: string;
  summaryEn: string;
}

export interface TransversalEntityRecord extends TransversalEntityMeta {
  summaryPt: string;
  summaryEn: string;
  milestones: readonly TransversalMilestone[];
}

export type StudyTrailStepKind = "transversal" | "country" | "milestone";

export interface StudyTrailStep {
  key: string;
  kind: StudyTrailStepKind;
  id: string;
  labelPt: string;
  labelEn: string;
  year?: number;
  lat?: number;
  lng?: number;
  altitude?: number;
}
