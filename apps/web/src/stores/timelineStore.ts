import { create } from "zustand";
import {
  DEFAULT_TIMELINE_END_YEAR,
  DEFAULT_TIMELINE_START_YEAR,
} from "@/lib/timeline/current-year";

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
  isExpanded: boolean | null;

  geologicalMa: number | null;

  setYearRange: (start: number, end: number) => void;
  selectYear: (year: number | null) => void;
  selectMilestone: (id: string | null) => void;
  toggleCategory: (category: MilestoneCategoryType) => void;
  setAllCategories: (categories: MilestoneCategoryType[]) => void;
  setExpanded: (expanded: boolean) => void;
  setGeologicalMa: (ma: number | null) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  startYear: DEFAULT_TIMELINE_START_YEAR,
  endYear: DEFAULT_TIMELINE_END_YEAR,
  selectedYear: null,
  selectedMilestoneId: null,
  activeCategories: [...ALL_CATEGORIES],
  isExpanded: null,

  geologicalMa: null,

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
  setExpanded: (expanded) => set({ isExpanded: expanded }),

  setGeologicalMa: (geologicalMa) => set({ geologicalMa }),
}));
