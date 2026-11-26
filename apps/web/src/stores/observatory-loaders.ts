import type { StoreApi } from "zustand";
import type { AisSnapshot } from "@/lib/ais-data";
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
import type { SatelliteTle } from "@/lib/satellite-catalog";
import type { GibsLayerData } from "@/lib/gibs";
import type { InpeBdQueimadasPayload, TerraBrasilisPayload } from "@/lib/inpe-types";
import {
  buildBiomesMeta,
  buildSpeciesMeta,
  fetchObservatoryEnvelope as fetchEnvelope,
  gibsLocalReference,
  type ObservatoryState,
} from "./observatory-store-helpers";

type SetState = StoreApi<ObservatoryState>["setState"];
type GetState = StoreApi<ObservatoryState>["getState"];

interface LoaderDeps {
  loadSatelliteLib: () => Promise<unknown>;
  loadObservatoryFallback: () => Promise<typeof import("@/lib/observatory-fallback")>;
}

export async function loadCurrentsLayer(set: SetState, get: GetState): Promise<void> {
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
}

export async function loadObservatoryLayer(
  layerId: ObservatoryLayer,
  set: SetState,
  get: GetState,
  deps: LoaderDeps
): Promise<void> {
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
      if (get().fireSource === "inpe") {
        const body = await fetchEnvelope("/api/observatory/inpe-fires");
        const data = isObservatoryEnvelope(body) ? (body.data as InpeBdQueimadasPayload) : null;
        if (data && Array.isArray(data.hotspots) && Array.isArray(data.byBiome)) {
          set({
            inpeFires: data,
            firmsHotspots: data.hotspots,
            firmsTotal: data.total,
            firmsByCountry: null,
          });
          applyMeta("NASA_FIRMS", body.meta);
        } else throw new Error("Resposta INPE BDQueimadas inválida");
      } else {
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
        } else throw new Error("Resposta FIRMS inválida");
      }
    } else if (layerId === "INPE_DEFORESTATION") {
      const body = await fetchEnvelope("/api/observatory/inpe-deforestation");
      const data = isObservatoryEnvelope(body) ? (body.data as TerraBrasilisPayload) : null;
      if (data && data.prodes && Array.isArray(data.deterAlerts)) {
        set({ inpeDeforestation: data });
        applyMeta("INPE_DEFORESTATION", body.meta);
      } else throw new Error("Resposta INPE TerraBrasilis inválida");
    } else if (layerId === "BIOMES_MAP") {
      applyMeta("BIOMES_MAP", buildBiomesMeta(get().biomeScope));
    } else if (layerId === "SPECIES_MAP") {
      applyMeta("SPECIES_MAP", buildSpeciesMeta());
    } else if (layerId === "USGS_EARTHQUAKES") {
      const { seismicWindow, seismicMinMagnitude } = get();
      const [{ isValidSeismicPayload }, body] = await Promise.all([
        import("@/lib/seismic-data"),
        fetchEnvelope(
          `/api/observatory/earthquakes?window=${seismicWindow}&minMag=${seismicMinMagnitude}`
        ),
      ]);
      if (isObservatoryEnvelope(body) && isValidSeismicPayload(body.data)) {
        const cur = get();
        if (
          body.data.window !== cur.seismicWindow ||
          body.data.minMagnitude !== cur.seismicMinMagnitude
        ) {
          return;
        }
        set({ earthquakes: body.data });
        applyMeta("USGS_EARTHQUAKES", body.meta);
      } else throw new Error("Resposta USGS Earthquakes inválida");
    } else if (layerId === "NASA_EONET") {
      const body = await fetchEnvelope("/api/observatory/eonet");
      if (isObservatoryEnvelope(body) && Array.isArray(body.data)) {
        set({ eonetEvents: body.data as EonetEvent[] });
        applyMeta("NASA_EONET", body.meta);
      } else throw new Error("Resposta EONET inválida");
    } else if (layerId === "ISS_SATELLITES") {
      const [body] = await Promise.all([
        fetchEnvelope("/api/observatory/satellites"),
        deps.loadSatelliteLib(),
      ]);
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
    } else if (layerId === "MARINE_DEBRIS") {
      const state = get();
      const tasks: Promise<unknown>[] = [];
      if (!state.hasLoaded.GLOBAL_WINDS && !state.isLoading.GLOBAL_WINDS) {
        tasks.push(state.loadLayerData("GLOBAL_WINDS"));
      }
      if (!state.currentsHasLoaded && !state.currentsLoading) {
        tasks.push(state.loadCurrentsData());
      }
      await Promise.all(tasks);
      const latest = get();
      const liveDriven =
        latest.currentsMeta.source === "live" || latest.layerMeta.GLOBAL_WINDS.source === "live";
      applyMeta("MARINE_DEBRIS", {
        source: liveDriven ? "computed" : "fallback",
        provider: "NOAA · Eriksen–Lebreton (D27)",
        fetchedAt: new Date().toISOString(),
        stale: false,
      });
    } else if (layerId === "MARITIME_ROUTES") {
      void deps
        .loadObservatoryFallback()
        .then((fb) => set({ maritimeRoutes: fb.FALLBACK_MARITIME_ROUTES }))
        .catch(() => {});
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
    const fb = await deps.loadObservatoryFallback().catch(() => null);
    if (fb) {
      if (layerId === "NASA_FIRMS") {
        if (get().fireSource === "inpe") {
          set({ firmsHotspots: [], firmsTotal: 0, firmsByCountry: null, inpeFires: null });
        } else {
          const hotspots = filterByConfidence(fb.FALLBACK_FIRMS_HOTSPOTS, get().firmsWindow.confidence);
          set({ firmsHotspots: hotspots, firmsTotal: hotspots.length, firmsByCountry: null });
        }
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
      await deps.loadSatelliteLib().catch(() => {});
      get().refreshIssTelemetry();
    }
    if (layerId === "NASA_GIBS") set({ gibs: await gibsLocalReference(get().gibsProduct, get().gibsMonth) });
    if (layerId === "GLOBAL_WINDS") {
      const { buildClimatologyWindField } = await import("@/lib/winds-data");
      set({ winds: buildClimatologyWindField() });
    }
    if (layerId === "INPE_DEFORESTATION") {
      const { buildTerraBrasilisPayload } = await import("@/lib/inpe-data");
      set({ inpeDeforestation: buildTerraBrasilisPayload([], 30) });
    }
    if (layerId === "USGS_EARTHQUAKES") {
      const { buildFallbackSeismicPayload } = await import("@/lib/seismic-data");
      const { seismicWindow, seismicMinMagnitude } = get();
      set({ earthquakes: buildFallbackSeismicPayload(seismicWindow, seismicMinMagnitude) });
    }
  } finally {
    set((s) => ({
      isLoading: { ...s.isLoading, [layerId]: false },
      hasLoaded: { ...s.hasLoaded, [layerId]: true },
    }));
  }
}
