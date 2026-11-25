import { create } from "zustand";
import type { BordersLodLevel } from "@/lib/borders-lod";
import {
  DEFAULT_MAP_PROJECTION,
  DEFAULT_MAP_VIEW_MODE,
  isMapProjectionId,
  isMapViewMode,
  type MapProjectionId,
  type MapViewMode,
} from "@/lib/map-projections-types";

export const MIN_CAMERA_ALTITUDE = 1.5;
export const MAX_CAMERA_ALTITUDE = 6.0;
export const DEFAULT_CAMERA_ALTITUDE = 2.5;

interface GlobeState {
  selectedIso: string | null;
  hoveredIso: string | null;
  cameraLat: number;
  cameraLng: number;
  cameraAltitude: number;
  flyToTrigger: number;
  isReaderOpen: boolean;
  isThrottled: boolean;
  viewMode: MapViewMode;
  projectionId: MapProjectionId;
  bordersLod: BordersLodLevel;
  highResBordersReady: boolean;

  setSelectedIso: (iso: string | null) => void;
  setHoveredIso: (iso: string | null) => void;
  flyTo: (lat: number, lng: number, altitude?: number) => void;
  setCameraPosition: (lat: number, lng: number, altitude?: number) => void;
  setReaderOpen: (isOpen: boolean) => void;
  setViewMode: (mode: MapViewMode) => void;
  toggleViewMode: () => void;
  setProjectionId: (id: MapProjectionId) => void;
  setBordersLod: (lod: BordersLodLevel) => void;
  setHighResBordersReady: (ready: boolean) => void;
  resetView: () => void;
}

/**
 * Normalizes latitude between [-89.9, 89.9] to avoid polar singularities.
 */
function clampLatitude(lat: number): number {
  if (!Number.isFinite(lat)) return 0;
  return Math.max(-89.9, Math.min(89.9, lat));
}

/**
 * Normalizes longitude between [-180, 180].
 */
function normalizeLongitude(lng: number): number {
  if (!Number.isFinite(lng)) return 0;
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

/**
 * Clamps altitude strictly to safe bounds [1.5, 6.0] to prevent the camera
 * from entering the Earth or flying into infinity.
 */
function clampAltitude(altitude?: number): number {
  if (!Number.isFinite(altitude)) return 2.0;
  return Math.max(MIN_CAMERA_ALTITUDE, Math.min(MAX_CAMERA_ALTITUDE, altitude!));
}

export const useGlobeStore = create<GlobeState>((set) => ({
  selectedIso: null,
  hoveredIso: null,
  cameraLat: 0,
  cameraLng: 0,
  cameraAltitude: DEFAULT_CAMERA_ALTITUDE,
  flyToTrigger: 0,
  isReaderOpen: false,
  isThrottled: false,
  viewMode: DEFAULT_MAP_VIEW_MODE,
  projectionId: DEFAULT_MAP_PROJECTION,
  bordersLod: "110m",
  highResBordersReady: false,

  setSelectedIso: (iso) =>
    set({ selectedIso: iso, ...(iso === null ? { hoveredIso: null } : {}) }),

  setHoveredIso: (iso) => set({ hoveredIso: iso }),

  flyTo: (lat, lng, altitude = 2.0) =>
    set((state) => ({
      cameraLat: Number(clampLatitude(lat).toFixed(4)),
      cameraLng: Number(normalizeLongitude(lng).toFixed(4)),
      cameraAltitude: Number(clampAltitude(altitude).toFixed(4)),
      flyToTrigger: state.flyToTrigger + 1,
    })),

  setCameraPosition: (lat, lng, altitude = DEFAULT_CAMERA_ALTITUDE) =>
    set({
      cameraLat: Number(clampLatitude(lat).toFixed(4)),
      cameraLng: Number(normalizeLongitude(lng).toFixed(4)),
      cameraAltitude: Number(clampAltitude(altitude).toFixed(4)),
    }),

  setReaderOpen: (isOpen) =>
    set((state) => ({
      isReaderOpen: isOpen,
      isThrottled: isOpen || state.viewMode === "2d",
    })),

  setViewMode: (mode) =>
    set((state) => {
      const safeMode = isMapViewMode(mode) ? mode : DEFAULT_MAP_VIEW_MODE;
      const nextThrottled = state.isReaderOpen || safeMode === "2d";
      if (state.viewMode === safeMode && state.isThrottled === nextThrottled) return state;
      return {
        viewMode: safeMode,
        isThrottled: nextThrottled,
        hoveredIso: null,
      };
    }),

  toggleViewMode: () =>
    set((state) => {
      const nextMode: MapViewMode = state.viewMode === "2d" ? "3d" : "2d";
      return {
        viewMode: nextMode,
        isThrottled: state.isReaderOpen || nextMode === "2d",
        hoveredIso: null,
      };
    }),

  setProjectionId: (id) =>
    set((state) => {
      const safeId = isMapProjectionId(id) ? id : DEFAULT_MAP_PROJECTION;
      return state.projectionId === safeId ? state : { projectionId: safeId };
    }),

  setBordersLod: (lod) =>
    set((state) => (state.bordersLod === lod ? state : { bordersLod: lod })),

  setHighResBordersReady: (ready) =>
    set((state) => (state.highResBordersReady === ready ? state : { highResBordersReady: ready })),

  resetView: () =>
    set((state) => ({
      selectedIso: null,
      hoveredIso: null,
      cameraLat: 0,
      cameraLng: 0,
      cameraAltitude: DEFAULT_CAMERA_ALTITUDE,
      flyToTrigger: state.flyToTrigger + 1,
      isReaderOpen: false,
      isThrottled: false,
      viewMode: DEFAULT_MAP_VIEW_MODE,
      projectionId: DEFAULT_MAP_PROJECTION,
    })),
}));
