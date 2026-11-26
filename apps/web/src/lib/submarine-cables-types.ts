export type CableBasinId = "atlantic" | "pacific" | "indo-eurasian" | "afro-eurasian";
export type CableBasinFilter = "all" | CableBasinId;

export const CABLE_BASIN_FILTERS: readonly CableBasinFilter[] = [
  "all",
  "atlantic",
  "pacific",
  "indo-eurasian",
  "afro-eurasian",
] as const;

export const DEFAULT_CABLE_BASIN_FILTER: CableBasinFilter = "all";
export const DEFAULT_SHOW_CABLE_CHOKE_POINTS = true;

export function isCableBasinFilter(v: string | null | undefined): v is CableBasinFilter {
  if (!v) return false;
  return (CABLE_BASIN_FILTERS as readonly string[]).includes(v);
}

export interface CableLandingPoint {
  name: string;
  countryIso: string;
  lat: number;
  lng: number;
}

export interface CableChokePoint {
  id: string;
  namePt: string;
  nameEn: string;
  lat: number;
  lng: number;
  cableCount: number;
  summaryPt: string;
  summaryEn: string;
}

export interface SubmarineCableSystem {
  id: string;
  name: string;
  rfsYear: number;
  lengthKm: number;
  designCapacityTbps: number;
  owners: string;
  basin: CableBasinId;
  chokePoints: string[];
  officialUrl: string;
  landingPoints: CableLandingPoint[];
  /** Polilinhas oceânicas em `[lng, lat][]` (separadas no antimeridiano ±180°). */
  segments: Array<Array<[number, number]>>;
}

export interface SubmarineCablesDataset {
  metadata: {
    source: string;
    license: string;
    sourceUrl: string;
    referenceYear: number;
  };
  chokePoints: CableChokePoint[];
  cables: SubmarineCableSystem[];
}

export function encodeCablesView(
  basin: CableBasinFilter,
  showChokePoints: boolean
): string {
  return `${basin},${showChokePoints ? "1" : "0"}`;
}

export function readCablesView(
  raw: string | null | undefined
): { basin: CableBasinFilter; showChokePoints: boolean } | null {
  if (!raw) return null;
  const [basin, choke] = raw.split(",");
  if (!isCableBasinFilter(basin)) return null;
  return {
    basin,
    showChokePoints: choke !== "0",
  };
}
