"use client";

import { useEffect, useMemo, useState } from "react";
import type { CountryData } from "@/lib/country-types";
import type { Locale } from "./types";
import {
  getHistoricalLocalizer,
  getPilotsLocalizer,
  registerHistoricalLocalizer,
  registerPilotsLocalizer,
  subscribeDeepI18n,
} from "./deep-i18n-registry";

/**
 * Localiza sincronamente (ou carrega sob demanda quando `locale === "en"`) entidades históricas
 * (`en-historical.ts`) e textos editoriais nativos dos 6 países-piloto (`en-pilots.ts`) (D42).
 */
export function localizeCountryDataSync(
  country: CountryData | null,
  locale: Locale
): CountryData | null {
  if (!country || locale !== "en") return country;

  if (country.isHistoricalEntity) {
    const hist = getHistoricalLocalizer();
    return hist ? hist.localize(country, locale, hist.pack) : country;
  }

  const pilots = getPilotsLocalizer();
  if (!pilots) return country;
  const localizedSections = pilots.localize(
    country.isoCode,
    country.dossierSections,
    locale,
    pilots.pack
  );
  return localizedSections === country.dossierSections
    ? country
    : { ...country, dossierSections: localizedSections };
}

export function useLocalizedCountryData(
  country: CountryData | null,
  locale: Locale
): CountryData | null {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (locale !== "en") return;
    const unsub = subscribeDeepI18n(() => setTick((v) => v + 1));
    if (!getHistoricalLocalizer()) {
      void import("@/lib/i18n/en-historical")
        .then((mod) =>
          registerHistoricalLocalizer({
            pack: mod.EN_HISTORICAL_ENTITIES,
            localize: mod.localizeHistoricalCountry,
          })
        )
        .catch(() => {});
    }
    if (!getPilotsLocalizer()) {
      void import("@/lib/i18n/en-pilots")
        .then((mod) =>
          registerPilotsLocalizer({
            pack: mod.EN_PILOT_DOSSIERS,
            localize: mod.localizePilotDossierSections,
          })
        )
        .catch(() => {});
    }
    return unsub;
  }, [locale]);

  return useMemo(() => {
    void tick;
    return localizeCountryDataSync(country, locale);
  }, [country, locale, tick]);
}
