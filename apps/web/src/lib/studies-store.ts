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
  choroplethIndicator?: string | null;
  /** Camada NASA GIBS (D25): produto e mês congelados no snapshot. */
  gibsProduct?: string | null;
  gibsMonth?: string | null;
  /** Modo 2D & projeção cartográfica (D33) congelados no snapshot. */
  mapViewMode?: string | null;
  mapProjection?: string | null;
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

// Em desenvolvimento cada rota do Next é empacotada à parte: um Map no módulo ficava isolado por
// rota, e o link temporário criado no POST /api/studies dava 404 em /study/<id>. O Map vive no
// globalThis para todas as rotas do mesmo processo enxergarem os mesmos estudos.
const memoryKey = Symbol.for("telluspedia.memoryStudies");
const memoryGlobal = globalThis as typeof globalThis & { [memoryKey]?: Map<string, StudyRecord> };
const memoryStudies: Map<string, StudyRecord> = (memoryGlobal[memoryKey] ??= new Map());

// Seed initial example study
if (!memoryStudies.has("guerra-fria-br-de-k9x2")) memoryStudies.set("guerra-fria-br-de-k9x2", {
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
  choroplethIndicator: null,
  gibsProduct: null,
  gibsMonth: null,
  mapViewMode: null,
  mapProjection: null,
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
