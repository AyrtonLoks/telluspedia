import { isContemporaryEpoch } from "./observatory-data";
import { MAGELLAN_ROUTE_ID } from "./epoch/constants";

const ANACHRONISTIC_ERAS = new Set(["PRUSSIA_1870", "WW1_1914", "WW2_1939"]);
/** @deprecated use MAGELLAN_ROUTE_ID de lib/epoch/constants. */
export const MAGELLAN_STUDY_ROUTE = MAGELLAN_ROUTE_ID;
export const MAX_STUDY_GEOLOGICAL_MA = 4600;

interface StudyEpochInput {
  timelineEndYear?: number | null;
  geologicalMa?: number | null;
  historicalEra?: string | null;
  isApollo11Active?: boolean | null;
  activeRouteId?: string | null;
  activeObservatoryLayers?: string[] | null;
}

export function normalizeStudyEpoch(input: StudyEpochInput) {
  const ma = input.geologicalMa;
  const geologicalMa =
    typeof ma === "number" && Number.isFinite(ma) && ma > 0 && ma <= MAX_STUDY_GEOLOGICAL_MA ? ma : null;
  const activeRouteId = input.activeRouteId?.trim() || null;
  const contemporary =
    isContemporaryEpoch(input.timelineEndYear ?? null, geologicalMa) &&
    activeRouteId !== MAGELLAN_STUDY_ROUTE &&
    !ANACHRONISTIC_ERAS.has(input.historicalEra ?? "");

  return {
    geologicalMa,
    activeRouteId,
    historicalEra: geologicalMa === null ? input.historicalEra ?? null : null,
    isApollo11Active: geologicalMa === null && Boolean(input.isApollo11Active),
    activeObservatoryLayers:
      contemporary && Array.isArray(input.activeObservatoryLayers) ? [...input.activeObservatoryLayers] : [],
  };
}
