import type { CountryData } from "@/lib/country-types";
import type { Scene } from "@/lib/scenes/schema";
import type { Locale } from "./types";
import type { EnScenesMap } from "./en-scenes-types";
import type { EnHistoricalMap } from "./en-historical-types";
import type { EnPilotsMap } from "./en-pilots";

/**
 * Registro leve sob demanda (0 imports estáticos pesados, ~400 B) para sincronizar os pacotes
 * profundos de tradução inglesa (`en-scenes`, `en-historical`, `en-pilots`) entre `localeStore`,
 * `ScenePlayerOverlay`, `InspectorHUD`, `ReaderMode` e `ReaderContent` (D42).
 */

export interface RegisteredScenesLocalizer {
  pack: EnScenesMap;
  localize: (scene: Scene, locale: Locale, pack?: EnScenesMap | null) => Scene;
}

export interface RegisteredHistoricalLocalizer {
  pack: EnHistoricalMap;
  localize: (country: CountryData, locale: Locale, pack?: EnHistoricalMap | null) => CountryData;
}

export interface RegisteredPilotsLocalizer {
  pack: EnPilotsMap;
  localize: (
    isoCode: string,
    sections: CountryData["dossierSections"],
    locale: Locale,
    pack?: EnPilotsMap | null
  ) => CountryData["dossierSections"];
}

let scenesLocalizer: RegisteredScenesLocalizer | null = null;
let historicalLocalizer: RegisteredHistoricalLocalizer | null = null;
let pilotsLocalizer: RegisteredPilotsLocalizer | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) fn();
}

export function subscribeDeepI18n(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function registerScenesLocalizer(next: RegisteredScenesLocalizer | null): void {
  scenesLocalizer = next;
  notify();
}

export function registerHistoricalLocalizer(next: RegisteredHistoricalLocalizer | null): void {
  historicalLocalizer = next;
  notify();
}

export function registerPilotsLocalizer(next: RegisteredPilotsLocalizer | null): void {
  pilotsLocalizer = next;
  notify();
}

export function getScenesLocalizer(): RegisteredScenesLocalizer | null {
  return scenesLocalizer;
}

export function getHistoricalLocalizer(): RegisteredHistoricalLocalizer | null {
  return historicalLocalizer;
}

export function getPilotsLocalizer(): RegisteredPilotsLocalizer | null {
  return pilotsLocalizer;
}
