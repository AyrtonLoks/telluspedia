import { create } from "zustand";
import { CelestialBodyId } from "@/lib/astronomy-planets";

export type CosmicLayerId =
  | "ORBITS"
  | "CONSTELLATIONS"
  | "ASTEROIDS"
  | "LABELS"
  | "COMETS"
  | "METEORS";

export const ALL_COSMIC_LAYERS: CosmicLayerId[] = [
  "ORBITS",
  "CONSTELLATIONS",
  "ASTEROIDS",
  "LABELS",
  "COMETS",
  "METEORS",
];

export interface CosmicState {
  isCosmicMode: boolean;
  focusedBodyId: CelestialBodyId | null;
  hoveredBodyId: CelestialBodyId | null;
  activeCosmicLayers: CosmicLayerId[];
  isPlaying: boolean;
  playbackSpeed: number; // 1 | 30 | 365
  isInspectorOpen: boolean;

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

  resetCosmicState: () =>
    set({
      isCosmicMode: false,
      focusedBodyId: null,
      hoveredBodyId: null,
      activeCosmicLayers: [...ALL_COSMIC_LAYERS],
      isPlaying: false,
      playbackSpeed: 30,
      isInspectorOpen: false,
    }),
}));
