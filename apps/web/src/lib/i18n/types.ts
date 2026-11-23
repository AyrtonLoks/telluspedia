export type Locale = "pt-BR" | "en";

export const SUPPORTED_LOCALES: readonly Locale[] = ["pt-BR", "en"];
export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALE_STORAGE_KEY = "telluspedia.locale.v1";
export const LOCALE_COOKIE_NAME = "telluspedia_locale";

export type MessageDictionary = Record<string, string>;
