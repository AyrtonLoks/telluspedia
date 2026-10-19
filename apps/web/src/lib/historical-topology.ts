import * as topojson from "topojson-client";
import whichPolygon from "which-polygon";
import worldAtlas from "world-atlas/countries-110m.json";

// In-memory LRU/Map cache for loaded TopoJSON topologies
const topologyCache = new Map<string, any>();

// In-flight request deduplication cache
const inFlightRequests = new Map<string, Promise<any>>();

// In-memory cache for which-polygon spatial query indices (<0.2ms)
const spatialIndexCache = new Map<string, any>();

// Static fallback loaders that work across bundlers, SSR and headless test environments
const STATIC_TOPOLOGY_LOADERS: Record<string, () => Promise<any>> = {
  "/data/history/borders-1870.json": () =>
    import("../../public/data/history/borders-1870.json"),
  "/data/history/borders-1914.json": () =>
    import("../../public/data/history/borders-1914.json"),
  "/data/history/borders-1939.json": () =>
    import("../../public/data/history/borders-1939.json"),
  "/data/history/borders-1969.json": () =>
    import("../../public/data/history/borders-1969.json"),
};

/**
 * Asynchronously loads a historical TopoJSON dataset by path with in-memory caching.
 * Tries browser fetch first, falling back to bundled dynamic imports if offline or in Node test runner.
 * Deduplicates concurrent requests for the same dataset.
 */
export async function loadHistoricalTopology(topoJsonPath: string): Promise<any> {
  if (!topoJsonPath) return null;

  if (topologyCache.has(topoJsonPath)) {
    return topologyCache.get(topoJsonPath);
  }

  if (inFlightRequests.has(topoJsonPath)) {
    return inFlightRequests.get(topoJsonPath);
  }

  const loadPromise = (async () => {
    try {
      // 1. Try browser fetch if in client browser environment
      if (typeof window !== "undefined" && typeof fetch === "function") {
        try {
          const res = await fetch(topoJsonPath);
          if (res.ok) {
            const data = await res.json();
            topologyCache.set(topoJsonPath, data);
            return data;
          }
        } catch {
          // Fetch failed or blocked; continue to static loader fallback
        }
      }

      // 2. Fallback to bundled loader (works seamlessly in Next.js SSR, build and headless tests)
      const loader = STATIC_TOPOLOGY_LOADERS[topoJsonPath];
      if (loader) {
        try {
          const mod = await loader();
          const data = mod.default || mod;
          topologyCache.set(topoJsonPath, data);
          return data;
        } catch (err) {
          console.error(`Failed to load historical topology via static loader for ${topoJsonPath}:`, err);
        }
      }

      return null;
    } finally {
      inFlightRequests.delete(topoJsonPath);
    }
  })();

  inFlightRequests.set(topoJsonPath, loadPromise);
  return loadPromise;
}

/**
 * Synchronously retrieves already loaded topology from cache.
 */
export function getHistoricalTopologySync(topoJsonPath: string): any {
  return topologyCache.get(topoJsonPath) || null;
}

/**
 * Returns or builds an in-memory which-polygon spatial index for a given topology.
 * Ensures <0.2ms raycasting point-in-polygon queries.
 */
export function getHistoricalSpatialIndex(key: string, topology: any): any {
  if (!topology || !topology.objects?.countries) return null;

  if (spatialIndexCache.has(key)) {
    return spatialIndexCache.get(key);
  }

  try {
    const featureCollection = topojson.feature(
      topology,
      topology.objects.countries
    ) as any;

    if (featureCollection && featureCollection.features) {
      featureCollection.features.forEach((f: any) => {
        if (f.properties) {
          f.properties.id = f.id;
        }
      });
      const index = whichPolygon(featureCollection);
      spatialIndexCache.set(key, index);
      return index;
    }
  } catch (err) {
    console.error(`Failed to construct which-polygon index for ${key}:`, err);
  }

  return null;
}

/**
 * Returns the cached contemporary spatial index initialized from world-atlas (110m).
 */
export function getContemporarySpatialIndex(): any {
  const CONTEMPORARY_KEY = "WORLD_ATLAS_110M";
  if (spatialIndexCache.has(CONTEMPORARY_KEY)) {
    return spatialIndexCache.get(CONTEMPORARY_KEY);
  }

  try {
    const topology = worldAtlas as any;
    const featureCollection = topojson.feature(
      topology,
      topology.objects.countries
    ) as any;
    featureCollection.features.forEach((f: any) => {
      if (f.properties) {
        f.properties.id = f.id;
      }
    });
    const index = whichPolygon(featureCollection);
    spatialIndexCache.set(CONTEMPORARY_KEY, index);
    return index;
  } catch (err) {
    console.error("Failed to construct contemporary spatial index:", err);
    return null;
  }
}
