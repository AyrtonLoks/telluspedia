import { create } from "zustand";

interface StudyState {
  currentStudyId: string | null;
  parentId: string | null;
  title: string;
  description: string;
  notes: string;
  historicalEra: string | null;
  isApollo11Active: boolean;
  geologicalMa: number | null;
  activeRouteId: string | null;
  activeObservatoryLayers: string[];
  isCosmicMode: boolean;
  focusedCelestialBody: string | null;
  activeCosmicLayers: string[];
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
  }) => void;
  setCurrentStudyId: (id: string | null) => void;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setNotes: (notes: string) => void;
  setHistoricalEra: (era: string | null) => void;
  setIsApollo11Active: (active: boolean) => void;
  setGeologicalMa: (ma: number | null) => void;
  setActiveRouteId: (routeId: string | null) => void;
  setActiveObservatoryLayers: (layers: string[]) => void;
  setIsCosmicMode: (isCosmic: boolean) => void;
  setFocusedCelestialBody: (body: string | null) => void;
  setActiveCosmicLayers: (layers: string[]) => void;
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
  geologicalMa: null,
  activeRouteId: null,
  activeObservatoryLayers: [],
  isCosmicMode: false,
  focusedCelestialBody: null,
  activeCosmicLayers: [],
  isShareModalOpen: false,

  restoreStudy: (study) => {
    const sanitizedMa =
      typeof study.geologicalMa === "number" &&
      Number.isFinite(study.geologicalMa) &&
      study.geologicalMa > 0 &&
      study.geologicalMa <= 4600
        ? study.geologicalMa
        : null;

    const isAnachronistic =
      sanitizedMa !== null ||
      study.activeRouteId === "magellan-1519" ||
      ["PRUSSIA_1870", "WW1_1914", "WW2_1939"].includes(study.historicalEra || "");

    const sanitizedLayers =
      isAnachronistic
        ? []
        : Array.isArray(study.activeObservatoryLayers)
          ? [...study.activeObservatoryLayers]
          : [];

    const isCosmic = Boolean(study.isCosmicMode);
    const sanitizedCosmicLayers = Array.isArray(study.activeCosmicLayers)
      ? [...study.activeCosmicLayers]
      : [];

    set({
      currentStudyId: study.id,
      parentId: study.parentId || null,
      title: study.title,
      description: study.description || "",
      notes: study.notes || "",
      historicalEra: sanitizedMa !== null ? null : (study.historicalEra || null),
      isApollo11Active: sanitizedMa !== null ? false : Boolean(study.isApollo11Active),
      geologicalMa: sanitizedMa,
      activeRouteId: study.activeRouteId || null,
      activeObservatoryLayers: sanitizedLayers,
      isCosmicMode: isCosmic,
      focusedCelestialBody: study.focusedCelestialBody || null,
      activeCosmicLayers: sanitizedCosmicLayers,
    });
  },

  setStudy: (study) => {
    useStudyStore.getState().restoreStudy(study);
  },

  forkStudy: (forked) => {
    const sanitizedMa =
      typeof forked.geologicalMa === "number" &&
      Number.isFinite(forked.geologicalMa) &&
      forked.geologicalMa > 0 &&
      forked.geologicalMa <= 4600
        ? forked.geologicalMa
        : null;

    const isAnachronistic =
      sanitizedMa !== null ||
      forked.activeRouteId === "magellan-1519" ||
      ["PRUSSIA_1870", "WW1_1914", "WW2_1939"].includes(forked.historicalEra || "");

    const sanitizedLayers =
      isAnachronistic
        ? []
        : Array.isArray(forked.activeObservatoryLayers)
          ? [...forked.activeObservatoryLayers]
          : [];

    const isCosmic = Boolean(forked.isCosmicMode);
    const sanitizedCosmicLayers = Array.isArray(forked.activeCosmicLayers)
      ? [...forked.activeCosmicLayers]
      : [];

    set({
      currentStudyId: forked.id,
      parentId: forked.parentId,
      title: forked.title || `[Fork] Estudo`,
      description: forked.description || "",
      notes: forked.notes || "",
      historicalEra: sanitizedMa !== null ? null : (forked.historicalEra || null),
      isApollo11Active: sanitizedMa !== null ? false : Boolean(forked.isApollo11Active),
      geologicalMa: sanitizedMa,
      activeRouteId: forked.activeRouteId || null,
      activeObservatoryLayers: sanitizedLayers,
      isCosmicMode: isCosmic,
      focusedCelestialBody: forked.focusedCelestialBody || null,
      activeCosmicLayers: sanitizedCosmicLayers,
    });
  },

  setCurrentStudyId: (id: string | null) => set({ currentStudyId: id }),
  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  setNotes: (notes) => set({ notes }),
  setHistoricalEra: (historicalEra) => set({ historicalEra }),
  setIsApollo11Active: (isApollo11Active) => set({ isApollo11Active }),
  setGeologicalMa: (geologicalMa) => set({ geologicalMa }),
  setActiveRouteId: (activeRouteId) => set({ activeRouteId }),
  setActiveObservatoryLayers: (layers) => set({ activeObservatoryLayers: layers }),
  setIsCosmicMode: (isCosmic) => set({ isCosmicMode: isCosmic }),
  setFocusedCelestialBody: (body) => set({ focusedCelestialBody: body }),
  setActiveCosmicLayers: (layers) => set({ activeCosmicLayers: layers }),
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
      geologicalMa: null,
      activeRouteId: null,
      activeObservatoryLayers: [],
      isCosmicMode: false,
      focusedCelestialBody: null,
      activeCosmicLayers: [],
      isShareModalOpen: false,
    }),
}));
