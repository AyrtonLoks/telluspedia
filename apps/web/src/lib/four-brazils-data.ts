/**
 * Carregador sob demanda, picking espacial (< 0,2 ms via `which-polygon`) e rasterizadores
 * offscreen para as Lentes de Geografia Crítica — Milton Santos (D36).
 */

import whichPolygon from "which-polygon";
import { geoPath, type GeoPermissibleObjects } from "d3-geo";
import * as topojson from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import { NUMERIC_TO_ISO } from "@/lib/country-data";
import { createEquirectangularProjection } from "@/lib/choropleth-texture";
import {
  FOUR_BRAZILS_REGIONS,
  type MtciDataset,
} from "@/lib/critical-geo-catalog";
import {
  isFourBrazilsRegionId,
  type FourBrazilsRegionId,
  type IbgeRegionId,
} from "@/lib/critical-geo-ids";

export const FOUR_BRAZILS_DATA_URL = "/data/four-brazils.json";
export const FOUR_BRAZILS_TEXTURE_WIDTH = 2048;
export const FOUR_BRAZILS_TEXTURE_HEIGHT = 1024;
export const MTCI_TEXTURE_WIDTH = 2048;
export const MTCI_TEXTURE_HEIGHT = 1024;

export interface FourBrazilsFeatureProperties {
  id: FourBrazilsRegionId;
  scope: "fourBrazils";
}

export interface IbgeRegionFeatureProperties {
  id: IbgeRegionId;
  scope: "ibgeRegions";
}

export interface FourBrazilsDataset {
  version: string;
  source: string;
  fourBrazils: GeoJSON.FeatureCollection<GeoJSON.Geometry, FourBrazilsFeatureProperties>;
  ibgeRegions: GeoJSON.FeatureCollection<GeoJSON.Geometry, IbgeRegionFeatureProperties>;
}

type FourBrazilsSpatialIndex = (point: [number, number]) => FourBrazilsFeatureProperties | null;

let cachedDataset: FourBrazilsDataset | null = null;
let inflightPromise: Promise<FourBrazilsDataset | null> | null = null;
let cachedIndex: FourBrazilsSpatialIndex | null = null;

export function isFourBrazilsDataset(data: unknown): data is FourBrazilsDataset {
  if (typeof data !== "object" || data === null) return false;
  const candidate = data as Partial<FourBrazilsDataset>;
  return (
    candidate.fourBrazils?.type === "FeatureCollection" &&
    Array.isArray(candidate.fourBrazils.features) &&
    candidate.fourBrazils.features.length === 4 &&
    candidate.ibgeRegions?.type === "FeatureCollection" &&
    Array.isArray(candidate.ibgeRegions.features) &&
    candidate.ibgeRegions.features.length === 5
  );
}

export function getFourBrazilsDatasetSync(): FourBrazilsDataset | null {
  return cachedDataset;
}

export function setFourBrazilsDatasetCache(dataset: FourBrazilsDataset): void {
  cachedDataset = dataset;
  cachedIndex = null;
}

export function resetFourBrazilsDatasetCache(): void {
  cachedDataset = null;
  inflightPromise = null;
  cachedIndex = null;
}

