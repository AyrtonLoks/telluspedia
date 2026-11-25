import { create } from "zustand";
import {
  CHOROPLETH_MAX_YEAR,
  CHOROPLETH_MIN_YEAR,
  clampChoroplethYear,
  isChoroplethIndicatorId,
  isTemporalChoroplethIndicator,
  type ChoroplethIndicatorId,
} from "@/lib/choropleth-ids";

export const DEFAULT_CHOROPLETH_OPACITY = 0.78;

interface ChoroplethState {
  activeIndicator: ChoroplethIndicatorId | null;
  /** Ano explícito da série temporal (1990–2024) ou `null` para o snapshot mais recente (D34). */
  year: number | null;
  /** Reprodução animada 1990 → 2024 ativa na legenda coroplética (D34). */
  isPlaying: boolean;
  /** Sincroniza `year` com `useTimelineStore.selectedYear` quando ligado (D34). */
  syncTimeline: boolean;
  opacity: number;
  isSelectorOpen: boolean;

  setIndicator: (indicator: ChoroplethIndicatorId | null) => void;
  restoreIndicator: (
    indicator: string | null | undefined,
    year?: number | null | undefined
  ) => void;
  clearIndicator: () => void;
  setYear: (year: number | null) => void;
  setPlaying: (playing: boolean) => void;
  togglePlaying: () => void;
  stepYear: () => void;
  setSyncTimeline: (sync: boolean) => void;
  setOpacity: (opacity: number) => void;
  setSelectorOpen: (open: boolean) => void;
  toggleSelector: () => void;
  resetChoropleth: () => void;
}

export const useChoroplethStore = create<ChoroplethState>((set) => ({
  activeIndicator: null,
  year: null,
  isPlaying: false,
  syncTimeline: false,
  opacity: DEFAULT_CHOROPLETH_OPACITY,
  isSelectorOpen: false,

  setIndicator: (indicator) =>
    set((state) => ({
      activeIndicator: indicator,
      year: isTemporalChoroplethIndicator(indicator) ? state.year : null,
      isPlaying: isTemporalChoroplethIndicator(indicator) ? state.isPlaying : false,
    })),

  restoreIndicator: (indicator, year) => {
    const validIndicator = isChoroplethIndicatorId(indicator) ? indicator : null;
    const validYear =
      validIndicator && isTemporalChoroplethIndicator(validIndicator)
        ? clampChoroplethYear(year)
        : null;
    set({
      activeIndicator: validIndicator,
      year: validYear,
      isPlaying: false,
      isSelectorOpen: false,
    });
  },

  clearIndicator: () =>
    set({
      activeIndicator: null,
      year: null,
      isPlaying: false,
    }),

  setYear: (year) =>
    set((state) => {
      if (!isTemporalChoroplethIndicator(state.activeIndicator)) {
        return state.year === null ? state : { year: null, isPlaying: false };
      }
      const clamped = clampChoroplethYear(year);
      return state.year === clamped ? state : { year: clamped };
    }),

  setPlaying: (playing) =>
    set((state) => {
      if (!playing || !isTemporalChoroplethIndicator(state.activeIndicator)) {
        return { isPlaying: false };
      }
      const startYear =
        state.year === null || state.year >= CHOROPLETH_MAX_YEAR
          ? CHOROPLETH_MIN_YEAR
          : state.year;
      return { isPlaying: true, year: startYear };
    }),

  togglePlaying: () =>
    set((state) => {
      if (state.isPlaying || !isTemporalChoroplethIndicator(state.activeIndicator)) {
        return { isPlaying: false };
      }
      const startYear =
        state.year === null || state.year >= CHOROPLETH_MAX_YEAR
          ? CHOROPLETH_MIN_YEAR
          : state.year;
      return { isPlaying: true, year: startYear };
    }),

  stepYear: () =>
    set((state) => {
      if (!state.isPlaying || !isTemporalChoroplethIndicator(state.activeIndicator)) {
        return state.isPlaying ? { isPlaying: false } : state;
      }
      const current = state.year ?? CHOROPLETH_MIN_YEAR;
      if (current >= CHOROPLETH_MAX_YEAR) {
        return { year: CHOROPLETH_MAX_YEAR, isPlaying: false };
      }
      return { year: current + 1 };
    }),

  setSyncTimeline: (syncTimeline) => set({ syncTimeline }),

  setOpacity: (opacity) =>
    set({
      opacity: Math.max(
        0.25,
        Math.min(1, Number.isFinite(opacity) ? opacity : DEFAULT_CHOROPLETH_OPACITY)
      ),
    }),

  setSelectorOpen: (open) => set({ isSelectorOpen: open }),

  toggleSelector: () => set((state) => ({ isSelectorOpen: !state.isSelectorOpen })),

  resetChoropleth: () =>
    set({
      activeIndicator: null,
      year: null,
      isPlaying: false,
      syncTimeline: false,
      opacity: DEFAULT_CHOROPLETH_OPACITY,
      isSelectorOpen: false,
    }),
}));
