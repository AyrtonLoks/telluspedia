import { create } from "zustand";
import { emptyAisCounts, type AisSnapshot } from "@/lib/ais-data";
import type { AircraftState, EonetEvent, ObservatoryLayer } from "@/lib/observatory-data";
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
} from "@/lib/firms-aggregate";
import { ISS_NORAD_ID, type SatelliteTle } from "@/lib/satellite-catalog";
import type { SatRec } from "satellite.js";
import { GIBS_DEFAULT_PRODUCT } from "@/lib/gibs-view";
import type { GibsLayerData } from "@/lib/gibs";
import {
  DEFAULT_CURRENT_UNIT,
  DEFAULT_FLOW_MODE,
  DEFAULT_WIND_ALTITUDE,
  DEFAULT_WIND_UNIT,
} from "@/lib/winds-types";
import {
  DEFAULT_FIRMS_WINDOW,
  DEFAULT_LAYER_OPACITY,
  fetchObservatoryEnvelope as fetchEnvelope,
  gibsLocalReference,
  isEonetSelection,
  perLayer,
  type FirmsWindow,
  type ObservatoryState,
} from "./observatory-store-helpers";

export type { FirmsWindow };

/** satrec por TLE (montar o satrec é a parte cara; a propagação é barata). */
const satrecCache = new Map<string, SatRec | null>();
function cachedSatrec(lib: SatelliteLib, tle: SatelliteTle): SatRec | null {
  const key = tle.line1 + tle.line2;
  if (!satrecCache.has(key)) satrecCache.set(key, lib.toSatrec(tle));
  return satrecCache.get(key) ?? null;
}

/**
 * O SGP4 (`satellite.js`, ~10 kB gzip) só baixa quando a camada da ISS é ligada (T35). Até lá a
 * telemetria fica `null`; o primeiro `refreshIssTelemetry` carrega a biblioteca e recalcula.
 */
type SatelliteLib = typeof import("@/lib/satellites");
let satelliteLib: SatelliteLib | null = null;
let satelliteLibPromise: Promise<SatelliteLib> | null = null;
export function loadSatelliteLib(): Promise<SatelliteLib> {
  satelliteLibPromise ??= import("@/lib/satellites").then((m) => (satelliteLib = m));
  return satelliteLibPromise;
}

/**
 * Dados locais de referência (servidor fora do ar) e a malha de rotas marítimas: sob demanda (T35),
 * fora do carregamento inicial. O estado começa vazio e cada camada preenche o seu ao carregar.
 */
type FallbackData = typeof import("@/lib/observatory-fallback");
let fallbackPromise: Promise<FallbackData> | null = null;
export function loadObservatoryFallback(): Promise<FallbackData> {
  fallbackPromise ??= import("@/lib/observatory-fallback");
  return fallbackPromise;
}

