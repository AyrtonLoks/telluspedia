/**
 * Renderizador Canvas 2D para o Modo Mapa Plano & Projeções Comparativas (D33).
 *
 * Desenha sobre qualquer projeção `d3-geo`:
 * - Fundo oceânico da esfera + gratícula de meridianos e paralelos (`geoGraticule10`),
 * - Polígonos contemporâneos (177 países Natural Earth 110m / 50m) ou Fronteiras Históricas,
 * - Coroplético temático (`ChoroplethDataset`, incluindo hachura explícita de "Sem dado"),
 * - Camada oficial de Biomas (`WWF 14` / `IBGE 6`, quando ativa no Observatório),
 * - Fronteiras base + fronteiras tracejadas de territórios disputados/autônomos (RN07),
 * - Destaques de países relacionados, sob o cursor (hover) e selecionado.
 */

import * as topojson from "topojson-client";
import { geoPath, type GeoPermissibleObjects, type GeoProjection } from "d3-geo";
import { BIOMES_BY_ID } from "@/lib/biomes-catalog";
import type { BiomeFeatureProperties, BiomeTopology } from "@/lib/biomes-data";
import { isBiomeIdForScope, type BiomeId, type BiomeScope } from "@/lib/biomes-types";
import { CHOROPLETH_MISSING_COLOR, type ChoroplethDataset } from "@/lib/choropleth";
import type { CountryProperties, CountryTopology } from "@/lib/historical-topology";
import {
  resolveTopologyFeatureIso,
  WORLD_GRATICULE,
  WORLD_SPHERE_OBJECT,
} from "@/lib/map-projections";
import type { MapProjectionId } from "@/lib/map-projections-types";
import {
  renderGibs2dLayer,
  renderObservatory2dLayers,
  type Observatory2dHitTarget,
  type Observatory2dRenderState,
} from "@/lib/map-2d-observatory";
import { getTerritorialStatusKindForGeometry } from "@/lib/territorial-status";

type GeoFeature = GeoJSON.Feature<GeoJSON.Geometry, CountryProperties>;
type GeoFeatureCollection = GeoJSON.FeatureCollection<GeoJSON.Geometry, CountryProperties>;

interface CachedTopologyFeatures {
  collection: GeoFeatureCollection;
  byIso: Map<string, GeoFeature[]>;
  disputedMesh: GeoJSON.MultiLineString | null;
  autonomousMesh: GeoJSON.MultiLineString | null;
  baseMesh: GeoJSON.MultiLineString;
}

const topologyFeatureCache = new WeakMap<CountryTopology, CachedTopologyFeatures>();
const biomeFeatureCache = new WeakMap<
  BiomeTopology,
  GeoJSON.FeatureCollection<GeoJSON.Geometry, BiomeFeatureProperties>
>();

const MAP_PALETTE = {
  backdrop: "#070c16",
  oceanCenter: "#0e1e36",
  oceanEdge: "#081222",
  sphereRim: "rgba(126, 201, 215, 0.34)",
  graticule: "rgba(148, 178, 208, 0.16)",
  landContemporary: "#172437",
  landHistorical: "#24211b",
  borderContemporary: "rgba(108, 188, 224, 0.42)",
  borderChoropleth: "rgba(11, 17, 32, 0.55)",
  borderHistorical: "rgba(219, 174, 102, 0.62)",
  disputedStroke: "#f59e0b",
  autonomousStroke: "#a78bfa",
  relatedFill: "rgba(69, 164, 183, 0.22)",
  relatedStroke: "#5bc0d4",
  hoverFill: "rgba(120, 181, 195, 0.22)",
  hoverStroke: "#8bd0de",
  selectedFill: "rgba(56, 189, 212, 0.28)",
  selectedStroke: "#6ce0f5",
  selectedHalo: "rgba(56, 189, 212, 0.24)",
  missingHatchBg: CHOROPLETH_MISSING_COLOR,
  missingHatchStripe: "rgba(180, 194, 214, 0.24)",
  biomeStrokeDark: "#0b1120",
  biomeStrokeSelected: "#f8fafc",
} as const;

let cachedMissingPatternCanvas: HTMLCanvasElement | null = null;

