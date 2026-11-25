/**
 * Motor cartográfico 2D & Projeções Comparativas (D33) baseado em `d3-geo`.
 *
 * Carregado sob demanda junto com `FlatMapCanvas` (0 KiB no bundle inicial de `/`).
 * Suporta 4 projeções clássicas com propriedades geométricas contrastantes:
 * - Equal Earth (equivalente — preserva áreas relativas dos continentes)
 * - Mercator (conforme — preserva ângulos locais, distorce fortemente altas latitudes)
 * - Natural Earth (compromisso pseudocilíndrico, família Robinson)
 * - Azimutal Equidistante (preserva distâncias e azimutes a partir do ponto focal)
 */

import {
  geoAzimuthalEquidistant,
  geoEqualEarth,
  geoGraticule10,
  geoMercator,
  geoNaturalEarth1,
  type GeoPermissibleObjects,
  type GeoProjection,
} from "d3-geo";
import { NAME_TO_ISO, NUMERIC_TO_ISO } from "@/lib/country-data";
import { HISTORICAL_ENTITIES, resolveHistoricalEntity } from "@/lib/historical-entities";
import type { CountryProperties, CountrySpatialIndex } from "@/lib/historical-topology";
import {
  DEFAULT_MAP_PROJECTION,
  MAP_PROJECTION_IDS,
  type MapProjectionId,
} from "@/lib/map-projections-types";

export { DEFAULT_MAP_PROJECTION, MAP_PROJECTION_IDS };
export type { MapProjectionId };

export interface MapProjectionMetadata {
  id: MapProjectionId;
  name: string;
  nameEn: string;
  shortName: string;
  shortNameEn: string;
  authorYear: string;
  propertyBadge: string;
  propertyBadgeEn: string;
  preserves: string;
  preservesEn: string;
  distorts: string;
  distortsEn: string;
  didacticNote: string;
  didacticNoteEn: string;
  comparisonExample: string;
  comparisonExampleEn: string;
}

export const MAP_PROJECTION_CATALOG: Record<MapProjectionId, MapProjectionMetadata> = {
  "equal-earth": {
    id: "equal-earth",
    name: "Equal Earth",
    nameEn: "Equal Earth",
    shortName: "Equal Earth",
    shortNameEn: "Equal Earth",
    authorYear: "Šavrič et al., 2018",
    propertyBadge: "Equivalente (área fiel)",
    propertyBadgeEn: "Equal-area",
    preserves: "Áreas proporcionais reais entre todos os países e continentes.",
    preservesEn: "True relative areas across all countries and continents.",
    distorts: "Ângulos e formas suavemente nas bordas de altas latitudes.",
    distortsEn: "Angles and shapes gently near high-latitude edges.",
    didacticNote:
      "Projetada para mapas temáticos globais: a África aparece com sua área real (~14× maior que a Groenlândia), ideal para coropléticos e biomas.",
    didacticNoteEn:
      "Designed for global thematic maps: Africa appears at its true area (~14× larger than Greenland), ideal for choropleths and biomes.",
    comparisonExample: "África (30,4 M km²) vs. Groenlândia (2,16 M km²): proporção fiel de ~14:1.",
    comparisonExampleEn: "Africa (30.4M km²) vs. Greenland (2.16M km²): faithful ~14:1 ratio.",
  },
  mercator: {
    id: "mercator",
    name: "Mercator",
    nameEn: "Mercator",
    shortName: "Mercator",
    shortNameEn: "Mercator",
    authorYear: "Gerardus Mercator, 1569",
    propertyBadge: "Conforme (ângulos fiéis)",
    propertyBadgeEn: "Conformal (local angles)",
    preserves: "Ângulos locais e linhas de rumo constante (loxodromias retas).",
    preservesEn: "Local angles and constant-bearing compass lines (straight rhumb lines).",
    distorts: "Exagera drasticamente áreas conforme a latitude aumenta (recorte em ±82°).",
    distortsEn: "Severely inflates areas toward the poles (clipped at ±82°).",
    didacticNote:
      "Histórica para navegação marítima, mas enganosa para comparar tamanhos territoriais: regiões polares parecem gigantescas perto do Equador.",
    didacticNoteEn:
      "Historic for maritime navigation, yet misleading for comparing land area: polar regions appear dramatically oversized relative to the Equator.",
    comparisonExample: "A Groenlândia aparenta tamanho semelhante ao da África, embora seja 14× menor.",
    comparisonExampleEn: "Greenland looks roughly as large as Africa, despite being 14× smaller.",
  },
  "natural-earth": {
    id: "natural-earth",
    name: "Natural Earth (família Robinson)",
    nameEn: "Natural Earth (Robinson family)",
    shortName: "Natural Earth",
    shortNameEn: "Natural Earth",
    authorYear: "Tom Patterson, 2011",
    propertyBadge: "Compromisso (equilibrada)",
    propertyBadgeEn: "Compromise (balanced)",
    preserves: "Equilíbrio visual agradável entre proporção de área e contorno dos continentes.",
    preservesEn: "Pleasing visual balance between relative area and continental shapes.",
    distorts: "Nenhuma propriedade é 100% exata, mas nenhum extremo fica severamente deformado.",
    distortsEn: "No single metric is strictly exact, yet extremes remain mild and readable.",
    didacticNote:
      "Evolução contemporânea das projeções pseudocilíndricas de compromisso como Robinson: leitura natural para atlas gerais e geopolítica.",
    didacticNoteEn:
      "Modern successor to pseudocylindrical compromise projections like Robinson: balanced readability for world atlases and geopolitics.",
    comparisonExample: "Polos levemente curvados reduzem o exagero de Mercator sem comprimir as bordas.",
    comparisonExampleEn: "Gently curved poles curb Mercator inflation without squeezing outer edges.",
  },
  azimuthal: {
    id: "azimuthal",
    name: "Azimutal Equidistante",
    nameEn: "Azimuthal Equidistant",
    shortName: "Azimutal",
    shortNameEn: "Azimuthal",
    authorYear: "Al-Biruni / Postel, séc. XI–XVI",
    propertyBadge: "Equidistante (do centro)",
    propertyBadgeEn: "Equidistant (from center)",
    preserves: "Distâncias reais e direções (azimutes) medidas a partir do ponto central.",
    preservesEn: "True distances and bearings (azimuths) measured from the center point.",
    distorts: "Áreas e formas se esticam cada vez mais perto do anel externo (antípoda).",
    distortsEn: "Areas and shapes stretch progressively toward the outer rim (antipode).",
    didacticNote:
      "Muito usada em rotas aéreas de grande círculo, telecomunicações e no emblema da ONU: qualquer reta partindo do centro é o caminho mais curto.",
    didacticNoteEn:
      "Used for great-circle aviation routes, radio bearings, and the UN emblem — every straight line from the center is the shortest path.",
    comparisonExample: "Selecione um país e centralize a projeção para medir o mundo a partir dele.",
    comparisonExampleEn: "Select a country and center the projection to view the world radiating from it.",
  },
};

