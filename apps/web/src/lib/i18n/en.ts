import type { MessageDictionary } from "./types";
import { EN_SHELL_MESSAGES } from "./en-shell";
import { EN_PANEL_MESSAGES } from "./en-panels";
import { EN_PANEL_STUDY_MESSAGES } from "./en-panels-study";
import { EN_COUNTRY_META_MESSAGES } from "./en-country-meta";
import { EN_TELLUSLAB_MESSAGES } from "./en-telluslab";
import { EN_TRANSVERSAL_MESSAGES } from "./en-transversal";
import { EN_INFRA_AQI_MESSAGES } from "./en-infra-aqi";
import { EN_ECLIPSES_PROBES_MESSAGES } from "./en-eclipses-probes";

/**
 * Dicionário inglês (`en`) carregado sob demanda (lazy import) apenas quando `locale === "en"`,
 * preservando o orçamento `< 160 kB` do First Load JS de `/` em `pt-BR`.
 */
export const EN_MESSAGES = {
  ...EN_SHELL_MESSAGES,
  ...EN_PANEL_MESSAGES,
  ...EN_PANEL_STUDY_MESSAGES,
  ...EN_COUNTRY_META_MESSAGES,
  ...EN_TELLUSLAB_MESSAGES,
  ...EN_TRANSVERSAL_MESSAGES,
  ...EN_INFRA_AQI_MESSAGES,
  ...EN_ECLIPSES_PROBES_MESSAGES,
} as const satisfies MessageDictionary;

export type EnMessageKey = keyof typeof EN_MESSAGES;
