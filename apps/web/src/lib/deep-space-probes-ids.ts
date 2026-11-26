/**
 * Identificadores canônicos das sondas do espaço profundo no Modo Cosmos (D41).
 * Isolado do catálogo astrofísico para manter `cosmicStore.ts` enxuto no First Load JS de `/` (T25).
 */

export const DEEP_SPACE_PROBE_IDS = [
  "VOYAGER_1",
  "VOYAGER_2",
  "NEW_HORIZONS",
  "JWST",
] as const;

export type DeepSpaceProbeId = (typeof DEEP_SPACE_PROBE_IDS)[number];

export function isDeepSpaceProbeId(value: unknown): value is DeepSpaceProbeId {
  return (
    typeof value === "string" &&
    (DEEP_SPACE_PROBE_IDS as readonly string[]).includes(value)
  );
}