export const MAP_PROJECTION_LIST: readonly MapProjectionMetadata[] = MAP_PROJECTION_IDS.map(
  (id) => MAP_PROJECTION_CATALOG[id]
);

/** Caixa geográfica segura para Mercator (±82° evita singularidade infinita nos polos). */
const MERCATOR_BOUNDS_FEATURE: GeoPermissibleObjects = {
  type: "MultiPoint",
  coordinates: [
    [-180, -82],
    [180, 82],
  ],
};

const WORLD_SPHERE: GeoPermissibleObjects = { type: "Sphere" };

export const MIN_2D_ZOOM = 1;
export const MAX_2D_ZOOM = 12;

export interface MapProjectionOptions {
  zoom?: number;
  panX?: number;
  panY?: number;
  /** Centro focal `[lng, lat]` usado pela projeção Azimutal Equidistante. */
  center?: readonly [number, number];
  /** Margens internas (px) reservadas para a barra superior e timeline. */
  paddingTop?: number;
  paddingBottom?: number;
  paddingHorizontal?: number;
}

export function clamp2dZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return MIN_2D_ZOOM;
  return Math.max(MIN_2D_ZOOM, Math.min(MAX_2D_ZOOM, zoom));
}

/**
 * Instancia e ajusta a projeção `d3-geo` ao viewport mantendo enquadramento limpo
 * com pan/zoom suaves.
 */
export function createMapProjection(
  id: MapProjectionId,
  width: number,
  height: number,
  options: MapProjectionOptions = {}
): GeoProjection {
  const safeW = Math.max(320, Number.isFinite(width) ? width : 1024);
  const safeH = Math.max(240, Number.isFinite(height) ? height : 640);
  const padX = options.paddingHorizontal ?? Math.round(Math.min(48, safeW * 0.04));
  const padTop = options.paddingTop ?? 88;
  const padBottom = options.paddingBottom ?? 108;

  const innerLeft = padX;
  const innerTop = Math.min(padTop, safeH * 0.25);
  const innerRight = Math.max(innerLeft + 160, safeW - padX);
  const innerBottom = Math.max(innerTop + 140, safeH - Math.min(padBottom, safeH * 0.28));
  const extent: [[number, number], [number, number]] = [
    [innerLeft, innerTop],
    [innerRight, innerBottom],
  ];

  let projection: GeoProjection;
  switch (id) {
    case "mercator":
      projection = geoMercator().fitExtent(extent, MERCATOR_BOUNDS_FEATURE);
      break;
    case "natural-earth":
      projection = geoNaturalEarth1().fitExtent(extent, WORLD_SPHERE);
      break;
    case "azimuthal": {
      const [centerLng = 0, centerLat = 0] = options.center ?? [0, 0];
      const safeLng = Number.isFinite(centerLng) ? centerLng : 0;
      const safeLat = Number.isFinite(centerLat) ? Math.max(-89.5, Math.min(89.5, centerLat)) : 0;
      projection = geoAzimuthalEquidistant()
        .rotate([-safeLng, -safeLat])
        .clipAngle(179.5)
        .fitExtent(extent, WORLD_SPHERE);
      break;
    }
    case "equal-earth":
    default:
      projection = geoEqualEarth().fitExtent(extent, WORLD_SPHERE);
      break;
  }

  const zoom = clamp2dZoom(options.zoom ?? 1);
  const panX = Number.isFinite(options.panX) ? (options.panX ?? 0) : 0;
  const panY = Number.isFinite(options.panY) ? (options.panY ?? 0) : 0;

  if (zoom !== 1 || panX !== 0 || panY !== 0) {
    const baseScale = projection.scale();
    const [baseTx, baseTy] = projection.translate();
    const cx = (innerLeft + innerRight) / 2;
    const cy = (innerTop + innerBottom) / 2;
    projection
      .scale(baseScale * zoom)
      .translate([cx + (baseTx - cx) * zoom + panX, cy + (baseTy - cy) * zoom + panY]);
  }

  return projection;
}

