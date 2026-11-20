import { create } from "zustand";
import { simulatedAisSnapshot, type AisSnapshot } from "@/lib/ais-data";
import {
  ObservatoryLayerId,
  FirmsHotspot,
  EonetEvent,
  EonetCategoryFilter,
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
  FIRMS_SCHEMA,
  decodeFirmsColumns,
  filterByConfidence,
  type FirmsCountryStats,
  type FirmsConfidenceFilter,
  type FirmsWindowDays,
} from "@/lib/firms-aggregate";
import {
  ISS_NORAD_ID,
  buildIssTelemetry,
  toSatrec,
  type SatelliteCategory,
  type SatelliteTle,
} from "@/lib/satellites";
import type { SatRec } from "satellite.js";

export interface FirmsWindow {
  days: FirmsWindowDays;
  confidence: FirmsConfidenceFilter;
}

/** satrec por TLE (montar o satrec é a parte cara; a propagação é barata). */
const satrecCache = new Map<string, SatRec | null>();
function cachedSatrec(tle: SatelliteTle): SatRec | null {
  const key = tle.line1 + tle.line2;
  if (!satrecCache.has(key)) satrecCache.set(key, toSatrec(tle));
  return satrecCache.get(key) ?? null;
}

function isEonetSelection(entity: ObservatoryEntity | null) {
  return entity?.type === "EONET" || entity?.type === "EONET_CLUSTER";
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
  /** Focos na janela após o filtro de confiança (pode ser maior que firmsHotspots.length). */
  firmsTotal: number;
  /** Janela temporal e filtro de confiança da camada de queimadas. */
  firmsWindow: FirmsWindow;
  /**
   * Focos por país (ISO alfa-3) na janela. null = contagem indisponível (sem resposta do servidor
   * ou resposta sem o campo) — a UI não pode afirmar "nenhum foco" nesse caso.
   */
  firmsByCountry: Record<string, FirmsCountryStats> | null;
  eonetEvents: EonetEvent[];
  eonetCategory: EonetCategoryFilter;
  issTelemetry: IssTelemetryData | null;
  /** TLEs (CelesTrak) propagados com SGP4 no cliente (D04). */
  satellites: SatelliteTle[];
  /** Categorias de satélites visíveis no globo (a ISS aparece sempre que a camada está ligada). */
  satelliteCategories: SatelliteCategory[];
  /** Rastro da ISS projetado na superfície (desligado por padrão — se lia como segunda trajetória). */
  showIssGroundTrack: boolean;
  aircraftFleet: AircraftState[];
  maritimeRoutes: MaritimeRoute[];
  ais: AisSnapshot;
  vesselsMovingOnly: boolean;
  setVesselsMovingOnly: (enabled: boolean) => void;

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
  setEonetCategory: (category: EonetCategoryFilter) => void;
  setSelectedEntity: (entity: ObservatoryEntity | null) => void;
  /** Muda janela/confiança das queimadas e recarrega a camada. */
  setFirmsWindow: (window: Partial<FirmsWindow>) => void;
  loadLayerData: (layerId: ObservatoryLayerId) => Promise<void>;
  /** Recalcula a telemetria da ISS por SGP4 no instante dado (HUD, painel e modelo usam este valor). */
  refreshIssTelemetry: (now?: number) => void;
  toggleSatelliteCategory: (category: SatelliteCategory) => void;
  toggleIssGroundTrack: () => void;
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
  firmsTotal: fallbackFirms(DEFAULT_FIRMS_WINDOW).length,
  firmsWindow: DEFAULT_FIRMS_WINDOW,
  firmsByCountry: null,
  eonetEvents: FALLBACK_EONET_EVENTS,
  eonetCategory: "all",
  issTelemetry: calculateIssPosition(),
  satellites: [],
  satelliteCategories: ["station", "visual"],
  showIssGroundTrack: false,
  aircraftFleet: FALLBACK_AIRCRAFT_FLEET,
  maritimeRoutes: FALLBACK_MARITIME_ROUTES,
  ais: simulatedAisSnapshot(),
  vesselsMovingOnly: false,
  setVesselsMovingOnly: (enabled) => set((state) => ({
    vesselsMovingOnly: enabled,
    selectedEntity: state.selectedEntity?.type === "VESSEL" || state.selectedEntity?.type === "VESSEL_GROUP"
      ? null : state.selectedEntity,
  })),

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

  toggleLayer: (layerId) => get().setLayerActive(layerId, !get().activeLayers.includes(layerId)),

  setLayerActive: (layerId, active) => {
    const { activeLayers, loadLayerData, hasLoaded } = get();
    const isCurrentlyActive = activeLayers.includes(layerId);
    if (active && !isCurrentlyActive) {
      set({ activeLayers: [...activeLayers, layerId] });
      if (!hasLoaded[layerId]) {
        loadLayerData(layerId).catch(() => {});
      }
    } else if (!active && isCurrentlyActive) {
      set((state) => ({
        activeLayers: activeLayers.filter((id) => id !== layerId),
        selectedEntity: layerId === "NASA_EONET" && isEonetSelection(state.selectedEntity) ? null : state.selectedEntity,
      }));
    }
  },

  setAllLayers: (layers) => {
    set((state) => ({
      activeLayers: layers,
      selectedEntity: !layers.includes("NASA_EONET") && isEonetSelection(state.selectedEntity)
        ? null : state.selectedEntity,
    }));
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

  setEonetCategory: (category) => set((state) => {
    const selected = state.selectedEntity;
    const dismissSelection = selected?.type === "EONET_CLUSTER" ||
      (selected?.type === "EONET" && category !== "all" && selected.data.category !== category);
    return { eonetCategory: category, selectedEntity: dismissSelection ? null : selected };
  }),

  refreshIssTelemetry: (now = Date.now()) => {
    const iss = get().satellites.find((t) => t.noradId === ISS_NORAD_ID);
    const rec = iss ? cachedSatrec(iss) : null;
    const telemetry = rec ? buildIssTelemetry(rec, now, iss!.epoch) : null;
    set({ issTelemetry: telemetry ?? calculateIssPosition(now) });
  },

  toggleIssGroundTrack: () => set((s) => ({ showIssGroundTrack: !s.showIssGroundTrack })),

  toggleSatelliteCategory: (category) =>
    set((s) => ({
      satelliteCategories: s.satelliteCategories.includes(category)
        ? s.satelliteCategories.filter((c) => c !== category)
        : [...s.satelliteCategories, category],
    })),

  setFirmsWindow: (window) => {
    const next = { ...get().firmsWindow, ...window };
    const cur = get().firmsWindow;
    if (next.days === cur.days && next.confidence === cur.confidence) return;
    set({ firmsWindow: next, selectedEntity: null });
    void get().loadLayerData("NASA_FIRMS");
  },


  loadLayerData: async (layerId) => {
    if (layerId === "MARITIME_ROUTES" && get().isLoading[layerId]) return;
    set((s) => ({
      isLoading: { ...s.isLoading, [layerId]: true },
    }));

    const applyMeta = (id: ObservatoryLayerId, meta: ObservatoryMeta) =>
      set((s) => ({
        layerMeta: { ...s.layerMeta, [id]: meta },
        layerError: { ...s.layerError, [id]: false },
      }));

    try {
      if (layerId === "NASA_FIRMS") {
        const { days, confidence } = get().firmsWindow;
        const body = await fetchEnvelope(
          `/api/observatory/firms?days=${days}&confidence=${confidence}&schema=${FIRMS_SCHEMA}`
        );
        const hotspots = isObservatoryEnvelope(body) ? decodeFirmsColumns(body.data) : null;
        if (isObservatoryEnvelope(body) && hotspots) {
          const extra = body as unknown as { total?: unknown; byCountry?: unknown };
          set({
            firmsHotspots: hotspots,
            firmsTotal: typeof extra.total === "number" ? extra.total : hotspots.length,
            firmsByCountry:
              extra.byCountry && typeof extra.byCountry === "object"
                ? (extra.byCountry as Record<string, FirmsCountryStats>)
                : null,
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
        const body = await fetchEnvelope("/api/observatory/satellites");
        if (isObservatoryEnvelope(body) && Array.isArray(body.data)) {
          set({ satellites: body.data as SatelliteTle[] });
          get().refreshIssTelemetry();
          applyMeta("ISS_SATELLITES", body.meta);
        }
      } else if (layerId === "MARITIME_ROUTES") {
        const body = await fetchEnvelope("/api/observatory/ais");
        if (!isObservatoryEnvelope(body)) throw new Error("Resposta AIS inválida");
        const data = body.data as AisSnapshot;
        if (!Array.isArray(data?.vessels) || !data.corridorCounts) throw new Error("Amostra AIS inválida");
        set((s) => ({
          ais: data,
          layerMeta: { ...s.layerMeta, [layerId]: body.meta },
          layerError: { ...s.layerError, [layerId]: false },
        }));
      } else {
        const body = await fetchEnvelope("/api/observatory/traffic");
        if (isObservatoryEnvelope(body?.aircraft) && Array.isArray(body.aircraft.data)) {
          set({ aircraftFleet: body.aircraft.data as AircraftState[] });
          applyMeta("FLIGHTS_OPENSKY", body.aircraft.meta);
        }
      }
    } catch {
      set((s) => ({
        ais: layerId === "MARITIME_ROUTES" ? simulatedAisSnapshot() : s.ais,
        layerError: { ...s.layerError, [layerId]: true },
        layerMeta: {
          ...s.layerMeta,
          [layerId]: {
            ...initialLocalMeta(),
            fetchedAt: new Date().toISOString(),
            reason: "Servidor do TellusPedia indisponível; exibindo dados locais de referência",
          },
        },
      }));
      if (layerId === "ISS_SATELLITES") set({ issTelemetry: calculateIssPosition() });
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
      eonetCategory: "all",
      vesselsMovingOnly: false,
    }),
}));
