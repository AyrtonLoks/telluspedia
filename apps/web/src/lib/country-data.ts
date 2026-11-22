/**
 * Dados de país (T36): monta o registro completo de cada país a partir do catálogo, do Banco Mundial,
 * dos pilotos e das entidades históricas. Tipos, pilotos, códigos e dados descritivos ficam em
 * módulos vizinhos (`country-types`, `country-pilots`, `country-codes`, `country-global-info`),
 * re-exportados daqui.
 */
import { HISTORICAL_ENTITIES, resolveHistoricalEntity } from "./historical-entities";
import { WORLD_COUNTRIES_CATALOG, WORLD_COUNTRIES_METADATA } from "./country-catalog";
import worldBankDataset from "../../public/data/countries-worldbank-indicators.json";
import { GLOBAL_MILESTONES } from "./milestones";
import type { CountryIndicator, WorldBankIndicatorSpec, WorldBankCountryEntry, CountryData } from "./country-types";
export type { DataCompleteness, CountryIndicatorCategory, CountryIndicator, WorldBankIndicatorSpec, WorldBankCountryEntry, CountryData, PilotCountryData } from "./country-types";
import { PILOT_COUNTRIES } from "./country-pilots";
export { PILOT_COUNTRIES } from "./country-pilots";
import { NUMERIC_TO_ISO, ISO3_TO_ISO2, ISO3_TO_TIMEZONE } from "./country-codes";
export { NUMERIC_TO_ISO, NAME_TO_ISO, ISO3_TO_ISO2, ISO3_TO_TIMEZONE } from "./country-codes";
import { GLOBAL_COUNTRY_INFO } from "./country-global-info";
export { GLOBAL_COUNTRY_INFO } from "./country-global-info";

export { WORLD_COUNTRIES_CATALOG, WORLD_COUNTRIES_METADATA } from "./country-catalog";
export type { WorldCountryCatalogEntry } from "./country-catalog";

export const WORLD_BANK_METADATA = worldBankDataset.metadata;
export const WORLD_BANK_INDICATOR_SPECS: WorldBankIndicatorSpec[] =
  worldBankDataset.metadata.indicators as WorldBankIndicatorSpec[];
export const WORLD_BANK_COUNTRIES: Record<string, WorldBankCountryEntry> =
  worldBankDataset.countries as Record<string, WorldBankCountryEntry>;

function buildWorldBankIndicatorUrl(indicatorCode: string, iso2?: string): string {
  const base = `https://data.worldbank.org/indicator/${encodeURIComponent(indicatorCode)}`;
  return iso2 ? `${base}?locations=${encodeURIComponent(iso2)}` : base;
}

function hydrateWorldBankIndicators(isoCode: string, iso2?: string): CountryIndicator[] {
  const entry = WORLD_BANK_COUNTRIES[isoCode];
  if (!entry?.indicators) return [];

  const result: CountryIndicator[] = [];
  for (const spec of WORLD_BANK_INDICATOR_SPECS) {
    const reading = entry.indicators[spec.code];
    if (!reading || typeof reading.value !== "number" || !Number.isFinite(reading.value)) {
      continue;
    }
    result.push({
      indicatorCode: spec.code,
      indicatorName: spec.name,
      category: spec.category,
      year: reading.year,
      value: reading.value,
      unit: spec.unit,
      sourcePrimary: spec.sourcePrimary,
      sourceUrl: buildWorldBankIndicatorUrl(spec.code, iso2),
      referenceDate: spec.lastUpdated,
    });
  }
  return result;
}

export type { MilestoneItem } from "./milestones";
export { GLOBAL_MILESTONES, findMilestoneById, PILOT_COUNTRY_ISOS, getCountryMilestones } from "./milestones";

