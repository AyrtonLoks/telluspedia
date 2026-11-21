import {
  MAX_STUDY_DESCRIPTION_LENGTH,
  MAX_STUDY_NOTES_LENGTH,
  MAX_STUDY_TITLE_LENGTH,
  sanitizeStudy,
} from "./study-schema";

export interface StudyRecord {
  id: string;
  parentId?: string | null;
  title: string;
  description?: string | null;
  timelineStartYear: number;
  timelineEndYear: number;
  selectedCountryIsos: string[];
  activeCategories: string[];
  cameraLat: number;
  cameraLng: number;
  cameraAltitude: number;
  markdownNotes?: string | null;
  historicalEra?: string | null;
  isApollo11Active?: boolean | null;
  geologicalMa?: number | null;
  activeRouteId?: string | null;
  activeObservatoryLayers?: string[];
  isCosmicMode?: boolean | null;
  focusedCelestialBody?: string | null;
  activeCosmicLayers?: string[];
  createdAt: string;
}

export interface StudyLineageRef {
  id: string;
  title: string;
  createdAt: string;
}

export interface StudyLineageInfo {
  parent: StudyLineageRef | null;
  forks: StudyLineageRef[];
  forkCount: number;
}

export interface StudyListItem extends StudyRecord {
  parentTitle: string | null;
  forkCount: number;
}

const memoryStudies: Map<string, StudyRecord> = new Map();

// Seed initial example study
memoryStudies.set("guerra-fria-br-de-k9x2", {
  id: "guerra-fria-br-de-k9x2",
  parentId: null,
  title: "Análise Comparada da Guerra Fria: Brasil & Alemanha",
  description: "Estudo comparativo das tensões institucionais, geopolíticas e econômicas entre 1947 e 1991.",
  timelineStartYear: 1947,
  timelineEndYear: 1991,
  selectedCountryIsos: ["BRA", "DEU", "USA"],
  activeCategories: ["POLITICS_REGIMES", "WAR_MILITARY", "ECONOMY"],
  cameraLat: 20.0,
  cameraLng: 0.0,
  cameraAltitude: 2.5,
  markdownNotes: `### Síntese do Recorte Histórico
Este estudo examina as repercussões da bipolaridade EUA-URSS nas instituições brasileiras e a reconstrução alemã sob a Lei Fundamental de 1949.`,
  historicalEra: "COLD_WAR_1969",
  isApollo11Active: false,
  geologicalMa: null,
  activeRouteId: null,
  activeObservatoryLayers: [],
  isCosmicMode: false,
  focusedCelestialBody: null,
  activeCosmicLayers: [],
  createdAt: new Date("2026-10-19T00:00:00Z").toISOString(),
});

export function saveMemoryStudy(study: StudyRecord) {
  memoryStudies.set(study.id, study);
}

export function getMemoryStudy(id: string): StudyRecord | undefined {
  return memoryStudies.get(id);
}

export function listMemoryStudies(): StudyRecord[] {
  return Array.from(memoryStudies.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMemoryStudyLineage(id: string): StudyLineageInfo {
  const current = memoryStudies.get(id);
  const parentStudy = current?.parentId ? memoryStudies.get(current.parentId) : undefined;
  const forks: StudyLineageRef[] = Array.from(memoryStudies.values())
    .filter((item) => item.parentId === id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({
      id: item.id,
      title: item.title,
      createdAt: item.createdAt,
    }));

  return {
    parent: parentStudy
      ? { id: parentStudy.id, title: parentStudy.title, createdAt: parentStudy.createdAt }
      : null,
    forks,
    forkCount: forks.length,
  };
}

export function forkStudyRecord(original: StoredStudy, newId?: string): StudyRecord {
  const data = sanitizeStudy(original);
  return {
    ...data,
    id: newId || `fork-${Math.random().toString(36).substring(2, 10)}`,
    parentId: original.id,
    title: `[Fork] ${data.title}`.slice(0, MAX_STUDY_TITLE_LENGTH),
    description: data.description.slice(0, MAX_STUDY_DESCRIPTION_LENGTH),
    markdownNotes: data.markdownNotes.slice(0, MAX_STUDY_NOTES_LENGTH),
    createdAt: new Date().toISOString(),
  };
}

type StoredStudy = Partial<Omit<StudyRecord, "createdAt">> & {
  id: string;
  title: string;
  createdAt?: Date | string;
};

export function restoreStudyRecord(raw: StoredStudy): StudyRecord {
  return {
    ...sanitizeStudy(raw),
    id: raw.id,
    createdAt: raw.createdAt instanceof Date ? raw.createdAt.toISOString() : raw.createdAt ?? new Date().toISOString(),
  };
}
