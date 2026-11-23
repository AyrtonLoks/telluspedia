import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./types";

const displayNamesCache = new Map<Locale, Intl.DisplayNames | null>();

export function normalizeLocale(raw: unknown): Locale {
  if (typeof raw !== "string") return DEFAULT_LOCALE;
  const clean = raw.trim().toLowerCase();
  if (clean === "en" || clean.startsWith("en-")) return "en";
  if (clean === "pt" || clean.startsWith("pt-")) return "pt-BR";
  return DEFAULT_LOCALE;
}

export function readLocaleFromCookieString(cookieStr: string): Locale | null {
  if (!cookieStr) return null;
  const prefix = `${LOCALE_COOKIE_NAME}=`;
  for (const part of cookieStr.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      const value = decodeURIComponent(trimmed.slice(prefix.length));
      if (value === "pt-BR" || value === "en") return value;
    }
  }
  return null;
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const fromStorage = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (fromStorage === "pt-BR" || fromStorage === "en") return fromStorage;
  } catch {
    // localStorage indisponível em navegação privada/sandbox
  }
  try {
    const fromCookie = readLocaleFromCookieString(document.cookie);
    if (fromCookie) return fromCookie;
  } catch {
    // Ignora falha de leitura de cookie
  }
  return DEFAULT_LOCALE;
}

const ROOT_TITLE_PT = "TellusPedia — Enciclopédia Geopolítica e Observatório Planetário";
const ROOT_TITLE_EN = "TellusPedia — Geopolitical Encyclopedia & Planetary Observatory";

export function writeStoredLocale(locale: Locale): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignora quota/privacidade
  }
  try {
    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = locale;
    if (document.title === ROOT_TITLE_PT || document.title === ROOT_TITLE_EN) {
      document.title = locale === "en" ? ROOT_TITLE_EN : ROOT_TITLE_PT;
    }
  } catch {
    // Ignora ambiente sem DOM completo
  }
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions
): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDate(
  value: Date | number | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, options).format(date);
}

function getRegionDisplayNames(locale: Locale): Intl.DisplayNames | null {
  if (displayNamesCache.has(locale)) return displayNamesCache.get(locale) ?? null;
  if (typeof Intl === "undefined" || typeof Intl.DisplayNames !== "function") {
    displayNamesCache.set(locale, null);
    return null;
  }
  try {
    const dn = new Intl.DisplayNames([locale], { type: "region" });
    displayNamesCache.set(locale, dn);
    return dn;
  } catch {
    displayNamesCache.set(locale, null);
    return null;
  }
}

/**
 * Adapta nomes comuns de países via `Intl.DisplayNames` para qualquer um dos 177 países.
 * Em `pt-BR`, preserva o nome curado local; em `en`, resolve via ISO-2 oficial sem dicionário estático.
 */
export function formatCountryName(
  iso2: string | null | undefined,
  fallbackName: string,
  locale: Locale
): string {
  if (locale === "pt-BR") return fallbackName;
  const code = iso2?.trim().toUpperCase();
  if (!code || !/^[A-Z]{2}$/.test(code)) return fallbackName;
  const dn = getRegionDisplayNames(locale);
  if (!dn) return fallbackName;
  try {
    const resolved = dn.of(code);
    return resolved && resolved !== code ? resolved : fallbackName;
  } catch {
    return fallbackName;
  }
}
