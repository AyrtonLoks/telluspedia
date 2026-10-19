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
  isShareModalOpen: boolean;

  setStudy: (study: {
    id: string;
    parentId?: string | null;
    title: string;
    description?: string | null;
    notes?: string | null;
    historicalEra?: string | null;
    isApollo11Active?: boolean | null;
    geologicalMa?: number | null;
    activeRouteId?: string | null;
  }) => void;
  restoreStudy: (study: {
    id: string;
    parentId?: string | null;
    title: string;
    description?: string | null;
    notes?: string | null;
    historicalEra?: string | null;
    isApollo11Active?: boolean | null;
    geologicalMa?: number | null;
    activeRouteId?: string | null;
  }) => void;
  forkStudy: (forked: {
    id: string;
    parentId: string;
    title?: string;
    description?: string | null;
    notes?: string | null;
    historicalEra?: string | null;
    isApollo11Active?: boolean | null;
    geologicalMa?: number | null;
    activeRouteId?: string | null;
  }) => void;
  setCurrentStudyId: (id: string | null) => void;
  setTitle: (title: string) => void;
  setDescription: (desc: string) => void;
  setNotes: (notes: string) => void;
  setHistoricalEra: (era: string | null) => void;
  setIsApollo11Active: (active: boolean) => void;
  setGeologicalMa: (ma: number | null) => void;
  setActiveRouteId: (routeId: string | null) => void;
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
  isShareModalOpen: false,

  restoreStudy: (study) => {
    const sanitizedMa =
      typeof study.geologicalMa === "number" &&
      Number.isFinite(study.geologicalMa) &&
      study.geologicalMa > 0 &&
      study.geologicalMa <= 4600
        ? study.geologicalMa
        : null;

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
      isShareModalOpen: false,
    }),
}));
