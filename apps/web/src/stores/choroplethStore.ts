import { create } from "zustand";
import {
  isChoroplethIndicatorId,
  type ChoroplethIndicatorId,
} from "@/lib/choropleth-ids";

export const DEFAULT_CHOROPLETH_OPACITY = 0.78;

interface ChoroplethState {
  activeIndicator: ChoroplethIndicatorId | null;
  opacity: number;
  isSelectorOpen: boolean;

  setIndicator: (indicator: ChoroplethIndicatorId | null) => void;
  restoreIndicator: (indicator: string | null | undefined) => void;
  clearIndicator: () => void;
  setOpacity: (opacity: number) => void;
  setSelectorOpen: (open: boolean) => void;
  toggleSelector: () => void;
  resetChoropleth: () => void;
}

export const useChoroplethStore = create<ChoroplethState>((set) => ({
  activeIndicator: null,
  opacity: DEFAULT_CHOROPLETH_OPACITY,
  isSelectorOpen: false,

  setIndicator: (indicator) =>
    set({
      activeIndicator: indicator,
    }),

  restoreIndicator: (indicator) =>
    set({
      activeIndicator: isChoroplethIndicatorId(indicator) ? indicator : null,
      isSelectorOpen: false,
    }),

  clearIndicator: () => set({ activeIndicator: null }),

  setOpacity: (opacity) =>
    set({ opacity: Math.max(0.25, Math.min(1, Number.isFinite(opacity) ? opacity : DEFAULT_CHOROPLETH_OPACITY)) }),

  setSelectorOpen: (open) => set({ isSelectorOpen: open }),

  toggleSelector: () => set((state) => ({ isSelectorOpen: !state.isSelectorOpen })),

  resetChoropleth: () =>
    set({
      activeIndicator: null,
      opacity: DEFAULT_CHOROPLETH_OPACITY,
      isSelectorOpen: false,
    }),
}));
