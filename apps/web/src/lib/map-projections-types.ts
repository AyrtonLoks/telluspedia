/**
 * Tipos e helpers ultraleves do Modo 2D & Projeções Cartográficas Comparativas (D33).
 *
 * Mantido estritamente sem imports de `d3-geo` ou TopoJSON para preservar o orçamento
 * de First Load JS de `/` (`< 160 KiB` gzip — T25/T35).
 */

export type MapViewMode = "3d" | "2d";

export const DEFAULT_MAP_VIEW_MODE: MapViewMode = "3d";

export const MAP_PROJECTION_IDS = [
  "equal-earth",
  "mercator",
  "natural-earth",
  "azimuthal",
] as const;

export type MapProjectionId = (typeof MAP_PROJECTION_IDS)[number];

export const DEFAULT_MAP_PROJECTION: MapProjectionId = "equal-earth";

export const MAP_PROJECTION_SHORT_LABELS: Record<MapProjectionId, string> = {
  "equal-earth": "Equal Earth",
  mercator: "Mercator",
  "natural-earth": "Natural Earth",
  azimuthal: "Azimutal",
};

export const MAP_PROJECTION_SHORT_LABELS_EN: Record<MapProjectionId, string> = {
  "equal-earth": "Equal Earth",
  mercator: "Mercator",
  "natural-earth": "Natural Earth",
  azimuthal: "Azimuthal",
};

export function isMapViewMode(value: unknown): value is MapViewMode {
  return value === "3d" || value === "2d";
}

export function isMapProjectionId(value: unknown): value is MapProjectionId {
  return (
    typeof value === "string" &&
    (MAP_PROJECTION_IDS as readonly string[]).includes(value)
  );
}

export interface DecodedMapView {
  viewMode: MapViewMode;
  projectionId: MapProjectionId;
}

export function readMapView(
  modeParam: string | null | undefined,
  projectionParam: string | null | undefined
): DecodedMapView {
  const viewMode: MapViewMode = modeParam === "2d" ? "2d" : DEFAULT_MAP_VIEW_MODE;
  const projectionId: MapProjectionId = isMapProjectionId(projectionParam)
    ? projectionParam
    : DEFAULT_MAP_PROJECTION;
  return { viewMode, projectionId };
}
