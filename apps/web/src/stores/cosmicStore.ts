import { create } from "zustand";
import { CelestialBodyId } from "@/lib/astronomy-planets";
import type { CosmicScaleMode } from "@/lib/cosmic-scale";
import type { DeepSpaceProbeId } from "@/lib/deep-space-probes-ids";
import {
  clampEclipseOffsetMinutes,
  type EclipseId,
} from "@/lib/eclipses-ids";

export const COSMIC_LAYER_LABELS = {
  ORBITS: "Órbitas Keplerianas",
  CONSTELLATIONS: "88 Constelações IAU",
  ASTEROIDS: "Cinturão de Asteroides",
  LABELS: "Rótulos do céu e dos planetas",
  COMETS: "Cometa 1P/Halley",
  METEORS: "Chuvas de Meteoros",
  PROBES: "Sondas do Espaço Profundo",
} as const;

export type CosmicLayerId = keyof typeof COSMIC_LAYER_LABELS;
export const ALL_COSMIC_LAYERS = Object.keys(COSMIC_LAYER_LABELS) as CosmicLayerId[];

export interface CosmicState {
  isCosmicMode: boolean;
  focusedBodyId: CelestialBodyId | null;
  hoveredBodyId: CelestialBodyId | null;
  focusedProbeId: DeepSpaceProbeId | null;
  hoveredProbeId: DeepSpaceProbeId | null;
  activeEclipseId: EclipseId | null;
  eclipseOffsetMinutes: number;
  isEclipseMenuOpen: boolean;
  activeCosmicLayers: CosmicLayerId[];
  isPlaying: boolean;
  playbackSpeed: number; // 1 | 30 | 365
  isInspectorOpen: boolean;
  /** Política de escala dos corpos (D11): exagero visual ou proporção real entre raios. */
  scaleMode: CosmicScaleMode;

  enterCosmicView: (targetBodyId?: CelestialBodyId) => void;
  enterCosmicProbeView: (probeId: DeepSpaceProbeId) => void;
  exitToEarthView: () => void;
  toggleCosmicMode: () => void;
  focusBody: (id: CelestialBodyId | null) => void;
  setHoveredBody: (id: CelestialBodyId | null) => void;
  focusProbe: (id: DeepSpaceProbeId | null) => void;
  setHoveredProbe: (id: DeepSpaceProbeId | null) => void;
  setActiveEclipse: (id: EclipseId | null, offsetMinutes?: number) => void;
  setEclipseOffsetMinutes: (minutes: number) => void;
  setEclipseMenuOpen: (open: boolean) => void;
  toggleEclipseMenu: () => void;
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
  focusedProbeId: null,
  hoveredProbeId: null,
  activeEclipseId: null,
  eclipseOffsetMinutes: 0,
  isEclipseMenuOpen: false,
  activeCosmicLayers: [...ALL_COSMIC_LAYERS],
  isPlaying: false,
  playbackSpeed: 30,
  isInspectorOpen: false,
  scaleMode: "visual",

  enterCosmicView: (targetBodyId) =>
    set({
      isCosmicMode: true,
      focusedBodyId: targetBodyId ?? null,
      focusedProbeId: null,
      isInspectorOpen: targetBodyId ? true : false,
    }),

  enterCosmicProbeView: (probeId) =>
    set((state) => ({
      isCosmicMode: true,
      focusedBodyId: null,
      focusedProbeId: probeId,
      isInspectorOpen: true,
      activeCosmicLayers: state.activeCosmicLayers.includes("PROBES")
        ? state.activeCosmicLayers
        : [...state.activeCosmicLayers, "PROBES"],
    })),

  exitToEarthView: () =>
    set({
      isCosmicMode: false,
      focusedBodyId: null,
      focusedProbeId: null,
      hoveredProbeId: null,
      isInspectorOpen: false,
      isPlaying: false,
    }),

  toggleCosmicMode: () =>
    set((state) => ({
      isCosmicMode: !state.isCosmicMode,
      focusedBodyId: null,
      focusedProbeId: null,
      hoveredProbeId: null,
      isInspectorOpen: false,
    })),

  focusBody: (id) =>
    set({
      focusedBodyId: id,
      focusedProbeId: null,
      isInspectorOpen: id !== null,
    }),

  setHoveredBody: (id) => set({ hoveredBodyId: id }),

  focusProbe: (id) =>
    set({
      focusedProbeId: id,
      focusedBodyId: null,
      isInspectorOpen: id !== null,
    }),

  setHoveredProbe: (id) => set({ hoveredProbeId: id }),

  setActiveEclipse: (id, offsetMinutes = 0) =>
    set({
      activeEclipseId: id,
      eclipseOffsetMinutes: clampEclipseOffsetMinutes(offsetMinutes),
      isEclipseMenuOpen: id !== null,
    }),

  setEclipseOffsetMinutes: (minutes) =>
    set({ eclipseOffsetMinutes: clampEclipseOffsetMinutes(minutes) }),

  setEclipseMenuOpen: (isEclipseMenuOpen) => set({ isEclipseMenuOpen }),

  toggleEclipseMenu: () =>
    set((state) => ({ isEclipseMenuOpen: !state.isEclipseMenuOpen })),

  toggleLayer: (layer) =>
    set((state) => {
      const exists = state.activeCosmicLayers.includes(layer);
      const nextLayers = exists
        ? state.activeCosmicLayers.filter((l) => l !== layer)
        : [...state.activeCosmicLayers, layer];
      const clearProbe = layer === "PROBES" && exists;
      return {
        activeCosmicLayers: nextLayers,
        focusedProbeId: clearProbe ? null : state.focusedProbeId,
        hoveredProbeId: clearProbe ? null : state.hoveredProbeId,
        isInspectorOpen:
          clearProbe && state.focusedProbeId !== null ? false : state.isInspectorOpen,
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
      focusedProbeId: null,
      hoveredProbeId: null,
      activeEclipseId: null,
      eclipseOffsetMinutes: 0,
      isEclipseMenuOpen: false,
      activeCosmicLayers: [...ALL_COSMIC_LAYERS],
      isPlaying: false,
      playbackSpeed: 30,
      isInspectorOpen: false,
      scaleMode: "visual",
    }),
}));