export const useObservatoryStore = create<ObservatoryState>((set, get) => ({
  activeLayers: [],
  layerOpacity: { ...DEFAULT_LAYER_OPACITY },
  isPanelOpen: false,
  selectedEntity: null,

  firmsHotspots: [],
  firmsTotal: 0,
  firmsWindow: DEFAULT_FIRMS_WINDOW,
  firmsByCountry: null,
  eonetEvents: [],
  eonetCategory: "all",
  gibsProduct: GIBS_DEFAULT_PRODUCT,
  gibsMonth: null,
  gibs: null,
  setGibsRequest: ({ product, month }) => {
    const cur = get();
    const nextProduct = product ?? cur.gibsProduct;
    const nextMonth = month === undefined ? cur.gibsMonth : month;
    if (nextProduct === cur.gibsProduct && nextMonth === cur.gibsMonth) return;
    set({ gibsProduct: nextProduct, gibsMonth: nextMonth });
    if (cur.activeLayers.includes("NASA_GIBS")) void get().loadLayerData("NASA_GIBS");
    else set((s) => ({ hasLoaded: { ...s.hasLoaded, NASA_GIBS: false } }));
  },
  flowMode: DEFAULT_FLOW_MODE,
  winds: null,
  windAltitude: DEFAULT_WIND_ALTITUDE,
  windUnit: DEFAULT_WIND_UNIT,
  currents: null,
  currentUnit: DEFAULT_CURRENT_UNIT,
  currentsMeta: initialLocalMeta(),
  currentsLoading: false,
  currentsHasLoaded: false,
  currentsError: false,
  setFlowMode: (flowMode) => {
    set({ flowMode });
    if (
      (flowMode === "currents" || flowMode === "both") &&
      !get().currentsHasLoaded &&
      !get().currentsLoading
    ) {
      void get().loadCurrentsData();
    }
  },
  setWindAltitude: (windAltitude) => set({ windAltitude }),
  setWindUnit: (windUnit) => set({ windUnit }),
  setCurrentUnit: (currentUnit) => set({ currentUnit }),
  loadCurrentsData: async () => {
    if (get().currentsLoading) return;
    set({ currentsLoading: true });
    try {
      const [{ isValidOceanCurrentGrid }, body] = await Promise.all([
        import("@/lib/currents-data"),
        fetchEnvelope("/api/observatory/currents"),
      ]);
      if (isObservatoryEnvelope(body) && isValidOceanCurrentGrid(body.data)) {
        set({
          currents: body.data,
          currentsMeta: body.meta,
          currentsError: false,
        });
      } else {
        throw new Error("Resposta de correntes oceânicas inválida");
      }
    } catch {
      const { buildClimatologyCurrentsGrid } = await import("@/lib/currents-data");
      set({
        currents: buildClimatologyCurrentsGrid(),
        currentsError: true,
        currentsMeta: {
          ...initialLocalMeta(),
          fetchedAt: new Date().toISOString(),
          reason: "Servidor do TellusPedia indisponível; exibindo giros oceânicos de referência",
        },
      });
    } finally {
      set({ currentsLoading: false, currentsHasLoaded: true });
    }
  },
  issTelemetry: null,
  satellites: [],
  satelliteCategories: ["station", "visual"],
  showIssGroundTrack: false,
  aircraftFleet: [],
  maritimeRoutes: [],
  ais: { vessels: [], corridorCounts: emptyAisCounts() },
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
    NASA_GIBS: false,
    GLOBAL_WINDS: false,
  },
  hasLoaded: {
    NASA_FIRMS: false,
    NASA_EONET: false,
    ISS_SATELLITES: false,
    FLIGHTS_OPENSKY: false,
    MARITIME_ROUTES: false,
    NASA_GIBS: false,
    GLOBAL_WINDS: false,
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
    const lib = satelliteLib;
    if (!lib) {
      void loadSatelliteLib().then(() => get().refreshIssTelemetry(now)).catch(() => {});
      return;
    }
    const iss = get().satellites.find((t) => t.noradId === ISS_NORAD_ID);
    const rec = iss ? cachedSatrec(lib, iss) : null;
    const telemetry = rec ? lib.buildIssTelemetry(rec, now, iss!.epoch) : null;
    set({ issTelemetry: telemetry ?? lib.calculateIssPosition(now) });
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

    const applyMeta = (id: ObservatoryLayer, meta: ObservatoryMeta) =>
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
        } else throw new Error("Resposta FIRMS inválida"); // cai nos dados locais (o estado começa vazio)
      } else if (layerId === "NASA_EONET") {
        const body = await fetchEnvelope("/api/observatory/eonet");
        if (isObservatoryEnvelope(body) && Array.isArray(body.data)) {
          set({ eonetEvents: body.data as EonetEvent[] });
          applyMeta("NASA_EONET", body.meta);
        } else throw new Error("Resposta EONET inválida");
      } else if (layerId === "ISS_SATELLITES") {
        // Baixa o SGP4 junto com os TLEs; a telemetria sai já calculada quando os dois chegam.
        const [body] = await Promise.all([fetchEnvelope("/api/observatory/satellites"), loadSatelliteLib()]);
        if (isObservatoryEnvelope(body) && Array.isArray(body.data)) {
          set({ satellites: body.data as SatelliteTle[] });
          get().refreshIssTelemetry();
          applyMeta("ISS_SATELLITES", body.meta);
        } else throw new Error("Resposta de satélites inválida");
      } else if (layerId === "NASA_GIBS") {
        const { gibsProduct, gibsMonth } = get();
        const query = `product=${gibsProduct}${gibsMonth ? `&month=${gibsMonth}` : ""}`;
        const body = await fetchEnvelope(`/api/observatory/gibs?${query}`);
        const data = isObservatoryEnvelope(body) ? (body.data as GibsLayerData) : null;
        if (!data || typeof data.imageUrl !== "string") throw new Error("Resposta GIBS inválida");
        // Resposta atrasada de um pedido anterior (o usuário já trocou produto ou mês): descarta.
        const now = get();
        if (data.product !== now.gibsProduct || (now.gibsMonth !== null && data.month !== now.gibsMonth)) return;
        set({ gibs: data });
        applyMeta("NASA_GIBS", body.meta);
      } else if (layerId === "GLOBAL_WINDS") {
        const [{ isValidWindFieldPayload }, body] = await Promise.all([
          import("@/lib/winds-data"),
          fetchEnvelope("/api/observatory/winds"),
        ]);
        if (isObservatoryEnvelope(body) && isValidWindFieldPayload(body.data)) {
          set({ winds: body.data });
          applyMeta("GLOBAL_WINDS", body.meta);
        } else throw new Error("Resposta de ventos inválida");
      } else if (layerId === "MARITIME_ROUTES") {
        // A malha de corredores é fixa (referência local), com ou sem a amostra AIS ao vivo.
        void loadObservatoryFallback().then((fb) => set({ maritimeRoutes: fb.FALLBACK_MARITIME_ROUTES })).catch(() => {});
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
        } else throw new Error("Resposta de tráfego inválida");
      }
    } catch {
      const fb = await loadObservatoryFallback().catch(() => null);
      if (fb) {
        if (layerId === "NASA_FIRMS") {
          const hotspots = filterByConfidence(fb.FALLBACK_FIRMS_HOTSPOTS, get().firmsWindow.confidence);
          set({ firmsHotspots: hotspots, firmsTotal: hotspots.length, firmsByCountry: null });
        } else if (layerId === "NASA_EONET") set({ eonetEvents: fb.FALLBACK_EONET_EVENTS });
        else if (layerId === "FLIGHTS_OPENSKY") set({ aircraftFleet: fb.FALLBACK_AIRCRAFT_FLEET });
        else if (layerId === "MARITIME_ROUTES") set({ maritimeRoutes: fb.FALLBACK_MARITIME_ROUTES });
      }
      set((s) => ({
        ais: layerId === "MARITIME_ROUTES" && fb ? fb.simulatedAisSnapshot() : s.ais,
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
      if (layerId === "ISS_SATELLITES") {
        // Sem servidor, a posição de referência sai do SGP4: espera a biblioteca para não deixar
        // a telemetria nula (o import pode terminar depois do fetch que falhou).
        await loadSatelliteLib().catch(() => {});
        get().refreshIssTelemetry();
      }
      if (layerId === "NASA_GIBS") set({ gibs: await gibsLocalReference(get().gibsProduct, get().gibsMonth) });
      if (layerId === "GLOBAL_WINDS") {
        const { buildClimatologyWindField } = await import("@/lib/winds-data");
        set({ winds: buildClimatologyWindField() });
      }
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
