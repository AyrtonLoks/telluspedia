/**
 * Resolução da época ativa (T12) — função PURA, fonte única para globo, bordas, Lua,
 * timeline, Observatório e estudos.
 *
 * Precedência:
 *   1. Geológico — modo GEOLOGICAL, idade (Ma) > 0 na timeline ou no estudo, ou marco geológico
 *      selecionado. Nesse caso não há cena nem telemetria contemporânea.
 *   2. Cena explícita — Magalhães (rota ativa em qualquer store, ou marco da expedição) e, depois,
 *      Apollo 11 (marco da missão ou estudo restaurado com a cena). Cenas NUNCA são ativadas só
 *      pelo ano: o playback passando por 1519 ou 1969 não as liga.
 *   3. Ano — ano efetivo (ano selecionado > ano do marco > ano representativo do intervalo) e a
 *      era histórica correspondente.
 */
import { resolveEffectiveHistoricalYear, resolveHistoricalEra, type HistoricalEraId } from "../historical-entities";
import {
  APOLLO11_MILESTONE_IDS,
  DEFAULT_GEOLOGICAL_MA,
  GEOLOGICAL_MILESTONE_MA,
  MAGELLAN_MILESTONE_IDS,
  MAGELLAN_ROUTE_ID,
  SPACE_AGE_START_YEAR,
  isGeologicalMilestoneId,
  type EpochMode,
  type EpochScene,
} from "./constants";

export interface EpochInput {
  selectedYear?: number | null;
  selectedMilestoneId?: string | null;
  /** Ano do marco selecionado (o chamador resolve com findMilestoneById). */
  milestoneYear?: number | null;
  startYear?: number | null;
  endYear?: number | null;
  timelineMode?: "HISTORICAL" | "GEOLOGICAL" | null;
  geologicalMa?: number | null;
  selectedGeologicalMa?: number | null;
  /** Rotas ativas em timelineStore (activeRouteId/selectedRouteId) e historicalRouteStore. */
  routeIds?: ReadonlyArray<string | null | undefined>;
  study?: {
    geologicalMa?: number | null;
    activeRouteId?: string | null;
    isApollo11Active?: boolean | null;
  } | null;
}

export interface EpochState {
  mode: EpochMode;
  /** Ano de referência; null = presente (nenhum ano/intervalo histórico selecionado). */
  effectiveYear: number | null;
  /** Idade geológica em Ma quando mode === "GEOLOGICAL"; senão null. */
  geologicalMa: number | null;
  /** Era histórica (HISTORICAL_ERAS). "CONTEMPORARY" no presente e no modo geológico. */
  historicalEraId: HistoricalEraId;
  activeScene: EpochScene | null;
  /** Telemetria contemporânea (Observatório) faz sentido nesta época. */
  isContemporary: boolean;
}

const positiveMa = (v: number | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

function resolveGeologicalMa(input: EpochInput): number | null {
  const milestoneMa = isGeologicalMilestoneId(input.selectedMilestoneId)
    ? GEOLOGICAL_MILESTONE_MA[input.selectedMilestoneId]
    : null;
  const explicit =
    positiveMa(input.selectedGeologicalMa) ??
    positiveMa(input.geologicalMa) ??
    milestoneMa ??
    positiveMa(input.study?.geologicalMa);
  if (explicit !== null) return explicit;
  return input.timelineMode === "GEOLOGICAL" ? DEFAULT_GEOLOGICAL_MA : null;
}

function resolveScene(input: EpochInput): EpochScene | null {
  const milestone = input.selectedMilestoneId ?? null;
  const routes = [...(input.routeIds ?? []), input.study?.activeRouteId];
  if (routes.includes(MAGELLAN_ROUTE_ID) || (milestone !== null && MAGELLAN_MILESTONE_IDS.includes(milestone))) {
    return "MAGELLAN";
  }
  if ((milestone !== null && APOLLO11_MILESTONE_IDS.includes(milestone)) || input.study?.isApollo11Active) {
    return "APOLLO11";
  }
  return null;
}

export function resolveEpoch(input: EpochInput): EpochState {
  const effectiveYear = resolveEffectiveHistoricalYear({
    selectedYear: input.selectedYear ?? null,
    milestoneYear: input.milestoneYear ?? null,
    startYear: input.startYear ?? null,
    endYear: input.endYear ?? null,
  });

  const geologicalMa = resolveGeologicalMa(input);
  if (geologicalMa !== null) {
    return {
      mode: "GEOLOGICAL",
      effectiveYear,
      geologicalMa,
      historicalEraId: "CONTEMPORARY",
      activeScene: null,
      isContemporary: false,
    };
  }

  const activeScene = resolveScene(input);
  const historicalEraId = resolveHistoricalEra(effectiveYear).id;
  const beforeSpaceAge = effectiveYear !== null && effectiveYear < SPACE_AGE_START_YEAR;
  const isContemporary = !beforeSpaceAge && activeScene !== "MAGELLAN";
  const mode: EpochMode =
    historicalEraId !== "CONTEMPORARY" || activeScene === "MAGELLAN" ? "HISTORICAL" : "CONTEMPORARY";

  return { mode, effectiveYear, geologicalMa: null, historicalEraId, activeScene, isContemporary };
}
