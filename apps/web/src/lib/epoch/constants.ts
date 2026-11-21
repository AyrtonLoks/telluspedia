/**
 * Fonte única dos IDs de marcos, rotas e cenas especiais da linha do tempo (T12).
 * Componentes não devem comparar strings mágicas: usem estas constantes ou `resolveEpoch`.
 */

/** Marcos do eixo geológico → idade em milhões de anos. */
export const GEOLOGICAL_MILESTONE_MA = {
  "pangea-250ma": 250,
  "breakup-200ma": 200,
  "gondwana-150ma": 150,
  "kpg-66ma": 66,
} as const;

export type GeologicalMilestoneId = keyof typeof GEOLOGICAL_MILESTONE_MA;

export const GEOLOGICAL_MILESTONE_IDS = {
  PANGEA: "pangea-250ma",
  BREAKUP: "breakup-200ma",
  GONDWANA: "gondwana-150ma",
  KPG: "kpg-66ma",
  /** Nó "Hoje" do eixo geológico: volta para a geografia contemporânea. */
  CONTEMPORARY: "contemporary-0ma",
} as const;

/** Idade usada quando o modo geológico está ativo sem uma idade explícita. */
export const DEFAULT_GEOLOGICAL_MA = 250;

/** Rota da circum-navegação de Magalhães (1519–1522). */
export const MAGELLAN_ROUTE_ID = "magellan-1519";
/** Marco da partida da expedição (Sanlúcar de Barrameda, 1519). */
export const MAGELLAN_DEPARTURE_MILESTONE_ID = "esp-1519";
/** Marco global da Apollo 11 (usado ao restaurar estudos com a cena ativa). */
export const APOLLO11_GLOBAL_MILESTONE_ID = "glo-1969";

/** Início da Era Espacial (Sputnik 1): antes disso não há telemetria contemporânea. */
export const SPACE_AGE_START_YEAR = 1957;

export type EpochMode = "CONTEMPORARY" | "HISTORICAL" | "GEOLOGICAL";

export function isGeologicalMilestoneId(id: string | null | undefined): id is GeologicalMilestoneId {
  return !!id && Object.prototype.hasOwnProperty.call(GEOLOGICAL_MILESTONE_MA, id);
}
