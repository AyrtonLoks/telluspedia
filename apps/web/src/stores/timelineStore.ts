import { create } from "zustand";

export type MilestoneCategoryType =
  | "POLITICS_REGIMES"
  | "ECONOMY"
  | "WAR_MILITARY"
  | "SCIENCE_CULTURE"
  | "HEALTH_PANDEMICS";

export const ALL_CATEGORIES: MilestoneCategoryType[] = [
  "POLITICS_REGIMES",
  "ECONOMY",
  "WAR_MILITARY",
  "SCIENCE_CULTURE",
  "HEALTH_PANDEMICS",
];

export type TimelinePreset =
  | "LAST_50_YEARS"
  | "COLD_WAR"
  | "WORLD_WARS"
  | "21ST_CENTURY"
  | "PANGEA_250MA"
  | "GONDWANA_150MA"
  | "KPG_66MA"
  | "MAGELLAN_1519";

interface TimelineState {
  startYear: number;
  endYear: number;
  selectedYear: number | null;
  selectedMilestoneId: string | null;
  activeCategories: MilestoneCategoryType[];
  isExpanded: boolean;

  // Suporte a Escalas Paleogeográficas e Rotas Históricas (RN10, RN11 & RN12)
  timelineMode: "HISTORICAL" | "GEOLOGICAL";
  geologicalMa: number | null;
  selectedGeologicalMa: number | null;
  activeRouteId: string | null;
  selectedRouteId: string | null;

  setYearRange: (start: number, end: number) => void;
  selectYear: (year: number | null) => void;
  selectMilestone: (id: string | null) => void;
  toggleCategory: (category: MilestoneCategoryType) => void;
  setAllCategories: (categories: MilestoneCategoryType[]) => void;
  toggleExpanded: () => void;
  setPreset: (preset: TimelinePreset | string) => void;

  setTimelineMode: (mode: "HISTORICAL" | "GEOLOGICAL") => void;
  setGeologicalMa: (ma: number | null) => void;
  selectGeologicalMa: (ma: number | null) => void;
  setActiveRouteId: (id: string | null) => void;
  selectHistoricalRoute: (id: string | null) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  startYear: 1974,
  endYear: 2024,
  selectedYear: null,
  selectedMilestoneId: null,
  activeCategories: [...ALL_CATEGORIES],
  isExpanded: true,

  timelineMode: "HISTORICAL",
  geologicalMa: null,
  selectedGeologicalMa: null,
  activeRouteId: null,
  selectedRouteId: null,

  setYearRange: (start, end) => set({ startYear: start, endYear: end }),
  selectYear: (year) => set({ selectedYear: year }),
  selectMilestone: (id) => set({ selectedMilestoneId: id }),

  toggleCategory: (cat) =>
    set((state) => {
      const exists = state.activeCategories.includes(cat);
      if (exists) {
        if (state.activeCategories.length === 1) return state; // keep at least one
        return { activeCategories: state.activeCategories.filter((c) => c !== cat) };
      }
      return { activeCategories: [...state.activeCategories, cat] };
    }),

  setAllCategories: (cats) => set({ activeCategories: cats }),
  toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

  setTimelineMode: (mode) =>
    set((state) => {
      if (mode === "GEOLOGICAL") {
        try {
          const { useHistoricalRouteStore } = require("./historicalRouteStore");
          if (useHistoricalRouteStore.getState().activeRouteId !== null) {
            useHistoricalRouteStore.getState().setActiveRouteId(null);
          }
        } catch {
          // safe
        }
        return {
          timelineMode: "GEOLOGICAL",
          geologicalMa: state.geologicalMa ?? 250,
          selectedGeologicalMa: state.selectedGeologicalMa ?? 250,
          selectedYear: null,
          selectedMilestoneId: null,
          activeRouteId: null,
          selectedRouteId: null,
        };
      }
      return {
        timelineMode: "HISTORICAL",
        geologicalMa: null,
        selectedGeologicalMa: null,
      };
    }),

  setGeologicalMa: (ma) =>
    set({
      geologicalMa: ma,
      selectedGeologicalMa: ma,
      timelineMode: ma !== null ? "GEOLOGICAL" : "HISTORICAL",
    }),

