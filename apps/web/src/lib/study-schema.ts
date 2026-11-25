import { z } from "zod";
import {
  CHOROPLETH_INDICATOR_IDS,
  CHOROPLETH_MAX_YEAR,
  CHOROPLETH_MIN_YEAR,
  isTemporalChoroplethIndicator,
} from "./choropleth";
import { HISTORICAL_ENTITIES, HISTORICAL_ERAS } from "./historical-entities";
import { HISTORICAL_ROUTES } from "./historical-routes";
import { PILOT_COUNTRIES, WORLD_COUNTRIES_CATALOG } from "./country-data";
import { TIMELINE_MAX_YEAR, TIMELINE_MIN_YEAR, VALID_CELESTIAL_BODIES } from "./cosmos-validation";
import type { ObservatoryLayer } from "./observatory-data";
import { GIBS_PRODUCT_IDS, isGibsMonthFor, isGibsProductId } from "./gibs";
import {
  DEFAULT_MAP_PROJECTION,
  MAP_PROJECTION_IDS,
  isMapProjectionId,
} from "./map-projections-types";
import { normalizeStudyEpoch, MAX_STUDY_GEOLOGICAL_MA } from "./study-epoch";
import { ALL_COSMIC_LAYERS } from "../stores/cosmicStore";
import { MAX_CAMERA_ALTITUDE, MIN_CAMERA_ALTITUDE } from "../stores/globeStore";
import {
  DEFAULT_TIMELINE_END_YEAR,
  DEFAULT_TIMELINE_START_YEAR,
} from "./timeline/current-year";
import { ALL_CATEGORIES } from "../stores/timelineStore";
import type { StudyRecord } from "./studies-store";

export const MAX_STUDY_SLUG_LENGTH = 128;
export const MAX_STUDY_TITLE_LENGTH = 200;
export const MAX_STUDY_DESCRIPTION_LENGTH = 2000;
export const MAX_STUDY_NOTES_LENGTH = 50000;
export const MAX_STUDY_ITEMS = 50;
const DEFAULT_START_YEAR = DEFAULT_TIMELINE_START_YEAR;
const DEFAULT_END_YEAR = DEFAULT_TIMELINE_END_YEAR;
const country = z.enum([
  ...new Set([
    ...Object.keys(WORLD_COUNTRIES_CATALOG),
    ...Object.keys(PILOT_COUNTRIES),
    ...Object.keys(HISTORICAL_ENTITIES),
  ]),
]);
const category = z.enum(ALL_CATEGORIES);
const era = z.enum(Object.keys(HISTORICAL_ERAS));
const route = z.string().trim().pipe(z.enum(Object.keys(HISTORICAL_ROUTES)));
const body = z.enum([...VALID_CELESTIAL_BODIES]);
const cosmicLayer = z.enum(ALL_COSMIC_LAYERS);
const choroplethIndicator = z.enum(CHOROPLETH_INDICATOR_IDS);
const choroplethYear = z.number().int().min(CHOROPLETH_MIN_YEAR).max(CHOROPLETH_MAX_YEAR);
const observatoryLayer = z.enum([
  "NASA_FIRMS",
  "NASA_EONET",
  "ISS_SATELLITES",
  "FLIGHTS_OPENSKY",
  "MARITIME_ROUTES",
  "NASA_GIBS",
  "GLOBAL_WINDS",
  "MARINE_DEBRIS",
  "INPE_DEFORESTATION",
  "BIOMES_MAP",
  "SPECIES_MAP",
] satisfies ObservatoryLayer[]);
const gibsProduct = z.enum(GIBS_PRODUCT_IDS);
const gibsMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const mapViewMode = z.enum(["3d", "2d"]);
const mapProjection = z.enum(MAP_PROJECTION_IDS);
const year = z.number().int().min(TIMELINE_MIN_YEAR).max(TIMELINE_MAX_YEAR);
const latitude = z.number().min(-90).max(90);
const longitude = z.number().min(-180).max(180);
const altitude = z.number().min(MIN_CAMERA_ALTITUDE).max(MAX_CAMERA_ALTITUDE);
const slug = z.string().max(MAX_STUDY_SLUG_LENGTH).regex(/^[A-Za-z0-9_-]+$/);

