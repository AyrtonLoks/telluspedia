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

interface TimelineState {
  startYear: number;
  endYear: number;
  selectedYear: number | null;
  selectedMilestoneId: string | null;
  activeCategories: MilestoneCategoryType[];
  isExpanded: boolean;

  setYearRange: (start: number, end: number) => void;
  selectYear: (year: number | null) => void;
  selectMilestone: (id: string | null) => void;
  toggleCategory: (category: MilestoneCategoryType) => void;
  setAllCategories: (categories: MilestoneCategoryType[]) => void;
  toggleExpanded: () => void;
  setPreset: (preset: "LAST_50_YEARS" | "COLD_WAR" | "WORLD_WARS" | "21ST_CENTURY") => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  startYear: 1974,
  endYear: 2024,
  selectedYear: 2024,
  selectedMilestoneId: null,
  activeCategories: [...ALL_CATEGORIES],
  isExpanded: true,

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

  setPreset: (preset) => {
    switch (preset) {
      case "LAST_50_YEARS":
        set({ startYear: 1974, endYear: 2024 });
        break;
      case "COLD_WAR":
        set({ startYear: 1947, endYear: 1991 });
        break;
      case "WORLD_WARS":
        set({ startYear: 1914, endYear: 1945 });
        break;
      case "21ST_CENTURY":
        set({ startYear: 2000, endYear: 2026 });
        break;
    }
  },
}));
