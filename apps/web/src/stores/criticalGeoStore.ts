import { create } from "zustand";
import {
  isCriticalGeoLensId,
  isFourBrazilsRegionId,
  type CriticalGeoLensId,
  type FourBrazilsRegionId,
  type VerticalityFocusMode,
} from "@/lib/critical-geo-ids";

export const DEFAULT_CRITICAL_GEO_OPACITY = 0.8;

interface CriticalGeoState {
  activeLens: CriticalGeoLensId | null;
  selectedRegionId: FourBrazilsRegionId | null;
  hoveredRegionId: FourBrazilsRegionId | null;
  verticalityMode: VerticalityFocusMode;
  showIbgeComparison: boolean;
  opacity: number;

  setLens: (lens: CriticalGeoLensId | null) => void;
  restoreLens: (lens: string | null | undefined) => void;
  clearLens: () => void;
  setSelectedRegion: (regionId: FourBrazilsRegionId | null) => void;
  setHoveredRegion: (regionId: FourBrazilsRegionId | null) => void;
  setVerticalityMode: (mode: VerticalityFocusMode) => void;
  toggleIbgeComparison: () => void;
  setShowIbgeComparison: (show: boolean) => void;
  setOpacity: (opacity: number) => void;
  resetCriticalGeo: () => void;
}

export const useCriticalGeoStore = create<CriticalGeoState>((set) => ({
  activeLens: null,
  selectedRegionId: null,
  hoveredRegionId: null,
  verticalityMode: "both",
  showIbgeComparison: false,
  opacity: DEFAULT_CRITICAL_GEO_OPACITY,

  setLens: (lens) =>
    set((state) => ({
      activeLens: lens,
      selectedRegionId: lens === "FOUR_BRAZILS" ? state.selectedRegionId ?? "CONCENTRADA" : null,
      hoveredRegionId: null,
    })),

  restoreLens: (lens) => {
    const valid = isCriticalGeoLensId(lens) ? lens : null;
    set({
      activeLens: valid,
      selectedRegionId: valid === "FOUR_BRAZILS" ? "CONCENTRADA" : null,
      hoveredRegionId: null,
    });
  },

  clearLens: () =>
    set({
      activeLens: null,
      selectedRegionId: null,
      hoveredRegionId: null,
    }),

  setSelectedRegion: (regionId) =>
    set({
      selectedRegionId: isFourBrazilsRegionId(regionId) ? regionId : null,
    }),

  setHoveredRegion: (regionId) =>
    set({
      hoveredRegionId: isFourBrazilsRegionId(regionId) ? regionId : null,
    }),

  setVerticalityMode: (verticalityMode) => set({ verticalityMode }),

  toggleIbgeComparison: () =>
    set((state) => ({ showIbgeComparison: !state.showIbgeComparison })),

  setShowIbgeComparison: (show) => set({ showIbgeComparison: show }),

  setOpacity: (opacity) =>
    set({
      opacity: Math.max(
        0.3,
        Math.min(1, Number.isFinite(opacity) ? opacity : DEFAULT_CRITICAL_GEO_OPACITY)
      ),
    }),

  resetCriticalGeo: () =>
    set({
      activeLens: null,
      selectedRegionId: null,
      hoveredRegionId: null,
      verticalityMode: "both",
      showIbgeComparison: false,
      opacity: DEFAULT_CRITICAL_GEO_OPACITY,
    }),
}));
