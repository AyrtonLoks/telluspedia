import { create } from "zustand";
import { normalizeStudyEpoch } from "@/lib/study-epoch";

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
  isShareModalOpen: boolean;

  setStudy: (study: {
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
  }) => void;
  restoreStudy: (study: {
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
  }) => void;
  forkStudy: (forked: {
    id: string;
    parentId: string;
    title?: string;
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
  }) => void;
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
  setShareModalOpen: (isOpen: boolean) => void;
  resetStudy: () => void;
}

export const useStudyStore = create<StudyState>((set) => ({
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
    });
  },

  setStudy: (study) => {
    useStudyStore.getState().restoreStudy(study);
  },

  forkStudy: (forked) => {
    useStudyStore.getState().restoreStudy({ ...forked, title: forked.title || "[Fork] Estudo" });
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
      isShareModalOpen: false,
    }),
}));
