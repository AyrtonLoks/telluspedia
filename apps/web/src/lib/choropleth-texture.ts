import * as topojson from "topojson-client";
import { geoEquirectangular, geoPath, type GeoContext, type GeoPermissibleObjects } from "d3-geo";
import { NAME_TO_ISO, NUMERIC_TO_ISO } from "@/lib/country-data";
import { contemporaryTopology, type CountryProperties } from "@/lib/historical-topology";
import {
  CHOROPLETH_MISSING_COLOR,
  type ChoroplethDataset,
} from "@/lib/choropleth";

export const CHOROPLETH_TEXTURE_WIDTH = 2048;
export const CHOROPLETH_TEXTURE_HEIGHT = 1024;

export interface ChoroplethFeatureRecord {
  iso: string;
  feature: GeoPermissibleObjects;
}

/** Anel projetado em coordenadas planas [x0, y0, x1, y1, ...] já recortado no antimeridiano. */
interface CompiledFeatureGeometry {
  iso: string;
  rings: Float32Array[];
  path2d: Path2D | null;
}

interface CompiledGeometryCache {
  width: number;
  height: number;
  entries: CompiledFeatureGeometry[];
}

let cachedFeatures: ChoroplethFeatureRecord[] | null = null;
const compiledGeometryCache = new Map<string, CompiledGeometryCache>();

/**
 * Extrai e normaliza (zero-padding ISO 3166-1 numérico) as 177 feições do Natural Earth 110m.
 * Memoizado em memória para evitar reparse do TopoJSON a cada troca de indicador.
 */
export function getChoroplethFeatures(): readonly ChoroplethFeatureRecord[] {
  if (cachedFeatures) return cachedFeatures;

  const fc = topojson.feature<CountryProperties>(
    contemporaryTopology,
    contemporaryTopology.objects.countries
  );

  const records: ChoroplethFeatureRecord[] = [];
  for (const feature of fc.features) {
    const rawId = feature.id ?? feature.properties?.id;
    const numeric =
      rawId !== undefined && rawId !== null ? String(rawId).padStart(3, "0") : "";
    const name = feature.properties?.name;
    const iso =
      NUMERIC_TO_ISO[numeric] ||
      (name ? NAME_TO_ISO[name] : undefined) ||
      "";
    if (!iso) continue;
    records.push({ iso, feature });
  }

  cachedFeatures = records;
  return records;
}

/**
 * Projeção equiretangular perfeitamente alinhada à parametrização da `SphereGeometry` do Three.js
 * e `latLngToVector3`:
 * - u = (lng + 180) / 360 -> x = u * width
 * - v = (90 - lat) / 180  -> y = v * height (com `flipY = true` padrão do THREE.CanvasTexture)
 * Usa `d3-geo` para recorte automático no antimeridiano (±180°) e polos.
 */
export function createEquirectangularProjection(width: number, height: number) {
  return geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2])
    .precision(0.5);
}

/**
 * Pré-projeta uma única vez todos os 177 países para coordenadas 2D planas (e `Path2D` no browser),
 * garantindo que qualquer troca de indicador coroplético execute em poucos milissegundos (< 10 ms).
 */
function getCompiledGeometries(width: number, height: number): CompiledGeometryCache {
  const key = `${width}x${height}`;
  const cached = compiledGeometryCache.get(key);
  if (cached) return cached;

  const projection = createEquirectangularProjection(width, height);
  const hasPath2D = typeof Path2D !== "undefined";
  const entries: CompiledFeatureGeometry[] = [];

  for (const record of getChoroplethFeatures()) {
    const rings: Float32Array[] = [];
    let current: number[] = [];

    const flushRing = () => {
      if (current.length >= 6) {
        rings.push(new Float32Array(current));
      }
      current = [];
    };

    const recorder: GeoContext = {
      beginPath: () => {
        flushRing();
      },
      moveTo: (x: number, y: number) => {
        flushRing();
        current.push(x, y);
      },
      lineTo: (x: number, y: number) => {
        current.push(x, y);
      },
      closePath: () => {
        flushRing();
      },
      arc: () => {},
    };

    const pathGenerator = geoPath(projection, recorder);
    pathGenerator(record.feature);
    flushRing();

    let path2d: Path2D | null = null;
    if (hasPath2D && rings.length > 0) {
      const p = new Path2D();
      for (const ring of rings) {
        p.moveTo(ring[0], ring[1]);
        for (let i = 2; i < ring.length; i += 2) {
          p.lineTo(ring[i], ring[i + 1]);
        }
        p.closePath();
      }
      path2d = p;
    }

    entries.push({ iso: record.iso, rings, path2d });
  }

  const built: CompiledGeometryCache = { width, height, entries };
  compiledGeometryCache.set(key, built);
  return built;
}

