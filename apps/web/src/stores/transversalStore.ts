import { create } from "zustand";
import {
  isTransversalEntityId,
  type StudyTrailStep,
  type TransversalEntityId,
  type TransversalEntityRecord,
  type TransversalKind,
} from "@/lib/transversal-types";

const MAX_TRAIL_STEPS = 8;
let catalogPromise: Promise<typeof import("@/lib/transversal-catalog")> | null = null;

export function ensureTransversalCatalogLoaded() {
  return (catalogPromise ??= import("@/lib/transversal-catalog"));
}

function appendTrailStep(existing: StudyTrailStep[], step: StudyTrailStep): StudyTrailStep[] {
  const next = [...existing.filter((s) => s.key !== step.key), step];
  return next.length > MAX_TRAIL_STEPS ? next.slice(next.length - MAX_TRAIL_STEPS) : next;
}

interface TransversalState {
  activeEntityId: TransversalEntityId | null;
  activeEntity: TransversalEntityRecord | null;
  isSelectorOpen: boolean;
  filterKind: "all" | TransversalKind;
  isLoadingCatalog: boolean;
  trail: StudyTrailStep[];
  activeTrailKey: string | null;

  openSelector: (kind?: "all" | TransversalKind) => void;
  closeSelector: () => void;
  toggleSelector: () => void;
  setFilterKind: (kind: "all" | TransversalKind) => void;
  activateEntity: (id: TransversalEntityId, options?: { fly?: boolean }) => Promise<void>;
  restoreEntityFromUrl: (id: string | null | undefined) => void;
  clearEntity: () => void;
  pushTrailStep: (step: StudyTrailStep) => void;
  setActiveTrailKey: (key: string | null) => void;
  clearTrail: () => void;
  resetTransversal: () => void;
}

export const useTransversalStore = create<TransversalState>((set, get) => ({
  activeEntityId: null,
  activeEntity: null,
  isSelectorOpen: false,
  filterKind: "all",
  isLoadingCatalog: false,
  trail: [],
  activeTrailKey: null,

  openSelector: (kind) => {
    set({ isSelectorOpen: true, ...(kind ? { filterKind: kind } : {}) });
    void ensureTransversalCatalogLoaded();
  },

  closeSelector: () => set({ isSelectorOpen: false }),

  toggleSelector: () => {
    const opening = !get().isSelectorOpen;
    set({ isSelectorOpen: opening });
    if (opening) void ensureTransversalCatalogLoaded();
  },

  setFilterKind: (filterKind) => set({ filterKind }),

  activateEntity: async (id, options) => {
    if (!isTransversalEntityId(id)) return;
    set({ activeEntityId: id, isSelectorOpen: false, isLoadingCatalog: true });
    const catalog = await ensureTransversalCatalogLoaded();
    if (get().activeEntityId !== id) return;
    const record = catalog.getTransversalEntity(id) ?? null;
    if (!record) {
      set({ isLoadingCatalog: false });
      return;
    }
    const step = catalog.applyTransversalActivation(record, options?.fly !== false);
    set((s) => ({
      activeEntity: record,
      isLoadingCatalog: false,
      trail: appendTrailStep(s.trail, step),
      activeTrailKey: step.key,
    }));
  },

  restoreEntityFromUrl: (rawId) => {
    if (!isTransversalEntityId(rawId)) {
      if (get().activeEntityId !== null) set({ activeEntityId: null, activeEntity: null });
      return;
    }
    if (get().activeEntityId === rawId && get().activeEntity !== null) return;
    void get().activateEntity(rawId, { fly: false });
  },

  clearEntity: () => set({ activeEntityId: null, activeEntity: null, isSelectorOpen: false }),

  pushTrailStep: (step) =>
    set((s) => ({ trail: appendTrailStep(s.trail, step), activeTrailKey: step.key })),

  setActiveTrailKey: (activeTrailKey) => set({ activeTrailKey }),

  clearTrail: () => set({ trail: [], activeTrailKey: null }),

  resetTransversal: () =>
    set({
      activeEntityId: null,
      activeEntity: null,
      isSelectorOpen: false,
      filterKind: "all",
      isLoadingCatalog: false,
      trail: [],
      activeTrailKey: null,
    }),
}));
