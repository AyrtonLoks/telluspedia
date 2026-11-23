"use client";

import { useCallback } from "react";
import { useLocaleStore } from "@/stores/localeStore";
import type { EnMessageKey } from "./en";
import type { Locale } from "./types";

export type TranslateFn = (key: EnMessageKey, ptFallback: string) => string;

/**
 * Hook leve de tradução reativa (`pt-BR` / `en`):
 * - Em `pt-BR` (padrão e SSR), devolve `ptFallback` diretamente com custo zero de dicionário.
 * - Em `en`, consulta o dicionário carregado sob demanda via `useLocaleStore`.
 */
export function useI18n(): { locale: Locale; t: TranslateFn } {
  const storeLocale = useLocaleStore((s) => s.locale);
  const storeEnMessages = useLocaleStore((s) => s.enMessages);
  const isServer = typeof window === "undefined";
  const locale = isServer ? useLocaleStore.getState().locale : storeLocale;
  const enMessages = isServer ? useLocaleStore.getState().enMessages : storeEnMessages;

  const t = useCallback<TranslateFn>(
    (key, ptFallback) => {
      if (locale === "en" && enMessages) {
        return enMessages[key] ?? ptFallback;
      }
      return ptFallback;
    },
    [locale, enMessages]
  );

  return { locale, t };
}
