import { create } from "zustand";

interface ComparatorState {
  isOpen: boolean;
  selectedIsos: string[];
  activeMetric: "GDP" | "POPULATION" | "HDI" | "MILITARY";

  openComparator: () => void;
  closeComparator: () => void;
  toggleComparator: () => void;
  addCountry: (iso: string) => void;
  removeCountry: (iso: string) => void;
  toggleCountry: (iso: string) => void;
  setSelectedIsos: (isos: string[]) => void;
  setActiveMetric: (metric: "GDP" | "POPULATION" | "HDI" | "MILITARY") => void;
}

export const useComparatorStore = create<ComparatorState>((set) => ({
  isOpen: false,
  selectedIsos: ["BRA", "DEU"],
  activeMetric: "GDP",

  openComparator: () => set({ isOpen: true }),
  closeComparator: () => set({ isOpen: false }),
  toggleComparator: () => set((state) => ({ isOpen: !state.isOpen })),

  addCountry: (iso) =>
    set((state) => {
      if (state.selectedIsos.includes(iso)) return state;
      if (state.selectedIsos.length >= 4) return state; // Maximum 4 countries
      return { selectedIsos: [...state.selectedIsos, iso] };
    }),

  removeCountry: (iso) =>
    set((state) => ({
      selectedIsos: state.selectedIsos.filter((code) => code !== iso),
    })),

  toggleCountry: (iso) =>
    set((state) => {
      if (state.selectedIsos.includes(iso)) {
        return { selectedIsos: state.selectedIsos.filter((code) => code !== iso) };
      }
      if (state.selectedIsos.length >= 4) return state;
      return { selectedIsos: [...state.selectedIsos, iso] };
    }),

  setSelectedIsos: (isos) => set({ selectedIsos: isos.slice(0, 4) }),
  setActiveMetric: (metric) => set({ activeMetric: metric }),
}));
