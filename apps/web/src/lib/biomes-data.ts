import * as topojson from "topojson-client";
import whichPolygon from "which-polygon";
import { geoPath, type GeoPermissibleObjects } from "d3-geo";
import { createEquirectangularProjection } from "./choropleth-texture";
import { BIOMES_BY_ID } from "./biomes-catalog";
import { isBiomeIdForScope, type BiomeId, type BiomeScope } from "./biomes-types";

export const BIOMES_TEXTURE_WIDTH = 2048;
export const BIOMES_TEXTURE_HEIGHT = 1024;

export const BIOME_TOPOJSON_PATHS: Record<BiomeScope, string> = {
  global: "/data/biomes/global-biomes-wwf.json",
  brazil: "/data/biomes/brazil-biomes-ibge.json",
};

export interface BiomeFeatureProperties {
  id?: string;
  code?: string;
  scope?: string;
}

type Topology = Parameters<typeof topojson.mesh>[0];
type Geometry = NonNullable<Parameters<typeof topojson.mesh>[1]>;
type BiomeCollection = Extract<Geometry, { type: "GeometryCollection" }> & {
  geometries: (Geometry & { properties?: BiomeFeatureProperties })[];
};

export type BiomeTopology = Topology & {
  objects: {
    biomes: BiomeCollection;
  };
};

export type BiomeSpatialIndex = (point: [number, number]) => BiomeFeatureProperties | null;

const topologyCache = new Map<BiomeScope, BiomeTopology>();
const inFlightCache = new Map<BiomeScope, Promise<BiomeTopology | null>>();
const spatialIndexCache = new Map<BiomeScope, BiomeSpatialIndex>();

export function isBiomeTopology(data: unknown): data is BiomeTopology {
  if (typeof data !== "object" || data === null) return false;
  const topo = data as Partial<BiomeTopology>;
  const biomes = topo.objects?.biomes;
  return (
    topo.type === "Topology" &&
    Array.isArray(topo.arcs) &&
    biomes?.type === "GeometryCollection" &&
    Array.isArray(biomes.geometries)
  );
}

export function getBiomeTopologySync(scope: BiomeScope): BiomeTopology | null {
  return topologyCache.get(scope) ?? null;
}

export function setBiomeTopologyCache(scope: BiomeScope, topology: BiomeTopology): void {
  topologyCache.set(scope, topology);
  spatialIndexCache.delete(scope);
}

export function resetBiomeTopologyCache(): void {
  topologyCache.clear();
  inFlightCache.clear();
  spatialIndexCache.clear();
}

/**
 * Carrega sob demanda o TopoJSON quantizado de biomas (Global WWF 14 ou Brasil IBGE 6).
 * Nunca embutido no bundle inicial de `/` (T25/T35).
 */
export async function loadBiomeTopology(
  scope: BiomeScope,
  fetchImpl: typeof fetch = fetch
): Promise<BiomeTopology | null> {
  const cached = topologyCache.get(scope);
  if (cached) return cached;

  const inFlight = inFlightCache.get(scope);
  if (inFlight) return inFlight;

  const url = BIOME_TOPOJSON_PATHS[scope];
  const promise = (async (): Promise<BiomeTopology | null> => {
    try {
      const response = await fetchImpl(url);
      if (!response.ok) return null;
      const data: unknown = await response.json();
      if (!isBiomeTopology(data)) return null;
      topologyCache.set(scope, data);
      return data;
    } catch {
      return null;
    } finally {
      inFlightCache.delete(scope);
    }
  })();

  inFlightCache.set(scope, promise);
  return promise;
}

/** Índice espacial R-tree em memória (< 0,2 ms por consulta) via `which-polygon`. */
export function getBiomeSpatialIndex(
  scope: BiomeScope,
  topology: BiomeTopology
): BiomeSpatialIndex {
  const existing = spatialIndexCache.get(scope);
  if (existing) return existing;

  const featureCollection = topojson.feature<BiomeFeatureProperties>(
    topology,
    topology.objects.biomes
  );
  const query = whichPolygon(featureCollection) as BiomeSpatialIndex;
  spatialIndexCache.set(scope, query);
  return query;
}

/**
 * Resolve qual bioma (do escopo ativo) contém a coordenada `(lat, lng)`.
 * No escopo Brasil, exige que o ponto também pertença aos polígonos carregados do IBGE.
 */
export function pickBiomeAt(
  scope: BiomeScope,
  lat: number,
  lng: number,
  topologyOverride?: BiomeTopology
): BiomeId | null {
  const topology = topologyOverride ?? topologyCache.get(scope);
  if (!topology) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const query = getBiomeSpatialIndex(scope, topology);
  const hit = query([lng, lat]);
  const rawId = hit?.id;
  return isBiomeIdForScope(scope, rawId) ? rawId : null;
}

export interface BiomeRasterizeOptions {
  filterBiomeId?: BiomeId | null;
  selectedBiomeId?: BiomeId | null;
}

export interface BiomeRasterizeStats {
  scope: BiomeScope;
  renderedFeatures: number;
  durationMs: number;
}

/**
 * Rasteriza os biomas oficiais (WWF/RESOLVE 2017 ou IBGE 2019 1:250.000) em um canvas 2D
 * equiretangular offscreen. Os polígonos oficiais já respeitam as costas reais (oceanos 100%
 * transparentes); biomas fora do filtro são atenuados para foco analítico.
 */
export function rasterizeBiomesToCanvas(
  ctx: CanvasRenderingContext2D,
  scope: BiomeScope,
  topology: BiomeTopology,
  options: BiomeRasterizeOptions = {},
  width: number = BIOMES_TEXTURE_WIDTH,
  height: number = BIOMES_TEXTURE_HEIGHT
): BiomeRasterizeStats {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const { filterBiomeId = null, selectedBiomeId = null } = options;

  ctx.clearRect(0, 0, width, height);

  const projection = createEquirectangularProjection(width, height);
  const pathGen = geoPath(projection, ctx);
  const fc = topojson.feature<BiomeFeatureProperties>(topology, topology.objects.biomes);

  ctx.lineJoin = "round";
  let renderedFeatures = 0;

  for (const feature of fc.features) {
    const rawId = feature.properties?.id;
    if (!isBiomeIdForScope(scope, rawId)) continue;
    const entry = BIOMES_BY_ID[rawId];
    if (!entry) continue;

    const isFilteredMatch = !filterBiomeId || filterBiomeId === rawId;
    const isSelected = selectedBiomeId === rawId;

    ctx.save();
    ctx.globalAlpha = isFilteredMatch ? 0.88 : 0.14;
    ctx.fillStyle = entry.hex;
    ctx.beginPath();
    pathGen(feature as GeoPermissibleObjects);
    ctx.fill();

    // Contorno sutil separando biomas adjacentes; reforçado quando selecionado.
    if (isSelected || scope === "brazil") {
      ctx.globalAlpha = isSelected ? 0.95 : isFilteredMatch ? 0.55 : 0.16;
      ctx.strokeStyle = isSelected ? "#F8FAFC" : "#0B1120";
      ctx.lineWidth = isSelected ? (scope === "brazil" ? 2.2 : 1.5) : 0.85;
      ctx.stroke();
    } else if (isFilteredMatch) {
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#0B1120";
      ctx.lineWidth = 0.4;
      ctx.stroke();
    }
    ctx.restore();

    renderedFeatures++;
  }

  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    scope,
    renderedFeatures,
    durationMs: Math.max(0, t1 - t0),
  };
}
