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
import {
  type ObservatoryMeta,
  initialLocalMeta,
  isObservatoryEnvelope,
} from "@/lib/observatory-source";
import {
  aggregateFirmsGrid,
  filterByConfidence,
  type FirmsCell,
  type FirmsConfidenceFilter,
  type FirmsWindowDays,
} from "@/lib/firms-aggregate";

export interface FirmsWindow {
  days: FirmsWindowDays;
  confidence: FirmsConfidenceFilter;
}

const DEFAULT_FIRMS_WINDOW: FirmsWindow = { days: 1, confidence: "nominal" };
const fallbackFirms = (w: FirmsWindow) => filterByConfidence(FALLBACK_FIRMS_HOTSPOTS, w.confidence);

const ALL_LAYERS: ObservatoryLayerId[] = [
  "NASA_FIRMS",
  "NASA_EONET",
  "ISS_SATELLITES",
  "FLIGHTS_OPENSKY",
  "MARITIME_ROUTES",
];

function perLayer<T>(make: () => T): Record<ObservatoryLayerId, T> {
  return Object.fromEntries(ALL_LAYERS.map((id) => [id, make()])) as Record<ObservatoryLayerId, T>;
}

async function fetchEnvelope(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface ObservatoryState {
  activeLayers: ObservatoryLayerId[];
  layerOpacity: Record<ObservatoryLayerId, number>;
  isPanelOpen: boolean;
  selectedEntity: ObservatoryEntity | null;

  firmsHotspots: FirmsHotspot[];
  /** Grade agregada (heatmap em zoom distante) de toda a janela. */
  firmsCells: FirmsCell[];
  /** Focos na janela após o filtro de confiança (pode ser maior que firmsHotspots.length). */
  firmsTotal: number;
  /** Janela temporal e filtro de confiança da camada de queimadas. */
  firmsWindow: FirmsWindow;
  eonetEvents: EonetEvent[];
  issTelemetry: IssTelemetryData | null;
  aircraftFleet: AircraftState[];
  maritimeRoutes: MaritimeRoute[];

  isLoading: Record<ObservatoryLayerId, boolean>;
  hasLoaded: Record<ObservatoryLayerId, boolean>;
  /** Procedência do dado exibido em cada camada (T05). */
  layerMeta: Record<ObservatoryLayerId, ObservatoryMeta>;
  /** true quando o próprio servidor do TellusPedia não respondeu (dados locais em uso). */
  layerError: Record<ObservatoryLayerId, boolean>;

  toggleLayer: (layerId: ObservatoryLayerId) => void;
  setLayerActive: (layerId: ObservatoryLayerId, active: boolean) => void;
  setAllLayers: (layers: ObservatoryLayerId[]) => void;
  setLayerOpacity: (layerId: ObservatoryLayerId, opacity: number) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setSelectedEntity: (entity: ObservatoryEntity | null) => void;
  /** Muda janela/confiança das queimadas e recarrega a camada. */
  setFirmsWindow: (window: Partial<FirmsWindow>) => void;
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

  firmsHotspots: fallbackFirms(DEFAULT_FIRMS_WINDOW),
  firmsCells: aggregateFirmsGrid(fallbackFirms(DEFAULT_FIRMS_WINDOW)),
  firmsTotal: fallbackFirms(DEFAULT_FIRMS_WINDOW).length,
  firmsWindow: DEFAULT_FIRMS_WINDOW,
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
  layerMeta: perLayer(initialLocalMeta),
  layerError: perLayer(() => false),

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

  setFirmsWindow: (window) => {
    const next = { ...get().firmsWindow, ...window };
    const cur = get().firmsWindow;
    if (next.days === cur.days && next.confidence === cur.confidence) return;
    set({ firmsWindow: next, selectedEntity: null });
    void get().loadLayerData("NASA_FIRMS");
  },

  loadLayerData: async (layerId) => {
    set((s) => ({
      isLoading: { ...s.isLoading, [layerId]: true },
    }));

    // Camadas atualizadas por esta carga (tráfego traz aviões e rotas marítimas juntos).
    const affected: ObservatoryLayerId[] =
      layerId === "FLIGHTS_OPENSKY" || layerId === "MARITIME_ROUTES"
        ? ["FLIGHTS_OPENSKY", "MARITIME_ROUTES"]
        : [layerId];

    const applyMeta = (id: ObservatoryLayerId, meta: ObservatoryMeta) =>
      set((s) => ({
        layerMeta: { ...s.layerMeta, [id]: meta },
        layerError: { ...s.layerError, [id]: false },
      }));

    try {
      if (layerId === "NASA_FIRMS") {
        const { days, confidence } = get().firmsWindow;
        const body = await fetchEnvelope(`/api/observatory/firms?days=${days}&confidence=${confidence}`);
        if (isObservatoryEnvelope(body) && Array.isArray(body.data)) {
          const hotspots = body.data as FirmsHotspot[];
          const extra = body as unknown as { cells?: unknown; total?: unknown };
          const cells = Array.isArray(extra.cells) ? (extra.cells as FirmsCell[]) : aggregateFirmsGrid(hotspots);
          set({
            firmsHotspots: hotspots,
            firmsCells: cells,
            firmsTotal: typeof extra.total === "number" ? extra.total : hotspots.length,
          });
          applyMeta("NASA_FIRMS", body.meta);
        }
      } else if (layerId === "NASA_EONET") {
        const body = await fetchEnvelope("/api/observatory/eonet");
        if (isObservatoryEnvelope(body) && Array.isArray(body.data)) {
          set({ eonetEvents: body.data as EonetEvent[] });
          applyMeta("NASA_EONET", body.meta);
        }
      } else if (layerId === "ISS_SATELLITES") {
        const body = await fetchEnvelope("/api/observatory/iss");
        const data = isObservatoryEnvelope(body) ? (body.data as IssTelemetryData) : null;
        if (data && typeof data.latitude === "number") {
          set({ issTelemetry: data });
          applyMeta("ISS_SATELLITES", (body as { meta: ObservatoryMeta }).meta);
        }
      } else {
        const body = await fetchEnvelope("/api/observatory/traffic");
        if (isObservatoryEnvelope(body?.aircraft) && Array.isArray(body.aircraft.data)) {
          set({ aircraftFleet: body.aircraft.data as AircraftState[] });
          applyMeta("FLIGHTS_OPENSKY", body.aircraft.meta);
        }
        if (isObservatoryEnvelope(body?.maritimeRoutes) && Array.isArray(body.maritimeRoutes.data)) {
          set({ maritimeRoutes: body.maritimeRoutes.data as MaritimeRoute[] });
          applyMeta("MARITIME_ROUTES", body.maritimeRoutes.meta);
        }
      }
    } catch {
      // Servidor do TellusPedia inacessível: mantém os dados locais e sinaliza "Offline".
      set((s) => {
        const layerError = { ...s.layerError };
        const layerMeta = { ...s.layerMeta };
        for (const id of affected) {
          layerError[id] = true;
          layerMeta[id] = {
            ...initialLocalMeta(),
            fetchedAt: new Date().toISOString(),
            reason: "Servidor do TellusPedia indisponível; exibindo dados locais de referência",
          };
        }
        return { layerError, layerMeta };
      });
      if (layerId === "ISS_SATELLITES") set({ issTelemetry: calculateIssPosition() });
    } finally {
      set((s) => {
        const isLoading = { ...s.isLoading };
        const hasLoaded = { ...s.hasLoaded };
        for (const id of affected) {
          isLoading[id] = false;
          hasLoaded[id] = true;
        }
        isLoading[layerId] = false;
        return { isLoading, hasLoaded };
      });
    }
  },

  resetObservatory: () =>
    set({
      activeLayers: [],
      selectedEntity: null,
      isPanelOpen: false,
    }),
}));
