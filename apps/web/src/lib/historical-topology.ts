import * as topojson from "topojson-client";
import whichPolygon from "which-polygon";
import worldAtlas from "world-atlas/countries-110m.json";

export type CountryProperties = {
  id?: string | number;
  name?: string;
  iso?: string;
};

type Topology = Parameters<typeof topojson.mesh>[0];
type Geometry = NonNullable<Parameters<typeof topojson.mesh>[1]>;
type CountryCollection = Extract<Geometry, { type: "GeometryCollection" }> & {
  geometries: (Geometry & { properties?: CountryProperties })[];
};
export type CountryTopology = Topology & { objects: { countries: CountryCollection } };
export type CountrySpatialIndex = (point: [number, number]) => CountryProperties | null;

export const contemporaryTopology: CountryTopology = worldAtlas;

const topologyCache = new Map<string, CountryTopology>();
const inFlightRequests = new Map<string, Promise<CountryTopology | null>>();
const spatialIndexCache = new Map<string, CountrySpatialIndex>();

const STATIC_TOPOLOGY_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  "/data/history/borders-1870.json": () =>
    import("../../public/data/history/borders-1870.json"),
  "/data/history/borders-1914.json": () =>
    import("../../public/data/history/borders-1914.json"),
  "/data/history/borders-1939.json": () =>
    import("../../public/data/history/borders-1939.json"),
  "/data/history/borders-1969.json": () =>
    import("../../public/data/history/borders-1969.json"),
};

function isCountryTopology(data: unknown): data is CountryTopology {
  if (typeof data !== "object" || data === null) return false;
  const topology = data as Partial<CountryTopology>;
  const countries = topology.objects?.countries;
  return topology.type === "Topology" && Array.isArray(topology.arcs) &&
    countries?.type === "GeometryCollection" && Array.isArray(countries.geometries);
}

async function fetchHistoricalTopology(path: string): Promise<CountryTopology | null> {
  if (typeof window !== "undefined" && typeof fetch === "function") {
    try {
      const response = await fetch(path);
      if (response.ok) {
        const data: unknown = await response.json();
        if (isCountryTopology(data)) return data;
      }
    } catch {
      // Fall back to the bundled dataset.
    }
  }

  const load = STATIC_TOPOLOGY_LOADERS[path];
  if (!load) return null;
  try {
    const { default: data } = await load();
    return isCountryTopology(data) ? data : null;
  } catch (error) {
    console.error(`Failed to load historical topology for ${path}:`, error);
    return null;
  }
}

export async function loadHistoricalTopology(path: string): Promise<CountryTopology | null> {
  if (!path) return null;

  const cached = topologyCache.get(path);
  if (cached) return cached;
  const inFlight = inFlightRequests.get(path);
  if (inFlight) return inFlight;

  const request = fetchHistoricalTopology(path).then((data) => {
    if (data) topologyCache.set(path, data);
    return data;
  }).finally(() => inFlightRequests.delete(path));

  inFlightRequests.set(path, request);
  return request;
}

export function getHistoricalTopologySync(path: string): CountryTopology | null {
  return topologyCache.get(path) ?? null;
}

export function getHistoricalSpatialIndex(key: string, topology: CountryTopology | null): CountrySpatialIndex | null {
  if (!topology) return null;

  const cached = spatialIndexCache.get(key);
  if (cached) return cached;

  try {
    const featureCollection = topojson.feature<CountryProperties>(topology, topology.objects.countries);
    for (const feature of featureCollection.features) {
      if (feature.properties) feature.properties.id = feature.id;
    }
    const index = whichPolygon<CountryProperties>(featureCollection);
    spatialIndexCache.set(key, index);
    return index;
  } catch (error) {
    console.error(`Failed to construct which-polygon index for ${key}:`, error);
    return null;
  }
}

export function getContemporarySpatialIndex(): CountrySpatialIndex | null {
  return getHistoricalSpatialIndex("WORLD_ATLAS_110M", contemporaryTopology);
}
