import { create } from "zustand";
import type { RulerWaypoint } from "@/lib/geodesic-ruler";

const MAX_WAYPOINTS = 16;

function clampLat(lat: number): number {
  return Math.max(-90, Math.min(90, lat));
}

function normLng(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

export interface StudioToolsState {
  /** Quando `true`, cliques no globo 3D / mapa 2D marcam vértices da Régua Geodésica. */
  isRulerActive: boolean;
  rulerPoints: RulerWaypoint[];

  /** Quando `true`, o painel de Pinos Anotados do Estudo está aberto. */
  isPinsPanelOpen: boolean;
  /** Quando `true`, o próximo clique no globo define as coordenadas `(lat, lng)` de um novo pino. */
  isPinPlacementActive: boolean;
  pendingPinCoords: { lat: number; lng: number } | null;
  selectedAnnotationId: string | null;

  toggleRuler: () => void;
  setRulerActive: (active: boolean) => void;
  addRulerPoint: (lat: number, lng: number, label?: string) => void;
  removeLastRulerPoint: () => void;
  clearRulerPoints: () => void;

  togglePinsPanel: () => void;
  setPinsPanelOpen: (open: boolean) => void;
  setPinPlacementActive: (active: boolean) => void;
  pickPinCoordinates: (lat: number, lng: number) => void;
  clearPendingPin: () => void;
  selectAnnotation: (id: string | null) => void;

  resetStudioTools: () => void;
}

function makeWaypointId(): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `wp-${rand}`;
}

export const useStudioToolsStore = create<StudioToolsState>((set) => ({
  isRulerActive: false,
  rulerPoints: [],
  isPinsPanelOpen: false,
  isPinPlacementActive: false,
  pendingPinCoords: null,
  selectedAnnotationId: null,

  toggleRuler: () =>
    set((s) => {
      const next = !s.isRulerActive;
      return next
        ? { isRulerActive: true, isPinPlacementActive: false }
        : { isRulerActive: false };
    }),

  setRulerActive: (active) =>
    set(() =>
      active
        ? { isRulerActive: true, isPinPlacementActive: false }
        : { isRulerActive: false }
    ),

  addRulerPoint: (lat, lng, label) =>
    set((s) => {
      if (s.rulerPoints.length >= MAX_WAYPOINTS) return s;
      const point: RulerWaypoint = {
        id: makeWaypointId(),
        lat: Number(clampLat(lat).toFixed(4)),
        lng: Number(normLng(lng).toFixed(4)),
        ...(label ? { label } : {}),
      };
      return { rulerPoints: [...s.rulerPoints, point] };
    }),

  removeLastRulerPoint: () =>
    set((s) => ({
      rulerPoints: s.rulerPoints.slice(0, -1),
    })),

  clearRulerPoints: () => set({ rulerPoints: [] }),

  togglePinsPanel: () =>
    set((s) => {
      const next = !s.isPinsPanelOpen;
      return next
        ? { isPinsPanelOpen: true }
        : { isPinsPanelOpen: false, isPinPlacementActive: false, pendingPinCoords: null };
    }),

  setPinsPanelOpen: (open) =>
    set((s) =>
      open
        ? { isPinsPanelOpen: true }
        : {
            isPinsPanelOpen: false,
            isPinPlacementActive: false,
            pendingPinCoords: null,
            selectedAnnotationId: s.selectedAnnotationId,
          }
    ),

  setPinPlacementActive: (active) =>
    set(() =>
      active
        ? { isPinPlacementActive: true, isPinsPanelOpen: true, isRulerActive: false }
        : { isPinPlacementActive: false }
    ),

  pickPinCoordinates: (lat, lng) =>
    set({
      pendingPinCoords: {
        lat: Number(clampLat(lat).toFixed(4)),
        lng: Number(normLng(lng).toFixed(4)),
      },
      isPinPlacementActive: false,
      isPinsPanelOpen: true,
    }),

  clearPendingPin: () => set({ pendingPinCoords: null, isPinPlacementActive: false }),

  selectAnnotation: (id) =>
    set((s) => ({
      selectedAnnotationId: id,
      isPinsPanelOpen: id !== null ? true : s.isPinsPanelOpen,
    })),

  resetStudioTools: () =>
    set({
      isRulerActive: false,
      rulerPoints: [],
      isPinsPanelOpen: false,
      isPinPlacementActive: false,
      pendingPinCoords: null,
      selectedAnnotationId: null,
    }),
}));
