import type { EpochState } from "@/lib/epoch/resolveEpoch";
import type { HistoricalEraId } from "@/lib/historical-eras";

/**
 * Mapeia eras históricas do seletor único de época (`useEpochState`) para o
 * identificador de entidade correspondente no manifesto do TellusBridge (`era:*`).
 *
 * Mantido sem importar o catálogo JSON do TellusBridge para preservar o orçamento
 * de bundle inicial da home (T25); o teste `minor-cleanups.test.ts` garante que
 * todos os IDs mapeados existem no manifesto.
 */
export const ERA_STUDY_ENTITY_IDS: Partial<Record<HistoricalEraId, string>> = {
  PRUSSIA_1870: "era:PRUSSIA_1870",
  WW1_1914: "era:WW1_1914",
  WW2_1939: "era:WW2_1939",
  COLD_WAR_1969: "era:COLD_WAR",
};

/**
 * Deriva o `entityId` de contexto de estudo (TellusBridge) para a época ativa da timeline.
 * Retorna `null` em épocas geológicas, contemporâneas ou sem vínculo curricular de era.
 */
export function resolveEraStudyEntityId(
  epoch: Pick<EpochState, "mode" | "historicalEraId">
): string | null {
  if (epoch.mode !== "HISTORICAL") return null;
  return ERA_STUDY_ENTITY_IDS[epoch.historicalEraId] ?? null;
}
