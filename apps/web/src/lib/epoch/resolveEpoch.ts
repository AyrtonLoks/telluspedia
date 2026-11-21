/**
 * Resolução da época ativa (T12) — função PURA, fonte única para globo, bordas, Lua,
 * timeline, Observatório e estudos.
 *
 * Precedência:
 *   1. Geológico — idade (Ma) > 0 na timeline ou marco geológico
 *      selecionado. Nesse caso não há cena nem telemetria contemporânea.
 *   2. Cena explícita (D12d) — a rota ativa ou o marco selecionado, quando abre uma cena com
 *      trajetória nos dados (`src/data/scenes/`). Cenas NUNCA são ativadas só pelo ano.
 *   3. Ano — ano efetivo (ano selecionado > ano do marco > ano representativo do intervalo) e a
 *      era histórica correspondente.
 */
import { resolveEffectiveHistoricalYear, resolveHistoricalEra, type HistoricalEraId } from "../historical-eras";
import { GEOLOGICAL_MILESTONE_MA, SPACE_AGE_START_YEAR, isGeologicalMilestoneId, type EpochMode } from "./constants";
import { getScene, isPlayableScene, sceneOpenedBy, sceneStartYear } from "../scenes/catalog";

export interface EpochInput {
  selectedYear?: number | null;
  selectedMilestoneId?: string | null;
  /** Ano do marco selecionado (o chamador resolve com findMilestoneById). */
  milestoneYear?: number | null;
  startYear?: number | null;
  endYear?: number | null;
  geologicalMa?: number | null;
  /** Cena aberta explicitamente (store de cenas). */
  activeSceneId?: string | null;
}

export interface EpochState {
  mode: EpochMode;
  /** Ano de referência; null = presente (nenhum ano/intervalo histórico selecionado). */
  effectiveYear: number | null;
  /** Idade geológica em Ma quando mode === "GEOLOGICAL"; senão null. */
  geologicalMa: number | null;
  /** Era histórica (HISTORICAL_ERAS). "CONTEMPORARY" no presente e no modo geológico. */
  historicalEraId: HistoricalEraId;
  /** Id da cena ativa (dados em `src/data/scenes/`), ou null. */
  activeScene: string | null;
  /** Telemetria contemporânea (Observatório) faz sentido nesta época. */
  isContemporary: boolean;
}

const positiveMa = (v: number | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;

function resolveGeologicalMa(input: EpochInput): number | null {
  const milestoneMa = isGeologicalMilestoneId(input.selectedMilestoneId)
    ? GEOLOGICAL_MILESTONE_MA[input.selectedMilestoneId]
    : null;
  return positiveMa(input.geologicalMa) ?? milestoneMa;
}

function resolveScene(input: EpochInput): string | null {
  const open = input.activeSceneId ? getScene(input.activeSceneId) : undefined;
  if (isPlayableScene(open)) return open.id;
  return sceneOpenedBy(input.selectedMilestoneId)?.id ?? null;
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
  // Cena anterior à Era Espacial é histórica, mesmo que o ano da timeline seja outro.
  const scene = activeScene ? getScene(activeScene) : undefined;
  const sceneBeforeSpaceAge = scene !== undefined && sceneStartYear(scene) < SPACE_AGE_START_YEAR;
  const isContemporary = !beforeSpaceAge && !sceneBeforeSpaceAge;
  const mode: EpochMode = historicalEraId !== "CONTEMPORARY" || sceneBeforeSpaceAge ? "HISTORICAL" : "CONTEMPORARY";

  return { mode, effectiveYear, geologicalMa: null, historicalEraId, activeScene, isContemporary };
}
