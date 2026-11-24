/**
 * Fonte única do ano corrente e da janela padrão da Linha do Tempo (T48).
 * Usa ano UTC para consistência entre SSR e hidratação no cliente, com piso mínimo
 * de 2026 para não regredir em ambientes com relógio antigo.
 */
export const MIN_CURRENT_YEAR = 2026;
export const DEFAULT_TIMELINE_SPAN = 50;
export const TWENTY_FIRST_CENTURY_START_YEAR = 2000;

export function getCurrentYear(now: Date = new Date()): number {
  const utcYear = now.getUTCFullYear();
  return Number.isFinite(utcYear) && utcYear >= MIN_CURRENT_YEAR ? utcYear : MIN_CURRENT_YEAR;
}

export const CURRENT_YEAR = getCurrentYear();
export const DEFAULT_TIMELINE_END_YEAR = CURRENT_YEAR;
export const DEFAULT_TIMELINE_START_YEAR = CURRENT_YEAR - DEFAULT_TIMELINE_SPAN;
export const TIMELINE_INPUT_MAX_YEAR = Math.max(CURRENT_YEAR + 10, 2030);
