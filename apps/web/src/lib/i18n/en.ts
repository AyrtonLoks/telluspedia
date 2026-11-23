import type { MessageDictionary } from "./types";
import { EN_SHELL_MESSAGES } from "./en-shell";
import { EN_PANEL_MESSAGES } from "./en-panels";
import { EN_COUNTRY_META_MESSAGES } from "./en-country-meta";
import { EN_TELLUSLAB_MESSAGES } from "./en-telluslab";

/**
 * Dicionário inglês (`en`) carregado sob demanda (lazy import) apenas quando `locale === "en"`,
 * preservando o orçamento `< 160 kB` do First Load JS de `/` em `pt-BR`.
 */
export const EN_MESSAGES = {
  ...EN_SHELL_MESSAGES,
  ...EN_PANEL_MESSAGES,
  ...EN_COUNTRY_META_MESSAGES,
  ...EN_TELLUSLAB_MESSAGES,
} as const satisfies MessageDictionary;

export type EnMessageKey = keyof typeof EN_MESSAGES;
