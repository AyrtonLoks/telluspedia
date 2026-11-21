import { create } from "zustand";
import { CelestialBodyId } from "@/lib/astronomy-planets";
import type { CosmicScaleMode } from "@/lib/cosmic-scale";

export const COSMIC_LAYER_LABELS = {
  ORBITS: "Órbitas Keplerianas",
  CONSTELLATIONS: "88 Constelações IAU",
  ASTEROIDS: "Cinturão de Asteroides",
  LABELS: "Rótulos do céu e dos planetas",
  COMETS: "Cometa 1P/Halley",
  METEORS: "Chuvas de Meteoros",
} as const;

export type CosmicLayerId = keyof typeof COSMIC_LAYER_LABELS;
export const ALL_COSMIC_LAYERS = Object.keys(COSMIC_LAYER_LABELS) as CosmicLayerId[];

export interface CosmicState {
  isCosmicMode: boolean;
  focusedBodyId: CelestialBodyId | null;
  hoveredBodyId: CelestialBodyId | null;
  activeCosmicLayers: CosmicLayerId[];
  isPlaying: boolean;
  playbackSpeed: number; // 1 | 30 | 365
  isInspectorOpen: boolean;
  /** Política de escala dos corpos (D11): exagero visual ou proporção real entre raios. */
  scaleMode: CosmicScaleMode;

  enterCosmicView: (targetBodyId?: CelestialBodyId) => void;
  exitToEarthView: () => void;
  toggleCosmicMode: () => void;
  focusBody: (id: CelestialBodyId | null) => void;
  setHoveredBody: (id: CelestialBodyId | null) => void;
  toggleLayer: (layer: CosmicLayerId) => void;
  setLayers: (layers: CosmicLayerId[]) => void;
  setPlayback: (isPlaying: boolean, speed?: number) => void;
  setPlaybackSpeed: (speed: number) => void;
  setInspectorOpen: (open: boolean) => void;
  setScaleMode: (mode: CosmicScaleMode) => void;
  resetCosmicState: () => void;
}

export const useCosmicStore = create<CosmicState>((set) => ({
  isCosmicMode: false,
  focusedBodyId: null,
  hoveredBodyId: null,
  activeCosmicLayers: [...ALL_COSMIC_LAYERS],
  isPlaying: false,
  playbackSpeed: 30,
  isInspectorOpen: false,
  scaleMode: "visual",

  enterCosmicView: (targetBodyId) =>
    set({
      isCosmicMode: true,
      focusedBodyId: targetBodyId ?? null,
      isInspectorOpen: targetBodyId ? true : false,
    }),

  exitToEarthView: () =>
    set({
      isCosmicMode: false,
      focusedBodyId: null,
      isInspectorOpen: false,
      isPlaying: false,
    }),

  toggleCosmicMode: () =>
    set((state) => ({
      isCosmicMode: !state.isCosmicMode,
      focusedBodyId: !state.isCosmicMode ? null : null,
      isInspectorOpen: false,
    })),

  focusBody: (id) =>
    set({
      focusedBodyId: id,
      isInspectorOpen: id !== null,
    }),

  setHoveredBody: (id) => set({ hoveredBodyId: id }),

  toggleLayer: (layer) =>
    set((state) => {
      const exists = state.activeCosmicLayers.includes(layer);
      return {
        activeCosmicLayers: exists
          ? state.activeCosmicLayers.filter((l) => l !== layer)
          : [...state.activeCosmicLayers, layer],
      };
    }),

  setLayers: (layers) => set({ activeCosmicLayers: layers }),

  setPlayback: (isPlaying, speed) =>
    set((state) => ({
      isPlaying,
      playbackSpeed: speed !== undefined ? speed : state.playbackSpeed,
    })),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  setInspectorOpen: (open) => set({ isInspectorOpen: open }),

  setScaleMode: (mode) => set({ scaleMode: mode }),

  resetCosmicState: () =>
    set({
      isCosmicMode: false,
      focusedBodyId: null,
      hoveredBodyId: null,
      activeCosmicLayers: [...ALL_COSMIC_LAYERS],
      isPlaying: false,
      playbackSpeed: 30,
      isInspectorOpen: false,
      scaleMode: "visual",
    }),
}));