/**
 * Cria padrão sutil de hachura diagonal para países sem dado ("Dado indisponível"),
 * garantindo distinção visual imediata (inclusive para daltonismo e impressão P&B).
 */
function createMissingDataFill(
  ctx: CanvasRenderingContext2D
): string | CanvasPattern {
  if (typeof document === "undefined" || typeof ctx.createPattern !== "function") {
    return CHOROPLETH_MISSING_COLOR;
  }
  const tile = document.createElement("canvas");
  tile.width = 12;
  tile.height = 12;
  const tctx = tile.getContext("2d");
  if (!tctx) return CHOROPLETH_MISSING_COLOR;

  tctx.fillStyle = CHOROPLETH_MISSING_COLOR;
  tctx.fillRect(0, 0, 12, 12);
  tctx.strokeStyle = "rgba(180, 194, 214, 0.22)";
  tctx.lineWidth = 1.5;
  tctx.beginPath();
  tctx.moveTo(-2, 14);
  tctx.lineTo(14, -2);
  tctx.moveTo(-2, 2);
  tctx.lineTo(2, -2);
  tctx.moveTo(10, 14);
  tctx.lineTo(14, 10);
  tctx.stroke();

  return ctx.createPattern(tile, "repeat") ?? CHOROPLETH_MISSING_COLOR;
}

export interface RasterizeStats {
  renderedFeatures: number;
  availableFeatures: number;
  missingFeatures: number;
  durationMs: number;
}

/**
 * Rasteriza o dataset coroplético em um canvas 2D equiretangular offscreen.
 * Oceanos permanecem 100% transparentes; países sem dado recebem hachura neutra
 * (nunca zero). Retorna métricas de tempo e cobertura.
 */
export function rasterizeChoroplethToCanvas(
  ctx: CanvasRenderingContext2D,
  dataset: ChoroplethDataset,
  width: number = CHOROPLETH_TEXTURE_WIDTH,
  height: number = CHOROPLETH_TEXTURE_HEIGHT
): RasterizeStats {
  const compiled = getCompiledGeometries(width, height);
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();

  ctx.clearRect(0, 0, width, height);
  const missingFill = createMissingDataFill(ctx);

  let renderedFeatures = 0;
  let availableFeatures = 0;
  let missingFeatures = 0;

  ctx.lineJoin = "round";
  ctx.lineWidth = 0.65;

  for (const { iso, rings, path2d } of compiled.entries) {
    const entry = dataset.entries[iso];
    const isAvailable = Boolean(entry?.available);
    if (isAvailable) availableFeatures++;
    else missingFeatures++;

    ctx.fillStyle = isAvailable ? entry.color : missingFill;
    ctx.strokeStyle = isAvailable ? entry.color : CHOROPLETH_MISSING_COLOR;

    if (path2d) {
      ctx.fill(path2d);
      ctx.stroke(path2d);
    } else {
      ctx.beginPath();
      for (const ring of rings) {
        ctx.moveTo(ring[0], ring[1]);
        for (let i = 2; i < ring.length; i += 2) {
          ctx.lineTo(ring[i], ring[i + 1]);
        }
        ctx.closePath();
      }
      ctx.fill();
      ctx.stroke();
    }
    renderedFeatures++;
  }

  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  return {
    renderedFeatures,
    availableFeatures,
    missingFeatures,
    durationMs: Math.max(0, t1 - t0),
  };
}
