import type { CountryData } from "@/lib/country-types";
import type { Locale } from "./types";
import type {
  EnHistoricalEntityTranslation,
  EnHistoricalMap,
} from "./en-historical-types";
import { EN_HISTORICAL_EMPIRES } from "./en-historical-empires";
import { EN_HISTORICAL_COLD_WAR } from "./en-historical-cold-war";

export type {
  EnHistoricalEntityTranslation,
  EnHistoricalMap,
} from "./en-historical-types";

/**
 * Catálogo sob demanda (`en`) das 8 entidades históricas (D42):
 * `PRU`, `AHU`, `TUR_HIST`, `SUN`, `GDR`, `FRG`, `YUG` e `CSK`.
 */
export const EN_HISTORICAL_ENTITIES: EnHistoricalMap = {
  ...EN_HISTORICAL_EMPIRES,
  ...EN_HISTORICAL_COLD_WAR,
};

let enHistoricalCache: EnHistoricalMap | null = EN_HISTORICAL_ENTITIES;

export function getEnHistoricalSync(): EnHistoricalMap | null {
  return enHistoricalCache;
}

export function resetEnHistoricalCacheForTest(): void {
  enHistoricalCache = null;
}

export async function loadEnHistorical(): Promise<EnHistoricalMap> {
  enHistoricalCache = EN_HISTORICAL_ENTITIES;
  return EN_HISTORICAL_ENTITIES;
}

/**
 * Localiza integralmente uma ficha `CountryData` de entidade histórica para o inglês (`en`),
 * traduzindo nomes, capital, regime, governantes, indicadores e seções do dossiê no Reader Mode.
 */
export function localizeHistoricalCountry(
  country: CountryData,
  locale: Locale,
  pack: EnHistoricalMap | null = enHistoricalCache
): CountryData {
  if (locale !== "en" || !country.isHistoricalEntity || !pack) return country;
  const tr = pack[country.isoCode];
  if (!tr) return country;

  return {
    ...country,
    nameCommon: tr.nameCommon,
    nameOfficial: tr.nameOfficial,
    capital: tr.capital,
    continent: tr.continent ?? country.continent,
    region: "Geopolitical History",
    governmentType: tr.governmentType,
    headOfState: tr.leaderTitle,
    headOfGov: tr.historicalLeader,
    leaderTitle: tr.leaderTitle,
    historicalLeader: tr.historicalLeader,
    summary: tr.summary,
    indicators: country.indicators.map((ind) => {
      const indTr = tr.indicators[ind.indicatorCode];
      if (!indTr) return ind;
      return {
        ...ind,
        indicatorName: indTr.indicatorName,
        unit: indTr.unit,
        sourcePrimary: indTr.sourcePrimary ?? ind.sourcePrimary,
      };
    }),
    dossierSections: country.dossierSections.map((sec) => {
      const secTr = tr.dossierSections[sec.dimension];
      if (!secTr) return sec;
      return {
        ...sec,
        title: secTr.title,
        contentMarkdown: secTr.contentMarkdown,
        citationsJson: {
          ...sec.citationsJson,
          primarySource: secTr.primarySource ?? sec.citationsJson.primarySource,
        },
      };
    }),
  };
}