export function getIso2FromIso3(iso3: string): string | undefined {
  const upper = (iso3 || "").toUpperCase();
  if (PILOT_COUNTRIES[upper]?.iso2) return PILOT_COUNTRIES[upper].iso2;
  if (GLOBAL_COUNTRY_INFO[upper]?.iso2) return GLOBAL_COUNTRY_INFO[upper].iso2;
  if (WORLD_COUNTRIES_CATALOG[upper]?.iso2) return WORLD_COUNTRIES_CATALOG[upper].iso2;
  return ISO3_TO_ISO2[upper];
}

export function getCountryData(iso: string, year?: number | null): CountryData | null {
  const upper = (iso || "").trim().toUpperCase();
  if (!upper) return null;

  const normalized = NUMERIC_TO_ISO[upper] || upper;
  const resolvedIso =
    year !== undefined && year !== null
      ? resolveHistoricalEntity(normalized, year)
      : normalized;

  if (HISTORICAL_ENTITIES[resolvedIso]) {
    const h = HISTORICAL_ENTITIES[resolvedIso];
    const histIso2 = ISO3_TO_ISO2[resolvedIso] || "";
    const popIndicator = h.indicators.find((i) => i.category === "DEMOGRAPHY")?.value;

    return {
      isoCode: h.id,
      iso2: histIso2,
      numericCode: h.numericCode ?? null,
      nameCommon: h.nameCommon,
      nameOfficial: h.nameOfficial,
      capital: h.capital ?? null,
      continent: h.continent ?? null,
      region: "História Geopolítica",
      population: popIndicator !== undefined ? popIndicator : null,
      areaKm2: h.areaKm2 !== undefined ? h.areaKm2 : null,
      latitude: h.latitude ?? null,
      longitude: h.longitude ?? null,
      timezone: ISO3_TO_TIMEZONE[resolvedIso] ?? null,
      flagSvgUrl: h.flagSvgUrl,
      currencyCode: null,
      currencyName: null,
      governmentType: h.governmentType ?? null,
      headOfState: h.leaderTitle ?? null,
      headOfGov: h.historicalLeader ?? null,
      summary: h.summary ?? null,
      completeness: "full",
      dataSource: "Maddison Project Database / Correlates of War / Natural Earth",
      referenceDate: "2026-11-20",
      indicators: h.indicators,
      dossierSections: h.dossierSections,
      milestones: GLOBAL_MILESTONES.filter(
        (m) => m.countryIso === h.id || m.blocIsos?.includes(h.id)
      ),
      wikidataQid: h.wikidataQid,
      historicalLeader: h.historicalLeader,
      leaderTitle: h.leaderTitle,
      startYear: h.startYear,
      endYear: h.endYear,
      era: h.era,
      successorIsos: h.successorIsos,
      predecessorIsos: h.predecessorIsos,
      isHistoricalEntity: true,
    };
  }

  if (PILOT_COUNTRIES[resolvedIso]) {
    const pilot = PILOT_COUNTRIES[resolvedIso];
    const wbIndicators = hydrateWorldBankIndicators(pilot.isoCode, pilot.iso2);
    const existingCodes = new Set(pilot.indicators.map((i) => i.indicatorCode));
    const mergedIndicators: CountryIndicator[] = [
      ...pilot.indicators,
      ...wbIndicators.filter((i) => !existingCodes.has(i.indicatorCode)),
    ];

    return {
      ...pilot,
      indicators: mergedIndicators,
      completeness: "full",
      dataSource: "Banco Mundial (WDI) / ONU / IBGE / Natural Earth",
      referenceDate: WORLD_BANK_METADATA.worldBankLastUpdated,
      sourceUrl: `https://data.worldbank.org/country/${pilot.isoCode}`,
      milestones: pilot.milestones.map((m) => ({
        ...m,
        countryIso: m.countryIso || pilot.isoCode,
      })),
    };
  }

  const catalog = WORLD_COUNTRIES_CATALOG[normalized];
  const global = GLOBAL_COUNTRY_INFO[normalized];
  const wb = WORLD_BANK_COUNTRIES[normalized];

  if (global || catalog || wb) {
    const iso2 = global?.iso2 || catalog?.iso2 || getIso2FromIso3(normalized) || "";
    const wbIndicators = hydrateWorldBankIndicators(normalized, iso2);
    const wbPop = wb?.indicators?.["SP.POP.TOTL"]?.value ?? null;
    const wbArea = wb?.indicators?.["AG.SRF.TOTL.K2"]?.value ?? null;

    const population = wbPop !== null ? wbPop : (global?.population ?? null);
    const areaKm2 = wbArea !== null ? wbArea : (global?.areaKm2 ?? null);
    const nameOfficial = global?.nameOfficial ?? wb?.nameOfficial ?? null;
    const capital = global?.capital ?? wb?.capital ?? null;
    const continent = global?.continent ?? wb?.continent ?? null;
    const region = global?.region ?? wb?.region ?? null;
    const currencyCode = global?.currencyCode ?? wb?.currencyCode ?? null;
    const currencyName = global?.currencyName ?? wb?.currencyName ?? null;
    const governmentType = global?.governmentType ?? null;
    const headOfState = global?.headOfState ?? null;
    const summary = global?.summary ?? null;

    const hasWorldBankData = wbIndicators.length > 0;
    const hasPartialFacts =
      hasWorldBankData ||
      Boolean(global) ||
      capital !== null ||
      currencyCode !== null ||
      population !== null ||
      areaKm2 !== null;

    return {
      isoCode: normalized,
      iso2,
      numericCode: global?.numericCode ?? catalog?.numericCode ?? null,
      nameCommon: global?.nameCommon || catalog?.nameCommon || normalized,
      nameOfficial,
      capital,
      continent,
      region,
      population,
      areaKm2,
      latitude: global?.latitude ?? catalog?.latitude ?? null,
      longitude: global?.longitude ?? catalog?.longitude ?? null,
      timezone: global?.timezone ?? ISO3_TO_TIMEZONE[normalized] ?? null,
      flagSvgUrl:
        global?.flagSvgUrl ||
        catalog?.flagSvgUrl ||
        (iso2 ? `https://flagcdn.com/${iso2.toLowerCase()}.svg` : ""),
      currencyCode,
      currencyName,
      governmentType,
      headOfState,
      summary,
      completeness: hasPartialFacts ? "partial" : "none",
      dataSource: hasWorldBankData
        ? "Banco Mundial (WDI) / REST Countries / Natural Earth"
        : WORLD_COUNTRIES_METADATA.source,
      referenceDate: hasWorldBankData
        ? WORLD_BANK_METADATA.worldBankLastUpdated
        : WORLD_COUNTRIES_METADATA.referenceDate,
      sourceUrl: hasWorldBankData
        ? `https://data.worldbank.org/country/${normalized}`
        : WORLD_COUNTRIES_METADATA.sourceUrl,
      wikidataQid: global?.wikidataQid,
      indicators: wbIndicators,
      dossierSections: [],
      milestones: [],
    };
  }

  return null;
}

export function getAllCountries(): CountryData[] {
  const allIsos = Array.from(
    new Set([
      ...Object.keys(WORLD_COUNTRIES_CATALOG),
      ...Object.keys(PILOT_COUNTRIES),
    ])
  ).sort();

  const countries: CountryData[] = [];
  for (const iso of allIsos) {
    const data = getCountryData(iso);
    if (data) countries.push(data);
  }
  return countries;
}

export { getSourceUrl } from "./citations";

export {
  HISTORICAL_ENTITIES,
  resolveHistoricalEra,
  resolveHistoricalEntity,
  HISTORICAL_ERAS,
  findHistoricalEntity,
} from "./historical-entities";
export type {
  HistoricalEraId,
  HistoricalEraDefinition,
  HistoricalEntity,
} from "./historical-entities";