  selectGeologicalMa: (ma) =>
    set({
      geologicalMa: ma,
      selectedGeologicalMa: ma,
      timelineMode: ma !== null ? "GEOLOGICAL" : "HISTORICAL",
    }),

  setActiveRouteId: (id) => {
    set({
      activeRouteId: id,
      selectedRouteId: id,
    });
    try {
      const { useHistoricalRouteStore } = require("./historicalRouteStore");
      if (useHistoricalRouteStore.getState().activeRouteId !== id) {
        useHistoricalRouteStore.getState().setActiveRouteId(id);
      }
    } catch {
      // safe
    }
  },

  selectHistoricalRoute: (id) => {
    set({
      activeRouteId: id,
      selectedRouteId: id,
    });
    try {
      const { useHistoricalRouteStore } = require("./historicalRouteStore");
      if (useHistoricalRouteStore.getState().activeRouteId !== id) {
        useHistoricalRouteStore.getState().setActiveRouteId(id);
      }
    } catch {
      // safe
    }
  },

  setPreset: (preset) => {
    const syncRoute = (id: string | null) => {
      try {
        const { useHistoricalRouteStore } = require("./historicalRouteStore");
        if (useHistoricalRouteStore.getState().activeRouteId !== id) {
          useHistoricalRouteStore.getState().setActiveRouteId(id);
        }
      } catch {
        // safe
      }
    };

    switch (preset) {
      case "LAST_50_YEARS":
        set({
          startYear: 1974,
          endYear: 2024,
          geologicalMa: null,
          selectedGeologicalMa: null,
          timelineMode: "HISTORICAL",
          activeRouteId: null,
          selectedRouteId: null,
          selectedMilestoneId: null,
        });
        syncRoute(null);
        break;
      case "COLD_WAR":
        set({
          startYear: 1947,
          endYear: 1991,
          geologicalMa: null,
          selectedGeologicalMa: null,
          timelineMode: "HISTORICAL",
          activeRouteId: null,
          selectedRouteId: null,
          selectedMilestoneId: null,
        });
        syncRoute(null);
        break;
      case "WORLD_WARS":
        set({
          startYear: 1914,
          endYear: 1945,
          geologicalMa: null,
          selectedGeologicalMa: null,
          timelineMode: "HISTORICAL",
          activeRouteId: null,
          selectedRouteId: null,
          selectedMilestoneId: null,
        });
        syncRoute(null);
        break;
      case "21ST_CENTURY":
        set({
          startYear: 2000,
          endYear: 2026,
          geologicalMa: null,
          selectedGeologicalMa: null,
          timelineMode: "HISTORICAL",
          activeRouteId: null,
          selectedRouteId: null,
          selectedMilestoneId: null,
        });
        syncRoute(null);
        break;
      case "PANGEA_250MA":
        set({
          timelineMode: "GEOLOGICAL",
          geologicalMa: 250,
          selectedGeologicalMa: 250,
          selectedYear: null,
          selectedMilestoneId: null,
          activeRouteId: null,
          selectedRouteId: null,
        });
        syncRoute(null);
        break;
      case "GONDWANA_150MA":
        set({
          timelineMode: "GEOLOGICAL",
          geologicalMa: 150,
          selectedGeologicalMa: 150,
          selectedYear: null,
          selectedMilestoneId: null,
          activeRouteId: null,
          selectedRouteId: null,
        });
        syncRoute(null);
        break;
      case "KPG_66MA":
        set({
          timelineMode: "GEOLOGICAL",
          geologicalMa: 66,
          selectedGeologicalMa: 66,
          selectedYear: null,
          selectedMilestoneId: null,
          activeRouteId: null,
          selectedRouteId: null,
        });
        syncRoute(null);
        break;
      case "MAGELLAN_1519":
        set({
          timelineMode: "HISTORICAL",
          geologicalMa: null,
          selectedGeologicalMa: null,
          startYear: 1519,
          endYear: 1522,
          selectedYear: 1519,
          selectedMilestoneId: null,
          activeRouteId: "magellan-1519",
          selectedRouteId: "magellan-1519",
        });
        syncRoute("magellan-1519");
        break;
    }
  },
}));
