import { create } from "zustand";
import {
  isGraphicsQualityPreset,
  readStoredQualityPreset,
  writeStoredQualityPreset,
  type GraphicsQualityPreset,
} from "@/lib/webgl-quality";

interface GraphicsQualityState {
  preset: GraphicsQualityPreset;
  adaptiveDprScale: number;
  effectiveDpr: number;
  currentFps: number | null;
  isPanelOpen: boolean;

  setPreset: (preset: GraphicsQualityPreset) => void;
  hydrateFromStorage: () => void;
  setTelemetry: (telemetry: {
    currentFps?: number | null;
    effectiveDpr?: number;
    adaptiveDprScale?: number;
  }) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  resetQualityState: () => void;
}

export const useGraphicsQualityStore = create<GraphicsQualityState>((set) => ({
  preset: "auto",
  adaptiveDprScale: 1.0,
  effectiveDpr: 1.0,
  currentFps: null,
  isPanelOpen: false,

  setPreset: (preset) => {
    if (!isGraphicsQualityPreset(preset)) return;
    writeStoredQualityPreset(preset);
    set({
      preset,
      adaptiveDprScale: 1.0,
    });
  },

  hydrateFromStorage: () => {
    const stored = readStoredQualityPreset();
    set((state) => (state.preset === stored ? state : { preset: stored, adaptiveDprScale: 1.0 }));
  },

  setTelemetry: (telemetry) =>
    set((state) => ({
      currentFps: telemetry.currentFps !== undefined ? telemetry.currentFps : state.currentFps,
      effectiveDpr: telemetry.effectiveDpr !== undefined ? telemetry.effectiveDpr : state.effectiveDpr,
      adaptiveDprScale:
        telemetry.adaptiveDprScale !== undefined ? telemetry.adaptiveDprScale : state.adaptiveDprScale,
    })),

  setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),

  togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

  resetQualityState: () =>
    set({
      preset: "auto",
      adaptiveDprScale: 1.0,
      effectiveDpr: 1.0,
      currentFps: null,
      isPanelOpen: false,
    }),
}));