function getMissingHatchPattern(ctx: CanvasRenderingContext2D): CanvasPattern | string {
  if (typeof document === "undefined") return MAP_PALETTE.missingHatchBg;
  if (!cachedMissingPatternCanvas) {
    const tile = document.createElement("canvas");
    tile.width = 10;
    tile.height = 10;
    const tctx = tile.getContext("2d");
    if (tctx) {
      tctx.fillStyle = MAP_PALETTE.missingHatchBg;
      tctx.fillRect(0, 0, 10, 10);
      tctx.strokeStyle = MAP_PALETTE.missingHatchStripe;
      tctx.lineWidth = 1.6;
      tctx.beginPath();
      tctx.moveTo(-2, 10);
      tctx.lineTo(10, -2);
      tctx.moveTo(4, 12);
      tctx.lineTo(12, 4);
      tctx.stroke();
    }
    cachedMissingPatternCanvas = tile;
  }
  return ctx.createPattern(cachedMissingPatternCanvas, "repeat") ?? MAP_PALETTE.missingHatchBg;
}

/**
 * Converte uma `CountryTopology` em coleções GeoJSON e malhas de fronteira cacheadas por WeakMap,
 * garantindo renderização 60 FPS durante pan/zoom sem realocar objetos GeoJSON por quadro.
 */
export function getCachedTopologyFeatures(topology: CountryTopology): CachedTopologyFeatures {
  const existing = topologyFeatureCache.get(topology);
  if (existing) return existing;

  const collection = topojson.feature<CountryProperties>(
    topology,
    topology.objects.countries
  ) as GeoFeatureCollection;
  const byIso = new Map<string, GeoFeature[]>();
  const disputedGeoms: CountryTopology["objects"]["countries"]["geometries"] = [];
  const autonomousGeoms: CountryTopology["objects"]["countries"]["geometries"] = [];

  for (const feature of collection.features) {
    if (feature.properties && feature.id !== undefined && feature.properties.id === undefined) {
      feature.properties.id = feature.id;
    }
    const iso = resolveTopologyFeatureIso(
      { ...feature.properties, id: feature.id ?? feature.properties?.id },
      null
    );
    if (iso) {
      const list = byIso.get(iso);
      if (list) list.push(feature);
      else byIso.set(iso, [feature]);
    }
  }

  for (const geometry of topology.objects.countries.geometries) {
    const iso = resolveTopologyFeatureIso(
      { ...geometry.properties, id: geometry.id ?? geometry.properties?.id },
      null
    );
    const kind = getTerritorialStatusKindForGeometry(iso ?? undefined, geometry.properties?.name);
    if (kind === "disputed") disputedGeoms.push(geometry);
    else if (kind === "autonomous") autonomousGeoms.push(geometry);
  }

  const makeMesh = (geoms: CountryTopology["objects"]["countries"]["geometries"]) => {
    if (!geoms.length) return null;
    const merged: GeoJSON.Position[][] = [];
    for (const geom of geoms) {
      const m = topojson.mesh(topology, geom);
      for (const line of m.coordinates) merged.push(line);
    }
    return { type: "MultiLineString", coordinates: merged } as GeoJSON.MultiLineString;
  };

  const cached: CachedTopologyFeatures = {
    collection,
    byIso,
    disputedMesh: makeMesh(disputedGeoms),
    autonomousMesh: makeMesh(autonomousGeoms),
    baseMesh: topojson.mesh(topology, topology.objects.countries),
  };
  topologyFeatureCache.set(topology, cached);
  return cached;
}

function getCachedBiomeFeatures(topology: BiomeTopology) {
  const existing = biomeFeatureCache.get(topology);
  if (existing) return existing;
  const fc = topojson.feature<BiomeFeatureProperties>(topology, topology.objects.biomes);
  biomeFeatureCache.set(topology, fc);
  return fc;
}

export interface Render2dMapParams {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  projection: GeoProjection;
  projectionId: MapProjectionId;
  topology: CountryTopology;
  isHistorical: boolean;
  effectiveYear: number | null;
  showGraticule: boolean;
  zoom: number;
  selectedIsos: ReadonlySet<string>;
  hoveredIsos: ReadonlySet<string>;
  relatedIsos: ReadonlySet<string>;
  choroplethDataset: ChoroplethDataset | null;
  choroplethOpacity: number;
  biomes?: {
    scope: BiomeScope;
    topology: BiomeTopology;
    filterBiomeId: BiomeId | null;
    selectedBiomeId: BiomeId | null;
    hoveredBiomeId: BiomeId | null;
    opacity: number;
  } | null;
  observatory?: Observatory2dRenderState | null;
  azimuthalCenter?: readonly [number, number] | null;
}

