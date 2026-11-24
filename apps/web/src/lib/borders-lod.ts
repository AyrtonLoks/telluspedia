/**
 * LoD progressivo de fronteiras contemporâneas: Natural Earth `1:110m` ↔ `1:50m` (T49 / RN21).
 *
 * - A malha `1:110m` permanece instantânea em memória para visão orbital padrão (altitude ≥ 2,5).
 * - Quando a câmera se aproxima abaixo de `BORDERS_LOD_ENTER_DISTANCE` (2,2), carrega
 *   `/data/countries-ne-50m.json` sob demanda (0 KiB no bundle inicial de `/`) e ativa tanto a
 *   geometria de alta resolução quanto o índice espacial `which-polygon` (< 0,01 ms/lookup).
 * - Histerese entre `2,2` e `2,5` evita oscilação de troca de malha perto do limiar.
 */

import {
  contemporaryTopology,
  getContemporarySpatialIndex,
  getHistoricalSpatialIndex,
  type CountrySpatialIndex,
  type CountryTopology,
} from "./historical-topology";

export type BordersLodLevel = "110m" | "50m";

export const BORDERS_50M_PATH = "/data/countries-ne-50m.json";
export const BORDERS_LOD_ENTER_DISTANCE = 2.2;
export const BORDERS_LOD_EXIT_DISTANCE = 2.5;

let highResTopologyCache: CountryTopology | null = null;
let highResInFlight: Promise<CountryTopology | null> | null = null;

function isCountryTopology(data: unknown): data is CountryTopology {
  if (typeof data !== "object" || data === null) return false;
  const topology = data as Partial<CountryTopology>;
  const countries = topology.objects?.countries;
  return (
    topology.type === "Topology" &&
    Array.isArray(topology.arcs) &&
    countries?.type === "GeometryCollection" &&
    Array.isArray(countries.geometries)
  );
}

/**
 * Decide o nível de LoD com histerese conforme a distância da câmera ao centro da Terra.
 */
export function resolveBorderLod(
  current: BordersLodLevel,
  cameraDistance: number
): BordersLodLevel {
  if (!Number.isFinite(cameraDistance)) return current;
  if (current === "110m" && cameraDistance <= BORDERS_LOD_ENTER_DISTANCE) {
    return "50m";
  }
  if (current === "50m" && cameraDistance >= BORDERS_LOD_EXIT_DISTANCE) {
    return "110m";
  }
  return current;
}

export function getHighResTopologySync(): CountryTopology | null {
  return highResTopologyCache;
}

/**
 * Carrega sob demanda o TopoJSON Natural Earth `1:50m` (`public/data/countries-ne-50m.json`).
 * Deduplica requisições concorrentes e retorna `null` silenciosamente em caso de falha offline.
 */
export async function loadHighResTopology(
  fetchImpl?: typeof fetch
): Promise<CountryTopology | null> {
  if (highResTopologyCache) return highResTopologyCache;
  if (highResInFlight) return highResInFlight;

  const runner = fetchImpl ?? (typeof fetch === "function" ? fetch : null);
  if (!runner) return null;

  highResInFlight = runner(BORDERS_50M_PATH)
    .then(async (response) => {
      if (!response.ok) return null;
      const data: unknown = await response.json();
      if (!isCountryTopology(data)) return null;
      highResTopologyCache = data;
      return data;
    })
    .catch(() => null)
    .finally(() => {
      highResInFlight = null;
    });

  return highResInFlight;
}

export function getHighResSpatialIndex(): CountrySpatialIndex | null {
  if (!highResTopologyCache) return null;
  return getHistoricalSpatialIndex("WORLD_ATLAS_50M", highResTopologyCache);
}

export function getContemporaryTopologyForLod(lod: BordersLodLevel): CountryTopology {
  if (lod === "50m" && highResTopologyCache) {
    return highResTopologyCache;
  }
  return contemporaryTopology;
}

export function getContemporarySpatialIndexForLod(lod: BordersLodLevel): CountrySpatialIndex | null {
  if (lod === "50m" && highResTopologyCache) {
    return getHighResSpatialIndex() ?? getContemporarySpatialIndex();
  }
  return getContemporarySpatialIndex();
}

/** Somente para isolamento de testes. */
export function resetHighResTopologyCache(): void {
  highResTopologyCache = null;
  highResInFlight = null;
}