export const studyInput = z.object({
  parentId: slug.nullish(),
  title: z.string().max(MAX_STUDY_TITLE_LENGTH).optional(),
  description: z.string().max(MAX_STUDY_DESCRIPTION_LENGTH).nullish(),
  markdownNotes: z.string().max(MAX_STUDY_NOTES_LENGTH).nullish(),
  timelineStartYear: year.optional(),
  timelineEndYear: year.optional(),
  cameraLat: latitude.optional(),
  cameraLng: longitude.optional(),
  cameraAltitude: altitude.optional(),
  selectedCountryIsos: z.array(country).max(MAX_STUDY_ITEMS).optional(),
  activeCategories: z.array(category).max(MAX_STUDY_ITEMS).optional(),
  activeObservatoryLayers: z.array(observatoryLayer).max(MAX_STUDY_ITEMS).optional(),
  activeCosmicLayers: z.array(cosmicLayer).max(MAX_STUDY_ITEMS).optional(),
  historicalEra: era.nullish(),
  activeRouteId: route.nullish(),
  focusedCelestialBody: body.nullish(),
  geologicalMa: z.number().min(0).max(MAX_STUDY_GEOLOGICAL_MA).nullish(),
  isApollo11Active: z.boolean().nullish(),
  isCosmicMode: z.boolean().nullish(),
  choroplethIndicator: choroplethIndicator.nullish(),
  choroplethYear: choroplethYear.nullish(),
  gibsProduct: gibsProduct.nullish(),
  gibsMonth: gibsMonth.nullish(),
  mapViewMode: mapViewMode.nullish(),
  mapProjection: mapProjection.nullish(),
}).refine(
  ({ timelineStartYear, timelineEndYear }) =>
    timelineStartYear === undefined || timelineEndYear === undefined || timelineStartYear <= timelineEndYear,
  { path: ["timelineEndYear"], message: "End year must be on or after start year" },
);

function valid<T>(schema: z.ZodType<T>, input: unknown): T | undefined {
  const parsed = schema.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}

function knownItems<T>(schema: z.ZodType<T>, input: unknown): T[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, MAX_STUDY_ITEMS).flatMap((item) => {
    const value = valid(schema, item);
    return value === undefined ? [] : [value];
  });
}

export function sanitizeStudy(input: Partial<Omit<StudyRecord, "createdAt">>) {
  const start = valid(year, input.timelineStartYear);
  const end = valid(year, input.timelineEndYear);
  const activeRouteId = valid(route, input.activeRouteId);
  const routeDefinition = activeRouteId ? HISTORICAL_ROUTES[activeRouteId] : undefined;
  const defaultStart = routeDefinition?.startYear ?? DEFAULT_START_YEAR;
  const defaultEnd = routeDefinition?.endYear ?? DEFAULT_END_YEAR;
  const firstYear = start ?? Math.min(defaultStart, end ?? defaultEnd);
  const lastYear = end ?? Math.max(defaultEnd, firstYear);
  const timelineEndYear = Math.max(firstYear, lastYear);
  const epoch = normalizeStudyEpoch({
    timelineEndYear,
    geologicalMa: input.geologicalMa,
    historicalEra: valid(era, input.historicalEra),
    activeRouteId,
    isApollo11Active: input.isApollo11Active,
    activeObservatoryLayers: knownItems(observatoryLayer, input.activeObservatoryLayers),
  });
  // Produto e mês do GIBS só valem com a camada ligada; mês sem produto válido é descartado.
  const product =
    epoch.activeObservatoryLayers.includes("NASA_GIBS") && isGibsProductId(input.gibsProduct) ? input.gibsProduct : null;
  const gibs = {
    gibsProduct: product,
    gibsMonth: product && isGibsMonthFor(product, input.gibsMonth) ? input.gibsMonth : null,
  };

  const isCosmicMode = Boolean(input.isCosmicMode);
  const resolvedMapViewMode = !isCosmicMode && input.mapViewMode === "2d" ? "2d" : null;
  const resolvedMapProjection =
    resolvedMapViewMode === "2d"
      ? isMapProjectionId(input.mapProjection)
        ? input.mapProjection
        : DEFAULT_MAP_PROJECTION
      : null;

  const resolvedChoroplethIndicator = valid(choroplethIndicator, input.choroplethIndicator) ?? null;
  const resolvedChoroplethYear =
    !isCosmicMode &&
    resolvedChoroplethIndicator &&
    isTemporalChoroplethIndicator(resolvedChoroplethIndicator)
      ? (valid(choroplethYear, input.choroplethYear) ?? null)
      : null;

  return {
    parentId: valid(slug, input.parentId) ?? null,
    title: input.title || "Estudo Planetário",
    description: input.description ?? "",
    markdownNotes: input.markdownNotes ?? "",
    timelineStartYear: Math.min(firstYear, lastYear),
    timelineEndYear,
    cameraLat: valid(latitude, input.cameraLat) ?? 0,
    cameraLng: valid(longitude, input.cameraLng) ?? 0,
    cameraAltitude: valid(altitude, input.cameraAltitude) ?? 2.5,
    selectedCountryIsos: knownItems(country, input.selectedCountryIsos),
    activeCategories: knownItems(category, input.activeCategories),
    ...epoch,
    isCosmicMode,
    focusedCelestialBody: valid(body, input.focusedCelestialBody) ?? null,
    activeCosmicLayers: knownItems(cosmicLayer, input.activeCosmicLayers),
    choroplethIndicator: resolvedChoroplethIndicator,
    choroplethYear: resolvedChoroplethYear,
    ...gibs,
    mapViewMode: resolvedMapViewMode,
    mapProjection: resolvedMapProjection,
  };
}