/**
 * Converte coordenadas de tela `(x, y)` em `[lng, lat]` com validação de ida e volta
 * para impedir falsos positivos fora do disco da projeção (ex.: fora da elipse Equal Earth
 * ou do círculo Azimutal).
 */
export function invertMapPoint(
  projection: GeoProjection,
  id: MapProjectionId,
  x: number,
  y: number
): [number, number] | null {
  if (!projection.invert || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const inverted = projection.invert([x, y]);
  if (!inverted) return null;
  const [lng, lat] = inverted;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180.001 || lng > 180.001 || lat < -90 || lat > 90) return null;
  if (id === "mercator" && Math.abs(lat) > 83) return null;

  const roundTrip = projection([lng, lat]);
  if (!roundTrip) return null;
  const dx = roundTrip[0] - x;
  const dy = roundTrip[1] - y;
  if (dx * dx + dy * dy > 9) return null;

  return [Math.max(-180, Math.min(180, lng)), Math.max(-90, Math.min(90, lat))];
}

/**
 * Resolve o código ISO-3 ou entidade histórica de uma feature TopoJSON usando a
 * regra de zero-padding (`padStart(3, "0")`) e o mapeamento canônico do globo 3D.
 */
export function resolveTopologyFeatureIso(
  feature: CountryProperties | null | undefined,
  effectiveYear: number | null
): string | null {
  if (!feature) return null;
  const rawId = feature.id ?? feature.iso;
  const numId =
    rawId !== undefined && rawId !== null ? String(rawId).padStart(3, "0") : "";
  const name = feature.name;

  const matchedIso =
    (rawId && HISTORICAL_ENTITIES[String(rawId)] ? String(rawId) : undefined) ||
    NUMERIC_TO_ISO[numId] ||
    (name && NAME_TO_ISO[name]) ||
    (rawId != null ? String(rawId) : null);

  if (!matchedIso) return null;
  return resolveHistoricalEntity(matchedIso, effectiveYear) || matchedIso;
}

export interface Picked2dResult {
  iso: string | null;
  lat: number;
  lng: number;
}

/** Picking instantâneo (<0,2 ms) no mapa 2D sincronizado com o índice `which-polygon`. */
export function pickCountryAt2dPoint(
  projection: GeoProjection,
  projectionId: MapProjectionId,
  x: number,
  y: number,
  spatialIndex: CountrySpatialIndex | null,
  effectiveYear: number | null
): Picked2dResult | null {
  const coords = invertMapPoint(projection, projectionId, x, y);
  if (!coords) return null;
  const [lng, lat] = coords;
  const hit = spatialIndex ? spatialIndex([lng, lat]) : null;
  return {
    iso: resolveTopologyFeatureIso(hit, effectiveYear),
    lat,
    lng,
  };
}

/**
 * Mede a área projetada (px²) de um pequeno quadrado geodésico de mesma área física
 * em torno de `(lng, lat)` para verificação matemática de distorção (ex.: Groenlândia vs. Equador).
 */
export function measureProjectedEqualAreaPatch(
  projection: GeoProjection,
  lng: number,
  lat: number,
  halfLatDeg = 1.0
): number | null {
  const cosLat = Math.max(0.05, Math.cos((lat * Math.PI) / 180));
  const halfLngDeg = halfLatDeg / cosLat;
  const p0 = projection([lng - halfLngDeg, lat - halfLatDeg]);
  const p1 = projection([lng + halfLngDeg, lat - halfLatDeg]);
  const p2 = projection([lng + halfLngDeg, lat + halfLatDeg]);
  const p3 = projection([lng - halfLngDeg, lat + halfLatDeg]);
  if (!p0 || !p1 || !p2 || !p3) return null;
  const area2 =
    p0[0] * p1[1] - p1[0] * p0[1] +
    p1[0] * p2[1] - p2[0] * p1[1] +
    p2[0] * p3[1] - p3[0] * p2[1] +
    p3[0] * p0[1] - p0[0] * p3[1];
  return Math.abs(area2) / 2;
}

export const WORLD_GRATICULE = geoGraticule10();
export const WORLD_SPHERE_OBJECT = WORLD_SPHERE;
