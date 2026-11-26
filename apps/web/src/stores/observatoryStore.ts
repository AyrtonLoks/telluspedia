import { create } from "zustand";
import { ISS_NORAD_ID, type SatelliteTle } from "@/lib/satellite-catalog";
import type { SatRec } from "satellite.js";
import { GIBS_DEFAULT_PRODUCT } from "@/lib/gibs-view";
import {
  DEFAULT_CURRENT_UNIT,
  DEFAULT_FLOW_MODE,
  DEFAULT_WIND_ALTITUDE,
  DEFAULT_WIND_UNIT,
} from "@/lib/winds-types";
import {
  DEFAULT_DEBRIS_HORIZON_MONTHS,
  DEFAULT_DEBRIS_WINDAGE,
} from "@/lib/marine-debris-types";
import { DEFAULT_FIRE_SOURCE, DEFAULT_PRODES_BIOME } from "@/lib/inpe-types";
import { DEFAULT_BIOME_SCOPE, isBiomeIdForScope } from "@/lib/biomes-types";
import {
  DEFAULT_SEISMIC_MIN_MAGNITUDE,
  DEFAULT_SEISMIC_WINDOW,
  DEFAULT_SHOW_TECTONIC_PLATES,
} from "@/lib/seismic-types";
import {
  buildBiomesMeta,
  DEFAULT_FIRMS_WINDOW,
  DEFAULT_LAYER_OPACITY,
  emptyAisCorridorCounts,
  initialLocalMeta,
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

type LoadersModule = typeof import("./observatory-loaders");
let loadersModule: LoadersModule | null = null;
let loadersPromise: Promise<LoadersModule> | null = null;
function loadObservatoryLoaders(): Promise<LoadersModule> {
  loadersPromise ??= import("./observatory-loaders").then((m) => (loadersModule = m));
  return loadersPromise;
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
  marineDebrisWindage: DEFAULT_DEBRIS_WINDAGE,
  marineDebrisHorizonMonths: DEFAULT_DEBRIS_HORIZON_MONTHS,
  marineDebrisPickMode: false,
  marineDebrisReleasePoint: null,
  selectedGyreId: null,
  setMarineDebrisWindage: (marineDebrisWindage) => set({ marineDebrisWindage }),
  setMarineDebrisHorizonMonths: (marineDebrisHorizonMonths) => set({ marineDebrisHorizonMonths }),
  setMarineDebrisPickMode: (marineDebrisPickMode) => set({ marineDebrisPickMode }),
  setMarineDebrisReleasePoint: (marineDebrisReleasePoint) =>
    set({ marineDebrisReleasePoint, marineDebrisPickMode: false }),
  setSelectedGyreId: (selectedGyreId) => set({ selectedGyreId }),
  fireSource: DEFAULT_FIRE_SOURCE,
  inpeFires: null,
  inpeDeforestation: null,
  prodesBiome: DEFAULT_PRODES_BIOME,
  setFireSource: (fireSource) => {
    if (get().fireSource === fireSource) return;
    set({ fireSource, selectedEntity: null });
    if (get().activeLayers.includes("NASA_FIRMS")) {
      void get().loadLayerData("NASA_FIRMS");
    }
  },
  setProdesBiome: (prodesBiome) => set({ prodesBiome }),
  biomeScope: DEFAULT_BIOME_SCOPE,
  biomeFilterId: null,
  selectedBiomeId: null,
  hoveredBiomeId: null,
  biomePickMode: false,
  setBiomeScope: (biomeScope) =>
    set((s) => ({
      biomeScope,
      biomeFilterId: isBiomeIdForScope(biomeScope, s.biomeFilterId) ? s.biomeFilterId : null,
      selectedBiomeId: isBiomeIdForScope(biomeScope, s.selectedBiomeId) ? s.selectedBiomeId : null,
      hoveredBiomeId: null,
      layerMeta: s.hasLoaded.BIOMES_MAP
        ? { ...s.layerMeta, BIOMES_MAP: buildBiomesMeta(biomeScope) }
        : s.layerMeta,
    })),
  setBiomeFilterId: (biomeFilterId) => set({ biomeFilterId }),
  setSelectedBiomeId: (selectedBiomeId) => set({ selectedBiomeId }),
  setHoveredBiomeId: (hoveredBiomeId) => set({ hoveredBiomeId }),
  setBiomePickMode: (biomePickMode) => set({ biomePickMode }),
  earthquakes: null,
  seismicWindow: DEFAULT_SEISMIC_WINDOW,
  seismicMinMagnitude: DEFAULT_SEISMIC_MIN_MAGNITUDE,
  showTectonicPlates: DEFAULT_SHOW_TECTONIC_PLATES,
  setSeismicFilter: (filter) => {
    const cur = get();
    const nextWindow = filter.window ?? cur.seismicWindow;
    const nextMinMag = filter.minMagnitude ?? cur.seismicMinMagnitude;
    if (nextWindow === cur.seismicWindow && nextMinMag === cur.seismicMinMagnitude) return;
    set((s) => ({
      seismicWindow: nextWindow,
      seismicMinMagnitude: nextMinMag,
      selectedEntity: s.selectedEntity?.type === "EARTHQUAKE" ? null : s.selectedEntity,
    }));
    if (get().activeLayers.includes("USGS_EARTHQUAKES")) {
      void get().loadLayerData("USGS_EARTHQUAKES");
    } else {
      set((s) => ({ hasLoaded: { ...s.hasLoaded, USGS_EARTHQUAKES: false } }));
    }
  },
  setShowTectonicPlates: (showTectonicPlates) => set({ showTectonicPlates }),
  loadCurrentsData: async () => {
    const { loadCurrentsLayer } = await loadObservatoryLoaders();
    return loadCurrentsLayer(set, get);
  },
  issTelemetry: null,
  satellites: [],
  satelliteCategories: ["station", "visual"],
  showIssGroundTrack: false,
  aircraftFleet: [],
  maritimeRoutes: [],
  ais: { vessels: [], corridorCounts: emptyAisCorridorCounts() },
  vesselsMovingOnly: false,
  setVesselsMovingOnly: (enabled) => set((state) => ({
    vesselsMovingOnly: enabled,
    selectedEntity: state.selectedEntity?.type === "VESSEL" || state.selectedEntity?.type === "VESSEL_GROUP"
      ? null : state.selectedEntity,
  })),

  isLoading: perLayer(() => false),
  hasLoaded: perLayer(() => false),
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
        selectedEntity:
          (layerId === "NASA_EONET" && isEonetSelection(state.selectedEntity)) ||
          (layerId === "USGS_EARTHQUAKES" && state.selectedEntity?.type === "EARTHQUAKE")
            ? null
            : state.selectedEntity,
        marineDebrisPickMode: layerId === "MARINE_DEBRIS" ? false : state.marineDebrisPickMode,
        biomePickMode: layerId === "BIOMES_MAP" ? false : state.biomePickMode,
        hoveredBiomeId: layerId === "BIOMES_MAP" ? null : state.hoveredBiomeId,
        selectedBiomeId: layerId === "BIOMES_MAP" ? null : state.selectedBiomeId,
      }));
    }
  },

  setAllLayers: (layers) => {
    set((state) => ({
      activeLayers: layers,
      selectedEntity:
        (!layers.includes("NASA_EONET") && isEonetSelection(state.selectedEntity)) ||
        (!layers.includes("USGS_EARTHQUAKES") && state.selectedEntity?.type === "EARTHQUAKE")
          ? null
          : state.selectedEntity,
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
    const mod = loadersModule ?? (await loadObservatoryLoaders());
    return mod.loadObservatoryLayer(layerId, set, get, {
      loadSatelliteLib,
      loadObservatoryFallback,
    });
  },

  resetObservatory: () =>
    set({
      activeLayers: [],
      selectedEntity: null,
      isPanelOpen: false,
      eonetCategory: "all",
      vesselsMovingOnly: false,
      marineDebrisPickMode: false,
      marineDebrisReleasePoint: null,
      selectedGyreId: null,
      biomeFilterId: null,
      selectedBiomeId: null,
      hoveredBiomeId: null,
      biomePickMode: false,
      seismicWindow: DEFAULT_SEISMIC_WINDOW,
      seismicMinMagnitude: DEFAULT_SEISMIC_MIN_MAGNITUDE,
      showTectonicPlates: DEFAULT_SHOW_TECTONIC_PLATES,
    }),
}));
