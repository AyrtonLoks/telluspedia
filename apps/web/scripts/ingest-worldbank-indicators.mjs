#!/usr/bin/env node
/**
 * T26 — Ingestão oficial de indicadores do Banco Mundial (WDI) e metadados REST Countries
 * para todos os 177 países/territórios do catálogo Natural Earth 1:110m.
 *
 * Fontes primárias (RN01 / RN02):
 * - World Bank Indicators API v2 (CC BY 4.0):
 *   https://api.worldbank.org/v2/country/all/indicator/<CODE>?format=json&mrnev=1&per_page=500
 *   Séries ingeridas:
 *   - SP.POP.TOTL       — População Total (habitantes)
 *   - NY.GDP.MKTP.CD    — PIB a Preços Correntes (USD)
 *   - AG.SRF.TOTL.K2    — Área de Superfície (km²)
 *   - SP.DYN.LE00.IN    — Expectativa de Vida ao Nascer (anos)
 *   - MS.MIL.XPND.GD.ZS — Gastos Militares (% do PIB)
 * - REST Countries / mledoze/countries (ODbL, dataset canônico upstream do REST Countries):
 *   https://raw.githubusercontent.com/mledoze/countries/master/countries.json
 *   Campos ingeridos: nome oficial (pt-BR), capital, continente, sub-região e moeda.
 *
 * Política de honestidade de dados (T03 / RN02):
 * - Ausências reais nas fontes oficiais permanecem estritamente como `null` (ou omitidas
 *   da lista de indicadores). Nenhum valor é estimado, interpolado ou inventado.
 *
 * Uso:
 *   node apps/web/scripts/ingest-worldbank-indicators.mjs
 *   node apps/web/scripts/ingest-worldbank-indicators.mjs --dry-run
 *
 * Variáveis de ambiente opcionais:
 *   WORLDBANK_API_BASE   (padrão: https://api.worldbank.org/v2)
 *   REST_COUNTRIES_URL   (padrão: https://raw.githubusercontent.com/mledoze/countries/master/countries.json)
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.resolve(__dirname, "../public/data/countries-ne-110m.json");
const OUTPUT_PATH = path.resolve(__dirname, "../public/data/countries-worldbank-indicators.json");

const WORLDBANK_API_BASE = (
  process.env.WORLDBANK_API_BASE || "https://api.worldbank.org/v2"
).replace(/\/+$/, "");
const REST_COUNTRIES_URL =
  process.env.REST_COUNTRIES_URL ||
  "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";

const DRY_RUN = process.argv.includes("--dry-run");

const INDICATOR_SPECS = [
  {
    code: "SP.POP.TOTL",
    name: "População Total",
    category: "DEMOGRAPHY",
    unit: "habitantes",
    sourcePrimary: "Banco Mundial",
    round: (v) => Math.round(v),
  },
  {
    code: "NY.GDP.MKTP.CD",
    name: "PIB a Preços Correntes",
    category: "ECONOMY",
    unit: "USD",
    sourcePrimary: "Banco Mundial",
    round: (v) => Math.round(v),
  },
  {
    code: "AG.SRF.TOTL.K2",
    name: "Área de Superfície",
    category: "GEOGRAPHY",
    unit: "km²",
    sourcePrimary: "Banco Mundial",
    round: (v) => Math.round(v * 10) / 10,
  },
  {
    code: "SP.DYN.LE00.IN",
    name: "Expectativa de Vida ao Nascer",
    category: "HEALTH",
    unit: "anos",
    sourcePrimary: "Banco Mundial",
    round: (v) => Math.round(v * 10) / 10,
  },
  {
    code: "MS.MIL.XPND.GD.ZS",
    name: "Gastos Militares (% do PIB)",
    category: "MILITARY",
    unit: "%",
    sourcePrimary: "Banco Mundial",
    round: (v) => Math.round(v * 100) / 100,
  },
];

// Mapeamento de códigos ISO3 do catálogo que usam código alternativo em mledoze/countries
const REST_COUNTRIES_ISO_ALIASES = {
  XKX: "UNK", // Kosovo em mledoze/countries
};

// Correções pontuais de nomes oficiais com erro conhecido no upstream mledoze/countries
const OFFICIAL_NAME_PT_OVERRIDES = {
  GUF: "Guiana Francesa",
};

// Tradução determinística das sub-regiões UN M49 (REST Countries) para português do Brasil
const SUBREGION_PT = {
  "Northern Africa": "Norte da África",
  "Eastern Africa": "África Oriental",
  "Middle Africa": "África Central",
  "Southern Africa": "África Austral",
  "Western Africa": "África Ocidental",
  "North America": "América do Norte",
  "Central America": "América Central",
  "Caribbean": "Caribe",
  "South America": "América do Sul",
  "Central Asia": "Ásia Central",
  "Eastern Asia": "Leste Asiático",
  "South-Eastern Asia": "Sudeste Asiático",
  "Southern Asia": "Sul da Ásia",
  "Western Asia": "Oriente Médio / Ásia Ocidental",
  "Eastern Europe": "Leste Europeu",
  "Northern Europe": "Norte da Europa",
  "Southern Europe": "Sul da Europa",
  "Southeast Europe": "Sudeste da Europa",
  "Western Europe": "Europa Ocidental",
  "Central Europe": "Europa Central",
  "Australia and New Zealand": "Austrália e Nova Zelândia",
  "Melanesia": "Melanésia",
  "Micronesia": "Micronésia",
  "Polynesia": "Polinésia",
};

const CONTINENT_PT = {
  Africa: "África",
  Americas: "Américas",
  Asia: "Ásia",
  Europe: "Europa",
  Oceania: "Oceania",
  Antarctic: "Antártida",
};

const currencyDisplayPt = new Intl.DisplayNames(["pt-BR"], { type: "currency" });

async function fetchJsonWithRetry(url, label, attempts = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "TellusPedia-DataIngestion/1.0 (T26; RN02)",
          Accept: "application/json",
        },
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) {
        const waitMs = 500 * Math.pow(2, attempt - 1);
        console.warn(`[retry ${attempt}/${attempts}] ${label} falhou (${err.message}); tentando em ${waitMs}ms...`);
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }
  }
  throw new Error(`Falha ao consultar ${label} (${url}): ${lastErr?.message || lastErr}`);
}

async function fetchWorldBankIndicator(spec) {
  const byIso = new Map();
  let page = 1;
  let totalPages = 1;
  let lastUpdated = null;

  while (page <= totalPages) {
    const url = `${WORLDBANK_API_BASE}/country/all/indicator/${encodeURIComponent(
      spec.code
    )}?format=json&mrnev=1&per_page=500&page=${page}`;
    const payload = await fetchJsonWithRetry(url, `World Bank ${spec.code} (p.${page})`);

    if (!Array.isArray(payload) || payload.length < 2 || !payload[0]) {
      throw new Error(`Resposta inesperada da API do Banco Mundial para ${spec.code}`);
    }

    const meta = payload[0];
    const rows = Array.isArray(payload[1]) ? payload[1] : [];
    totalPages = Number(meta.pages) || 1;
    if (typeof meta.lastupdated === "string" && meta.lastupdated.trim()) {
      lastUpdated = meta.lastupdated.trim();
    }

    for (const row of rows) {
      const iso3 = typeof row?.countryiso3code === "string" ? row.countryiso3code.trim().toUpperCase() : "";
      const rawVal = row?.value;
      const year = Number(row?.date);
      if (!iso3 || iso3.length !== 3) continue;
      if (rawVal === null || rawVal === undefined || typeof rawVal !== "number" || !Number.isFinite(rawVal)) {
        continue;
      }
      if (!Number.isInteger(year) || year < 1960 || year > 2100) continue;

      const existing = byIso.get(iso3);
      if (!existing || year > existing.year) {
        byIso.set(iso3, {
          year,
          value: spec.round(rawVal),
        });
      }
    }

    page += 1;
  }

  return {
    code: spec.code,
    lastUpdated,
    byIso,
  };
}

function formatCurrencyPt(code, fallbackName, symbol) {
  if (!code) return null;
  let localized = null;
  try {
    const ptName = currencyDisplayPt.of(code);
    if (ptName && ptName !== code) {
      localized = ptName.charAt(0).toUpperCase() + ptName.slice(1);
    }
  } catch {
    // Fallback below
  }
  const base = localized || fallbackName || code;
  const cleanSymbol = typeof symbol === "string" ? symbol.trim() : "";
  return cleanSymbol ? `${base} (${cleanSymbol})` : base;
}

function extractRestCountryMeta(isoCode, raw) {
  if (!raw) {
    return {
      nameOfficial: null,
      capital: null,
      continent: null,
      region: null,
      currencyCode: null,
      currencyName: null,
    };
  }

  const porOfficial = raw.translations?.por?.official?.trim() || null;
  const enOfficial = raw.name?.official?.trim() || null;
  const nameOfficial = OFFICIAL_NAME_PT_OVERRIDES[isoCode] || porOfficial || enOfficial;

  const capital =
    Array.isArray(raw.capital) && typeof raw.capital[0] === "string" && raw.capital[0].trim()
      ? raw.capital[0].trim()
      : null;

  const continent = typeof raw.region === "string" && raw.region.trim() ? raw.region.trim() : null;
  const rawSubregion = typeof raw.subregion === "string" ? raw.subregion.trim() : "";
  const region =
    (rawSubregion && (SUBREGION_PT[rawSubregion] || rawSubregion)) ||
    (continent && (CONTINENT_PT[continent] || continent)) ||
    null;

  const currencyEntries = raw.currencies && typeof raw.currencies === "object" ? Object.entries(raw.currencies) : [];
  let currencyCode = null;
  let currencyName = null;
  if (currencyEntries.length > 0) {
    const [code, info] = currencyEntries[0];
    if (typeof code === "string" && code.trim()) {
      currencyCode = code.trim().toUpperCase();
      currencyName = formatCurrencyPt(
        currencyCode,
        typeof info?.name === "string" ? info.name.trim() : null,
        typeof info?.symbol === "string" ? info.symbol.trim() : null
      );
    }
  }

  return {
    nameOfficial,
    capital,
    continent,
    region,
    currencyCode,
    currencyName,
  };
}

async function main() {
  const catalogJson = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
  const catalogCountries = catalogJson.countries || {};
  const catalogIsos = Object.keys(catalogCountries).sort();

  console.log(`Catálogo Natural Earth 1:110m carregado: ${catalogIsos.length} países/territórios.`);

  // 1. Ingerir séries oficiais do Banco Mundial em paralelo
  console.log(`Consultando ${INDICATOR_SPECS.length} indicadores na World Bank API v2...`);
  const wbResults = await Promise.all(INDICATOR_SPECS.map((spec) => fetchWorldBankIndicator(spec)));
  const wbByCode = new Map(wbResults.map((r) => [r.code, r]));

  const latestWbUpdate = wbResults
    .map((r) => r.lastUpdated)
    .filter(Boolean)
    .sort()
    .at(-1) || new Date().toISOString().slice(0, 10);

  // 2. Ingerir metadados (capital, moeda, região, nome oficial) do dataset REST Countries (mledoze/countries)
  console.log("Consultando metadados de países (REST Countries / mledoze/countries)...");
  const restRaw = await fetchJsonWithRetry(REST_COUNTRIES_URL, "REST Countries (mledoze/countries)");
  if (!Array.isArray(restRaw)) {
    throw new Error("Resposta inesperada do dataset REST Countries (esperava array JSON)");
  }
  const restByCca3 = new Map();
  for (const item of restRaw) {
    if (typeof item?.cca3 === "string" && item.cca3.trim()) {
      restByCca3.set(item.cca3.trim().toUpperCase(), item);
    }
  }

  // 3. Montar dataset consolidado para todos os 177 códigos do catálogo
  const countries = {};
  const coverage = {
    totalCatalogCountries: catalogIsos.length,
    withPopulation: 0,
    withGdp: 0,
    withArea: 0,
    withLifeExpectancy: 0,
    withMilitaryExpenditure: 0,
    withRestCountriesMetadata: 0,
    withoutWorldBankData: [],
  };

  for (const isoCode of catalogIsos) {
    const restKey = REST_COUNTRIES_ISO_ALIASES[isoCode] || isoCode;
    const restItem = restByCca3.get(restKey) || null;
    if (restItem) coverage.withRestCountriesMetadata += 1;

    const meta = extractRestCountryMeta(isoCode, restItem);
    const indicators = {};

    for (const spec of INDICATOR_SPECS) {
      const series = wbByCode.get(spec.code);
      const reading = series?.byIso.get(isoCode);
      if (!reading) continue;

      if (spec.code === "SP.POP.TOTL") {
        coverage.withPopulation += 1;
      } else if (spec.code === "NY.GDP.MKTP.CD") {
        coverage.withGdp += 1;
      } else if (spec.code === "AG.SRF.TOTL.K2") {
        coverage.withArea += 1;
      } else if (spec.code === "SP.DYN.LE00.IN") {
        coverage.withLifeExpectancy += 1;
      } else if (spec.code === "MS.MIL.XPND.GD.ZS") {
        coverage.withMilitaryExpenditure += 1;
      }

      indicators[spec.code] = {
        value: reading.value,
        year: reading.year,
      };
    }

    if (Object.keys(indicators).length === 0) {
      coverage.withoutWorldBankData.push(isoCode);
    }

    countries[isoCode] = {
      nameOfficial: meta.nameOfficial,
      capital: meta.capital,
      continent: meta.continent,
      region: meta.region,
      currencyCode: meta.currencyCode,
      currencyName: meta.currencyName,
      indicators,
    };
  }

  const output = {
    metadata: {
      schemaVersion: 1,
      generatedAt: latestWbUpdate,
      worldBankLastUpdated: latestWbUpdate,
      sources: [
        {
          id: "world-bank-wdi",
          name: "World Bank Indicators API v2 (World Development Indicators)",
          url: "https://data.worldbank.org/",
          apiUrl: `${WORLDBANK_API_BASE}/country/all/indicator/<CODE>?format=json&mrnev=1`,
          license: "CC BY 4.0",
        },
        {
          id: "rest-countries",
          name: "REST Countries / mledoze/countries",
          url: "https://github.com/mledoze/countries",
          apiUrl: REST_COUNTRIES_URL,
          license: "ODbL 1.0",
        },
      ],
      indicators: INDICATOR_SPECS.map((spec) => ({
        code: spec.code,
        name: spec.name,
        category: spec.category,
        unit: spec.unit,
        sourcePrimary: spec.sourcePrimary,
        sourceUrl: `https://data.worldbank.org/indicator/${spec.code}`,
        lastUpdated: wbByCode.get(spec.code)?.lastUpdated || latestWbUpdate,
      })),
      coverage,
      notes:
        "Indicadores socioeconômicos e geográficos ingeridos diretamente da API oficial do Banco Mundial (mrnev=1: valor oficial mais recente não nulo) e metadados administrativos do dataset canônico REST Countries (mledoze/countries). Ausências reais nas fontes oficiais são mantidas como null.",
    },
    countries,
  };

  console.log("Cobertura ingerida:", JSON.stringify(coverage, null, 2));

  if (DRY_RUN) {
    console.log("--dry-run ativo: nenhum arquivo foi escrito.");
    return;
  }

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`Dataset salvo em ${OUTPUT_PATH} (${Object.keys(countries).length} países).`);
}

main().catch((err) => {
  console.error("Erro na ingestão T26:", err);
  process.exit(1);
});
