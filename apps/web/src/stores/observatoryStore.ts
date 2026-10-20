import { create } from "zustand";
import {
  ObservatoryLayerId,
  FirmsHotspot,
  EonetEvent,
  IssTelemetryData,
  AircraftState,
  MaritimeRoute,
  ObservatoryEntity,
  FALLBACK_FIRMS_HOTSPOTS,
  FALLBACK_EONET_EVENTS,
  FALLBACK_AIRCRAFT_FLEET,
  FALLBACK_MARITIME_ROUTES,
  calculateIssPosition,
} from "@/lib/observatory-data";

interface ObservatoryState {
  activeLayers: ObservatoryLayerId[];
  layerOpacity: Record<ObservatoryLayerId, number>;
  isPanelOpen: boolean;
  selectedEntity: ObservatoryEntity | null;

  firmsHotspots: FirmsHotspot[];
  eonetEvents: EonetEvent[];
  issTelemetry: IssTelemetryData | null;
  aircraftFleet: AircraftState[];
  maritimeRoutes: MaritimeRoute[];

  isLoading: Record<ObservatoryLayerId, boolean>;
  hasLoaded: Record<ObservatoryLayerId, boolean>;

  toggleLayer: (layerId: ObservatoryLayerId) => void;
  setLayerActive: (layerId: ObservatoryLayerId, active: boolean) => void;
  setAllLayers: (layers: ObservatoryLayerId[]) => void;
  setLayerOpacity: (layerId: ObservatoryLayerId, opacity: number) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setSelectedEntity: (entity: ObservatoryEntity | null) => void;
  loadLayerData: (layerId: ObservatoryLayerId) => Promise<void>;
  resetObservatory: () => void;
}

export const useObservatoryStore = create<ObservatoryState>((set, get) => ({
  activeLayers: [],
  layerOpacity: {
    NASA_FIRMS: 1.0,
    NASA_EONET: 1.0,
    ISS_SATELLITES: 1.0,
    FLIGHTS_OPENSKY: 1.0,
    MARITIME_ROUTES: 1.0,
  },
  isPanelOpen: false,
  selectedEntity: null,

  firmsHotspots: FALLBACK_FIRMS_HOTSPOTS,
  eonetEvents: FALLBACK_EONET_EVENTS,
  issTelemetry: calculateIssPosition(),
  aircraftFleet: FALLBACK_AIRCRAFT_FLEET,
  maritimeRoutes: FALLBACK_MARITIME_ROUTES,

  isLoading: {
    NASA_FIRMS: false,
    NASA_EONET: false,
    ISS_SATELLITES: false,
    FLIGHTS_OPENSKY: false,
    MARITIME_ROUTES: false,
  },
  hasLoaded: {
    NASA_FIRMS: false,
    NASA_EONET: false,
    ISS_SATELLITES: false,
    FLIGHTS_OPENSKY: false,
    MARITIME_ROUTES: false,
  },

  toggleLayer: (layerId) => {
    const { activeLayers, loadLayerData, hasLoaded } = get();
    const isActive = activeLayers.includes(layerId);
    if (isActive) {
      set({ activeLayers: activeLayers.filter((id) => id !== layerId) });
    } else {
      set({ activeLayers: [...activeLayers, layerId] });
      if (!hasLoaded[layerId]) {
        loadLayerData(layerId).catch(() => {});
      }
    }
  },

  setLayerActive: (layerId, active) => {
    const { activeLayers, loadLayerData, hasLoaded } = get();
    const isCurrentlyActive = activeLayers.includes(layerId);
    if (active && !isCurrentlyActive) {
      set({ activeLayers: [...activeLayers, layerId] });
      if (!hasLoaded[layerId]) {
        loadLayerData(layerId).catch(() => {});
      }
    } else if (!active && isCurrentlyActive) {
      set({ activeLayers: activeLayers.filter((id) => id !== layerId) });
    }
  },

  setAllLayers: (layers) => {
    set({ activeLayers: layers });
    const { hasLoaded, loadLayerData } = get();
    for (const layer of layers) {
      if (!hasLoaded[layer]) {
        loadLayerData(layer).catch(() => {});
      }
    }
  },

  setLayerOpacity: (layerId, opacity) => {
    set((state) => ({
      layerOpacity: {
        ...state.layerOpacity,
        [layerId]: Math.max(0, Math.min(1, opacity)),
      },
    }));
  },

  setPanelOpen: (open) => set({ isPanelOpen: open }),
  togglePanel: () => set((s) => ({ isPanelOpen: !s.isPanelOpen })),

  setSelectedEntity: (entity) => set({ selectedEntity: entity }),

  loadLayerData: async (layerId) => {
    set((s) => ({
      isLoading: { ...s.isLoading, [layerId]: true },
    }));

    try {
      if (layerId === "NASA_FIRMS") {
        const res = await fetch("/api/observatory/firms");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            set({ firmsHotspots: data });
          }
        }
      } else if (layerId === "NASA_EONET") {
        const res = await fetch("/api/observatory/eonet");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            set({ eonetEvents: data });
          }
        }
      } else if (layerId === "ISS_SATELLITES") {
        const res = await fetch("/api/observatory/iss");
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.latitude === "number") {
            set({ issTelemetry: data });
          }
        } else {
          set({ issTelemetry: calculateIssPosition() });
        }
      } else if (layerId === "FLIGHTS_OPENSKY" || layerId === "MARITIME_ROUTES") {
        const res = await fetch("/api/observatory/traffic");
        if (res.ok) {
          const data = await res.json();
          if (data?.aircraft && Array.isArray(data.aircraft)) {
            set({ aircraftFleet: data.aircraft });
          }
          if (data?.maritimeRoutes && Array.isArray(data.maritimeRoutes)) {
            set({ maritimeRoutes: data.maritimeRoutes });
          }
        }
        set((s) => ({
          hasLoaded: { ...s.hasLoaded, FLIGHTS_OPENSKY: true, MARITIME_ROUTES: true },
        }));
      }
    } catch {
      // Fallbacks já inicializados no estado inicial
    } finally {
      set((s) => ({
        isLoading: { ...s.isLoading, [layerId]: false },
        hasLoaded: { ...s.hasLoaded, [layerId]: true },
      }));
    }
  },

  resetObservatory: () =>
    set({
      activeLayers: [],
      selectedEntity: null,
      isPanelOpen: false,
    }),
}));
