import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, type Locale } from "./types";
import { normalizeLocale } from "./format";

/**
 * Lê o idioma preferido (`telluspedia_locale`) nos Server Components / `generateMetadata`.
 * Em contexto sem request (ex.: pré-render estático ou testes unitários), cai em `pt-BR`.
 */
export async function getServerLocale(): Promise<Locale> {
  try {
    const store = await cookies();
    const raw = store.get(LOCALE_COOKIE_NAME)?.value;
    return raw ? normalizeLocale(raw) : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function pickLocaleText(locale: Locale, ptText: string, enText: string): string {
  return locale === "en" ? enText : ptText;
}
