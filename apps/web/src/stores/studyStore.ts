import { create } from "zustand";
import {
  createAnnotationId,
  MAX_STUDY_ANNOTATIONS,
  sanitizeStudyAnnotations,
  type StudyAnnotation,
  type StudyAnnotationTone,
} from "@/lib/study-annotations";
import { normalizeStudyEpoch } from "@/lib/study-epoch";

export interface StudySnapshotInput {
  id: string;
  parentId?: string | null;
  title: string;
  description?: string | null;
  notes?: string | null;
  timelineStartYear?: number | null;
  timelineEndYear?: number | null;
  historicalEra?: string | null;
  isApollo11Active?: boolean | null;
  geologicalMa?: number | null;
  activeRouteId?: string | null;
  activeObservatoryLayers?: string[] | null;
  isCosmicMode?: boolean | null;
  focusedCelestialBody?: string | null;
  activeCosmicLayers?: string[] | null;
  choroplethIndicator?: string | null;
  annotations?: unknown;
}

export interface AddAnnotationInput {
  id?: string;
  lat: number;
  lng: number;
  title: string;
  note?: string;
  tone?: StudyAnnotationTone;
}

interface StudyState {
  currentStudyId: string | null;
  parentId: string | null;
  title: string;
  description: string;
  notes: string;
  historicalEra: string | null;
  isApollo11Active: boolean;
  activeObservatoryLayers: string[];
  isCosmicMode: boolean;
  focusedCelestialBody: string | null;
  activeCosmicLayers: string[];
  choroplethIndicator: string | null;
  annotations: StudyAnnotation[];
  isShareModalOpen: boolean;

  setStudy: (study: StudySnapshotInput) => void;
  restoreStudy: (study: StudySnapshotInput) => void;
  forkStudy: (forked: Omit<StudySnapshotInput, "title" | "parentId"> & { parentId: string; title?: string }) => void;
  setCurrentStudyId: (id: string | null) => void;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setNotes: (notes: string) => void;
  setHistoricalEra: (era: string | null) => void;
  setIsApollo11Active: (active: boolean) => void;
  setActiveObservatoryLayers: (layers: string[]) => void;
  setIsCosmicMode: (isCosmic: boolean) => void;
  setFocusedCelestialBody: (body: string | null) => void;
  setActiveCosmicLayers: (layers: string[]) => void;
  setChoroplethIndicator: (indicator: string | null) => void;
  setAnnotations: (annotations: StudyAnnotation[]) => void;
  addAnnotation: (input: AddAnnotationInput) => StudyAnnotation | null;
  removeAnnotation: (id: string) => void;
  clearAnnotations: () => void;
  unlockDraftFork: () => void;
  setShareModalOpen: (isOpen: boolean) => void;
  resetStudy: () => void;
}

export const useStudyStore = create<StudyState>((set, get) => ({
  currentStudyId: null,
  parentId: null,
  title: "Novo Estudo Planetário",
  description: "Recorte cronológico e geopolítico comparado.",
  notes: "",
  historicalEra: null,
  isApollo11Active: false,
  activeObservatoryLayers: [],
  isCosmicMode: false,
  focusedCelestialBody: null,
  activeCosmicLayers: [],
  choroplethIndicator: null,
  annotations: [],
  isShareModalOpen: false,

  restoreStudy: (study) => {
    const { historicalEra, isApollo11Active, activeObservatoryLayers } = normalizeStudyEpoch(study);
    set({
      currentStudyId: study.id,
      parentId: study.parentId || null,
      title: study.title,
      description: study.description || "",
      notes: study.notes || "",
      historicalEra,
      isApollo11Active,
      activeObservatoryLayers,
      isCosmicMode: Boolean(study.isCosmicMode),
      focusedCelestialBody: study.focusedCelestialBody || null,
      activeCosmicLayers: Array.isArray(study.activeCosmicLayers) ? [...study.activeCosmicLayers] : [],
      choroplethIndicator: study.choroplethIndicator || null,
      annotations: sanitizeStudyAnnotations(study.annotations),
    });
  },

  setStudy: (study) => {
    get().restoreStudy(study);
  },

  forkStudy: (forked) => {
    get().restoreStudy({ ...forked, title: forked.title || "[Fork] Estudo" });
  },

  setCurrentStudyId: (id: string | null) => set({ currentStudyId: id }),
  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  setNotes: (notes) => set({ notes }),
  setHistoricalEra: (historicalEra) => set({ historicalEra }),
  setIsApollo11Active: (isApollo11Active) => set({ isApollo11Active }),
  setActiveObservatoryLayers: (layers) => set({ activeObservatoryLayers: layers }),
  setIsCosmicMode: (isCosmic) => set({ isCosmicMode: isCosmic }),
  setFocusedCelestialBody: (body) => set({ focusedCelestialBody: body }),
  setActiveCosmicLayers: (layers) => set({ activeCosmicLayers: layers }),
  setChoroplethIndicator: (choroplethIndicator) => set({ choroplethIndicator }),
  setAnnotations: (annotations) => set({ annotations: sanitizeStudyAnnotations(annotations) }),

  addAnnotation: (input) => {
    const current = get().annotations;
    if (current.length >= MAX_STUDY_ANNOTATIONS) return null;
    const candidate = sanitizeStudyAnnotations([
      {
        id: input.id ?? createAnnotationId(),
        lat: input.lat,
        lng: input.lng,
        title: input.title,
        note: input.note ?? "",
        tone: input.tone ?? "accent",
      },
    ])[0];
    if (!candidate) return null;
    set({ annotations: [...current, candidate] });
    return candidate;
  },

  removeAnnotation: (id) =>
    set((s) => ({
      annotations: s.annotations.filter((item) => item.id !== id),
    })),

  clearAnnotations: () => set({ annotations: [] }),

  unlockDraftFork: () =>
    set((s) => ({
      parentId: s.currentStudyId ?? s.parentId,
      currentStudyId: null,
      title: s.title.startsWith("[Fork]") ? s.title : `[Fork] ${s.title}`.slice(0, 200),
    })),

  setShareModalOpen: (isOpen) => set({ isShareModalOpen: isOpen }),
  resetStudy: () =>
    set({
      currentStudyId: null,
      parentId: null,
      title: "Novo Estudo Planetário",
      description: "Recorte cronológico e geopolítico comparado.",
      notes: "",
      historicalEra: null,
      isApollo11Active: false,
      activeObservatoryLayers: [],
      isCosmicMode: false,
      focusedCelestialBody: null,
      activeCosmicLayers: [],
      choroplethIndicator: null,
      annotations: [],
      isShareModalOpen: false,
    }),
}));
