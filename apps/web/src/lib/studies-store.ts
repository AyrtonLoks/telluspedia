import { isContemporaryEpoch } from "./observatory-data";

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

export function forkStudyRecord(original: StudyRecord, newId?: string): StudyRecord {
  const sanitizedMa =
    typeof original.geologicalMa === "number" &&
    Number.isFinite(original.geologicalMa) &&
    original.geologicalMa > 0 &&
    original.geologicalMa <= 4600
      ? original.geologicalMa
      : null;

  const sanitizedRouteId =
    typeof original.activeRouteId === "string" && original.activeRouteId.trim().length > 0
      ? original.activeRouteId.trim()
      : null;

  const isForkContemporary =
    isContemporaryEpoch(original.timelineEndYear, sanitizedMa) &&
    sanitizedRouteId !== "magellan-1519" &&
    !["PRUSSIA_1870", "WW1_1914", "WW2_1939"].includes(original.historicalEra || "");

  const sanitizedObservatoryLayers =
    !isForkContemporary
      ? []
      : Array.isArray(original.activeObservatoryLayers)
        ? [...original.activeObservatoryLayers]
        : [];

  const isCosmic = Boolean(original.isCosmicMode);
  const sanitizedCosmicLayers = Array.isArray(original.activeCosmicLayers)
    ? [...original.activeCosmicLayers]
    : [];

  return {
    id: newId || `fork-${Math.random().toString(36).substring(2, 10)}`,
    parentId: original.id,
    title: `[Fork] ${original.title}`,
    description: original.description ?? "",
    timelineStartYear: original.timelineStartYear ?? 1974,
    timelineEndYear: original.timelineEndYear ?? 2024,
    selectedCountryIsos: Array.isArray(original.selectedCountryIsos) ? [...original.selectedCountryIsos] : [],
    activeCategories: Array.isArray(original.activeCategories) ? [...original.activeCategories] : [],
    cameraLat: original.cameraLat ?? 0,
    cameraLng: original.cameraLng ?? 0,
    cameraAltitude: original.cameraAltitude ?? 2.5,
    markdownNotes: original.markdownNotes ?? "",
    historicalEra: sanitizedMa !== null ? null : (original.historicalEra ?? null),
    isApollo11Active: sanitizedMa !== null ? false : (original.isApollo11Active ?? false),
    geologicalMa: sanitizedMa,
    activeRouteId: sanitizedRouteId,
    activeObservatoryLayers: sanitizedObservatoryLayers,
    isCosmicMode: isCosmic,
    focusedCelestialBody: original.focusedCelestialBody ?? null,
    activeCosmicLayers: sanitizedCosmicLayers,
    createdAt: new Date().toISOString(),
  };
}

export function restoreStudyRecord(raw: Partial<StudyRecord> & { id: string; title: string }): StudyRecord {
  const sanitizedMa =
    typeof raw.geologicalMa === "number" &&
    Number.isFinite(raw.geologicalMa) &&
    raw.geologicalMa > 0 &&
    raw.geologicalMa <= 4600
      ? raw.geologicalMa
      : null;

  const sanitizedRouteId =
    typeof raw.activeRouteId === "string" && raw.activeRouteId.trim().length > 0
      ? raw.activeRouteId.trim()
      : null;

  const isRestoreContemporary =
    isContemporaryEpoch(raw.timelineEndYear ?? 2026, sanitizedMa) &&
    sanitizedRouteId !== "magellan-1519" &&
    !["PRUSSIA_1870", "WW1_1914", "WW2_1939"].includes(raw.historicalEra || "");

  const sanitizedObservatoryLayers =
    !isRestoreContemporary
      ? []
      : Array.isArray(raw.activeObservatoryLayers)
        ? [...raw.activeObservatoryLayers]
        : [];

  const isCosmic = Boolean(raw.isCosmicMode);
  const sanitizedCosmicLayers = Array.isArray(raw.activeCosmicLayers)
    ? [...raw.activeCosmicLayers]
    : [];

  return {
    id: raw.id,
    parentId: raw.parentId ?? null,
    title: raw.title,
    description: raw.description ?? "",
    timelineStartYear: raw.timelineStartYear ?? 1974,
    timelineEndYear: raw.timelineEndYear ?? 2024,
    selectedCountryIsos: Array.isArray(raw.selectedCountryIsos) ? [...raw.selectedCountryIsos] : [],
    activeCategories: Array.isArray(raw.activeCategories) ? [...raw.activeCategories] : [],
    cameraLat: raw.cameraLat ?? 0,
    cameraLng: raw.cameraLng ?? 0,
    cameraAltitude: raw.cameraAltitude ?? 2.5,
    markdownNotes: raw.markdownNotes ?? "",
    historicalEra: sanitizedMa !== null ? null : (raw.historicalEra ?? null),
    isApollo11Active: sanitizedMa !== null ? false : (raw.isApollo11Active ?? false),
    geologicalMa: sanitizedMa,
    activeRouteId: sanitizedRouteId,
    activeObservatoryLayers: sanitizedObservatoryLayers,
    isCosmicMode: isCosmic,
    focusedCelestialBody: raw.focusedCelestialBody ?? null,
    activeCosmicLayers: sanitizedCosmicLayers,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}
