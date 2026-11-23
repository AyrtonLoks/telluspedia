import { create } from "zustand";
import { DEFAULT_LOCALE, type Locale, type MessageDictionary } from "@/lib/i18n/types";
import { readStoredLocale, writeStoredLocale } from "@/lib/i18n/format";

let enDictCache: MessageDictionary | null = null;
let enDictPromise: Promise<MessageDictionary> | null = null;

/** Carrega o dicionário `en` sob demanda (mantém o chunk inicial `/` < 160 kB em `pt-BR`). */
export function loadEnMessages(): Promise<MessageDictionary> {
  if (enDictCache) return Promise.resolve(enDictCache);
  enDictPromise ??= import("@/lib/i18n/en").then((m) => {
    enDictCache = m.EN_MESSAGES;
    return enDictCache;
  });
  return enDictPromise;
}

/** Pré-carrega o dicionário inglês no hover/foco do seletor de idioma para troca sem piscar. */
export function preloadEnMessages(): void {
  void loadEnMessages().catch(() => {});
}

interface LocaleState {
  locale: Locale;
  /** Dicionário ativo para `en` (null enquanto em `pt-BR` ou antes de carregar `en`). */
  enMessages: MessageDictionary | null;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  hydrateFromStorage: () => void;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: DEFAULT_LOCALE,
  enMessages: null,

  setLocale: (locale) => {
    writeStoredLocale(locale);
    if (locale === "pt-BR") {
      set({ locale: "pt-BR" });
      return;
    }
    if (enDictCache) {
      set({ locale: "en", enMessages: enDictCache });
      return;
    }
    // Atualiza o locale imediatamente e injeta o dicionário assim que o chunk dinâmico resolver
    set({ locale: "en" });
    void loadEnMessages()
      .then((dict) => {
        if (get().locale === "en") set({ enMessages: dict });
      })
      .catch(() => {});
  },

  toggleLocale: () => {
    const next: Locale = get().locale === "pt-BR" ? "en" : "pt-BR";
    get().setLocale(next);
  },

  hydrateFromStorage: () => {
    const stored = readStoredLocale();
    if (typeof document !== "undefined") {
      document.documentElement.lang = stored;
    }
    if (stored === "en") {
      get().setLocale("en");
    }
  },
}));