export function render2dMapFrame(params: Render2dMapParams): Observatory2dHitTarget[] {
  const {
    ctx,
    width,
    height,
    projection,
    projectionId,
    topology,
    isHistorical,
    effectiveYear,
    showGraticule,
    zoom,
    selectedIsos,
    hoveredIsos,
    relatedIsos,
    choroplethDataset,
    choroplethOpacity,
    biomes,
    observatory,
    azimuthalCenter,
  } = params;

  const path = geoPath(projection, ctx);
  const cached = getCachedTopologyFeatures(topology);
  const strokeScale = 1 / Math.sqrt(Math.max(1, zoom));

  // 1. Fundo do atlas
  ctx.save();
  ctx.fillStyle = MAP_PALETTE.backdrop;
  ctx.fillRect(0, 0, width, height);

  // 2. Silhueta da esfera (oceano) + recorte limpo para camadas internas
  const oceanGradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    Math.min(width, height) * 0.08,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.62
  );
  oceanGradient.addColorStop(0, MAP_PALETTE.oceanCenter);
  oceanGradient.addColorStop(1, MAP_PALETTE.oceanEdge);

  ctx.beginPath();
  path(WORLD_SPHERE_OBJECT);
  ctx.fillStyle = oceanGradient;
  ctx.fill();

  ctx.save();
  ctx.clip();

  // 3. Gratícula de meridianos e paralelos
  if (showGraticule) {
    ctx.beginPath();
    path(WORLD_GRATICULE);
    ctx.strokeStyle = MAP_PALETTE.graticule;
    ctx.lineWidth = Math.max(0.45, 0.75 * strokeScale);
    ctx.stroke();
  }

  // 4. Países (base + Coroplético se ativo no modo contemporâneo)
  const missingPattern = choroplethDataset ? getMissingHatchPattern(ctx) : null;
  for (const feature of cached.collection.features) {
    const iso = resolveTopologyFeatureIso(
      { ...feature.properties, id: feature.id ?? feature.properties?.id },
      effectiveYear
    );
    ctx.beginPath();
    path(feature as GeoPermissibleObjects);

    if (choroplethDataset && !isHistorical) {
      const entry = iso ? choroplethDataset.entries[iso] : undefined;
      ctx.save();
      ctx.globalAlpha = choroplethOpacity;
      ctx.fillStyle = entry
        ? entry.available
          ? entry.color
          : (missingPattern ?? MAP_PALETTE.missingHatchBg)
        : (missingPattern ?? MAP_PALETTE.missingHatchBg);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = isHistorical ? MAP_PALETTE.landHistorical : MAP_PALETTE.landContemporary;
      ctx.fill();
    }
  }

  // 4b. Imagem de satélite NASA GIBS (reprojetada sob as fronteiras para manter linhas costeiras nítidas)
  if (
    observatory &&
    !isHistorical &&
    observatory.activeLayers.includes("NASA_GIBS") &&
    observatory.gibsPixels
  ) {
    renderGibs2dLayer(
      ctx,
      width,
      height,
      projection,
      projectionId,
      observatory.gibsPixels,
      observatory.layerOpacity.NASA_GIBS ?? 0.85
    );
  }

  // 5. Camada oficial de Biomas (WWF 14 / IBGE 6) quando ativa no Observatório
  if (biomes && !isHistorical) {
    const biomeFc = getCachedBiomeFeatures(biomes.topology);
    ctx.lineJoin = "round";
    for (const feature of biomeFc.features) {
      const rawId = feature.properties?.id;
      if (!isBiomeIdForScope(biomes.scope, rawId)) continue;
      const entry = BIOMES_BY_ID[rawId];
      if (!entry) continue;
      const isMatch = !biomes.filterBiomeId || biomes.filterBiomeId === rawId;
      const isSelected = biomes.selectedBiomeId === rawId;
      const isHovered = biomes.hoveredBiomeId === rawId;

      ctx.save();
      ctx.globalAlpha = (isMatch ? 0.78 : 0.14) * biomes.opacity;
      ctx.fillStyle = entry.hex;
      ctx.beginPath();
      path(feature as GeoPermissibleObjects);
      ctx.fill();

      if (isSelected || isHovered || biomes.scope === "brazil") {
        ctx.globalAlpha = isSelected ? 0.95 : isHovered ? 0.85 : isMatch ? 0.45 : 0.14;
        ctx.strokeStyle =
          isSelected || isHovered ? MAP_PALETTE.biomeStrokeSelected : MAP_PALETTE.biomeStrokeDark;
        ctx.lineWidth = (isSelected ? 1.8 : isHovered ? 1.4 : 0.7) * strokeScale;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // 6. Fronteiras base + territórios disputados/autônomos (RN07)
  ctx.beginPath();
  path(cached.baseMesh as GeoPermissibleObjects);
  ctx.strokeStyle = isHistorical
    ? MAP_PALETTE.borderHistorical
    : choroplethDataset
      ? MAP_PALETTE.borderChoropleth
      : MAP_PALETTE.borderContemporary;
  ctx.lineWidth = Math.max(0.45, (isHistorical ? 1.0 : 0.8) * strokeScale);
  ctx.lineJoin = "round";
  ctx.stroke();

  if (!isHistorical && cached.disputedMesh) {
    ctx.save();
    ctx.setLineDash([4 * strokeScale, 3 * strokeScale]);
    ctx.beginPath();
    path(cached.disputedMesh as GeoPermissibleObjects);
    ctx.strokeStyle = MAP_PALETTE.disputedStroke;
    ctx.lineWidth = Math.max(0.7, 1.15 * strokeScale);
    ctx.stroke();
    ctx.restore();
  }

  if (!isHistorical && cached.autonomousMesh) {
    ctx.save();
    ctx.setLineDash([5 * strokeScale, 3 * strokeScale]);
    ctx.beginPath();
    path(cached.autonomousMesh as GeoPermissibleObjects);
    ctx.strokeStyle = MAP_PALETTE.autonomousStroke;
    ctx.lineWidth = Math.max(0.6, 1.0 * strokeScale);
    ctx.stroke();
    ctx.restore();
  }

  // 7. Destaques de países relacionados, hover e seleção
  const drawHighlightSet = (
    isos: ReadonlySet<string>,
    fillStyle: string,
    strokeStyle: string,
    lineWidth: number,
    halo?: boolean
  ) => {
    if (isos.size === 0) return;
    for (const feature of cached.collection.features) {
      const iso = resolveTopologyFeatureIso(
        { ...feature.properties, id: feature.id ?? feature.properties?.id },
        effectiveYear
      );
      if (!iso || !isos.has(iso)) continue;
      ctx.beginPath();
      path(feature as GeoPermissibleObjects);
      ctx.fillStyle = fillStyle;
      ctx.fill();
      if (halo) {
        ctx.strokeStyle = MAP_PALETTE.selectedHalo;
        ctx.lineWidth = Math.max(2.4, lineWidth * 2.6);
        ctx.stroke();
      }
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    }
  };

  drawHighlightSet(
    relatedIsos,
    MAP_PALETTE.relatedFill,
    MAP_PALETTE.relatedStroke,
    Math.max(0.9, 1.2 * strokeScale)
  );
  drawHighlightSet(
    hoveredIsos,
    MAP_PALETTE.hoverFill,
    MAP_PALETTE.hoverStroke,
    Math.max(1.0, 1.35 * strokeScale)
  );
  drawHighlightSet(
    selectedIsos,
    MAP_PALETTE.selectedFill,
    MAP_PALETTE.selectedStroke,
    Math.max(1.3, 1.7 * strokeScale),
    true
  );

  // 8. Marcador sutil do ponto central na projeção Azimutal Equidistante
  if (azimuthalCenter) {
    const pt = projection([azimuthalCenter[0], azimuthalCenter[1]]);
    if (pt && Number.isFinite(pt[0]) && Number.isFinite(pt[1])) {
      ctx.save();
      ctx.strokeStyle = MAP_PALETTE.selectedStroke;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(pt[0], pt[1], 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pt[0] - 8, pt[1]);
      ctx.lineTo(pt[0] + 8, pt[1]);
      ctx.moveTo(pt[0], pt[1] - 8);
      ctx.lineTo(pt[0], pt[1] + 8);
      ctx.stroke();
      ctx.restore();
    }
  }

  // 8b. Camadas vetoriais e pontuais do Observatório Planetário (D33 + todas as 11 camadas)
  const hitTargets =
    observatory && !isHistorical && observatory.activeLayers.length > 0
      ? renderObservatory2dLayers(ctx, width, height, projection, projectionId, observatory)
      : [];

  ctx.restore(); // Fim do clip na esfera

  // 9. Contorno externo da esfera projetada
  ctx.beginPath();
  path(WORLD_SPHERE_OBJECT);
  ctx.strokeStyle = MAP_PALETTE.sphereRim;
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.restore();
  return hitTargets;
}