export async function loadFourBrazilsDataset(
  fetchImpl: typeof fetch = fetch
): Promise<FourBrazilsDataset | null> {
  if (cachedDataset) return cachedDataset;
  if (inflightPromise) return inflightPromise;

  inflightPromise = (async () => {
    try {
      const response = await fetchImpl(FOUR_BRAZILS_DATA_URL);
      if (!response.ok) return null;
      const json: unknown = await response.json();
      if (!isFourBrazilsDataset(json)) return null;
      cachedDataset = json;
      cachedIndex = null;
      return json;
    } catch {
      return null;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

export function pickFourBrazilsAt(
  lat: number,
  lng: number,
  override?: FourBrazilsDataset
): FourBrazilsRegionId | null {
  const ds = override ?? cachedDataset;
  if (!ds || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const query = override
    ? (whichPolygon(override.fourBrazils) as FourBrazilsSpatialIndex)
    : (cachedIndex ??= whichPolygon(ds.fourBrazils) as FourBrazilsSpatialIndex);
  const hit = query([lng, lat]);
  return isFourBrazilsRegionId(hit?.id) ? hit.id : null;
}

export interface FourBrazilsRasterizeOptions {
  selectedRegionId?: FourBrazilsRegionId | null;
  showIbgeComparison?: boolean;
}

/**
 * Rasteriza Os Quatro Brasis (Santos & Silveira, 2001) + comparação opcional das 5 regiões IBGE
 * em canvas equiretangular (oceanos e países vizinhos 100% transparentes).
 */
export function rasterizeFourBrazilsToCanvas(
  ctx: CanvasRenderingContext2D,
  dataset: FourBrazilsDataset,
  options: FourBrazilsRasterizeOptions = {},
  width: number = FOUR_BRAZILS_TEXTURE_WIDTH,
  height: number = FOUR_BRAZILS_TEXTURE_HEIGHT
): number {
  const { selectedRegionId = null, showIbgeComparison = false } = options;
  ctx.clearRect(0, 0, width, height);

  const projection = createEquirectangularProjection(width, height);
  const pathGen = geoPath(projection, ctx);

  let rendered = 0;
  ctx.lineJoin = "round";

  for (const feature of dataset.fourBrazils.features) {
    const id = feature.properties?.id;
    if (!isFourBrazilsRegionId(id)) continue;
    const meta = FOUR_BRAZILS_REGIONS[id];
    const isSelected = selectedRegionId === id;

    ctx.save();
    ctx.globalAlpha = selectedRegionId ? (isSelected ? 0.92 : 0.42) : 0.84;
    ctx.fillStyle = meta.hex;
    ctx.beginPath();
    pathGen(feature as GeoPermissibleObjects);
    ctx.fill();

    ctx.globalAlpha = isSelected ? 0.98 : 0.65;
    ctx.strokeStyle = isSelected ? "#F8FAFC" : "#0B1120";
    ctx.lineWidth = isSelected ? 2.4 : 1.0;
    ctx.stroke();
    ctx.restore();
    rendered++;
  }

  if (showIbgeComparison) {
    ctx.save();
    ctx.strokeStyle = "#F8FAFC";
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    for (const feature of dataset.ibgeRegions.features) {
      ctx.beginPath();
      pathGen(feature as GeoPermissibleObjects);
      ctx.stroke();
    }
    ctx.restore();
  }

  return rendered;
}

type WorldAtlasTopology = Parameters<typeof topojson.feature>[0] & {
  objects: { countries: Parameters<typeof topojson.feature>[1] };
};

let cachedWorldFeatures: GeoJSON.Feature[] | null = null;

function getWorldCountryFeatures(): GeoJSON.Feature[] {
  if (cachedWorldFeatures) return cachedWorldFeatures;
  const topo = worldAtlas as unknown as WorldAtlasTopology;
  const fc = topojson.feature(topo, topo.objects.countries) as unknown as GeoJSON.FeatureCollection;
  cachedWorldFeatures = fc.features;
  return cachedWorldFeatures;
}

/**
 * Rasteriza a leitura empírica do Meio Técnico-Científico-Informacional (MTCI) sobre os 177 países.
 */
export function rasterizeMtciToCanvas(
  ctx: CanvasRenderingContext2D,
  dataset: MtciDataset,
  width: number = MTCI_TEXTURE_WIDTH,
  height: number = MTCI_TEXTURE_HEIGHT
): number {
  ctx.clearRect(0, 0, width, height);
  const projection = createEquirectangularProjection(width, height);
  const pathGen = geoPath(projection, ctx);
  const features = getWorldCountryFeatures();

  let rendered = 0;
  ctx.lineJoin = "round";

  for (const feature of features) {
    const numericId = String(feature.id ?? "").padStart(3, "0");
    const iso = NUMERIC_TO_ISO[numericId];
    if (!iso) continue;
    const entry = dataset.entries[iso];
    if (!entry) continue;

    ctx.save();
    ctx.globalAlpha = entry.available ? 0.88 : 0.48;
    ctx.fillStyle = entry.color;
    ctx.beginPath();
    pathGen(feature as GeoPermissibleObjects);
    ctx.fill();
    ctx.restore();
    rendered++;
  }

  return rendered;
}
