import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { getCountryData } from "../src/lib/country-data";
import { getSourceUrl } from "../src/lib/citations";
import { buildComparisonDataset } from "../src/lib/comparator-data";
import {
  buildHistoricalSeriesDataset,
  type WorldBankTimeseriesDataset,
} from "../src/lib/worldbank-timeseries";
import { ComparisonCharts } from "../src/components/comparator/ComparisonCharts";
import { useComparatorStore } from "../src/stores/comparatorStore";

const webRoot = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(webRoot, rel), "utf-8");

const TIMESERIES_INDICATORS = [
  "SP.POP.TOTL",
  "NY.GDP.MKTP.CD",
  "NY.GDP.PCAP.CD",
  "SP.DYN.LE00.IN",
  "MS.MIL.XPND.GD.ZS",
  "EG.FEC.RNEW.ZS",
  "EN.GHG.CO2.PC.CE.AR5",
] as const;

function loadTimeseriesFromDisk(): WorldBankTimeseriesDataset {
  const filePath = path.join(webRoot, "public", "data", "worldbank-timeseries.json");
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as WorldBankTimeseriesDataset;
}

describe("T32 · Séries históricas reais do Banco Mundial (1990–2024) e novos indicadores", () => {
  beforeEach(() => {
    useComparatorStore.setState({ isOpen: false, selectedIsos: [], activeMetric: "GDP" });
  });
  afterEach(() => {
    useComparatorStore.setState({ isOpen: false, selectedIsos: [], activeMetric: "GDP" });
  });

  test("1. Snapshot countries-worldbank-indicators.json inclui os 3 novos indicadores com cobertura real", () => {
    const snap = JSON.parse(
      read("public/data/countries-worldbank-indicators.json")
    ) as {
      metadata: {
        indicators: Array<{ code: string }>;
        coverage: Record<string, number | string[]>;
      };
      countries: Record<string, { indicators: Record<string, { value: number; year: number }> }>;
    };

    const codes = new Set(snap.metadata.indicators.map((i) => i.code));
    for (const expected of [
      "SP.POP.TOTL",
      "NY.GDP.MKTP.CD",
      "NY.GDP.PCAP.CD",
      "AG.SRF.TOTL.K2",
      "SP.DYN.LE00.IN",
      "MS.MIL.XPND.GD.ZS",
      "EG.FEC.RNEW.ZS",
      "EN.GHG.CO2.PC.CE.AR5",
    ]) {
      assert.ok(codes.has(expected), `Indicador ${expected} deve constar no snapshot`);
    }

    assert.ok(Number(snap.metadata.coverage.withGdpPerCapita) >= 165);
    assert.ok(Number(snap.metadata.coverage.withRenewableEnergy) >= 160);
    assert.ok(Number(snap.metadata.coverage.withCo2PerCapita) >= 160);

    // Pilot e não-piloto hidratam os novos indicadores reais
    const bra = getCountryData("BRA");
    const arg = getCountryData("ARG");
    assert.ok(bra?.indicators.some((i) => i.indicatorCode === "EG.FEC.RNEW.ZS"));
    assert.ok(bra?.indicators.some((i) => i.indicatorCode === "EN.GHG.CO2.PC.CE.AR5"));
    assert.ok(arg?.indicators.some((i) => i.indicatorCode === "NY.GDP.PCAP.CD"));
    assert.ok(arg?.indicators.some((i) => i.indicatorCode === "EG.FEC.RNEW.ZS"));
    assert.ok(arg?.indicators.some((i) => i.indicatorCode === "EN.GHG.CO2.PC.CE.AR5"));

    // CYN continua sem valores fabricados
    const cyn = getCountryData("CYN");
    assert.equal(cyn?.indicators.length, 0);
  });

  test("2. worldbank-timeseries.json cobre 1990–2024 para os 7 indicadores, preserva lacunas reais como null e nunca é importado estaticamente", () => {
    const ts = loadTimeseriesFromDisk();
    assert.deepEqual(ts.metadata.range, [1990, 2024]);
    assert.equal(ts.years[0], 1990);
    assert.equal(ts.years[ts.years.length - 1], 2024);
    assert.equal(ts.years.length, 35);

    let sawNullGap = false;
    for (const code of TIMESERIES_INDICATORS) {
      const byCountry = ts.series[code];
      assert.ok(byCountry, `Série ${code} ausente em worldbank-timeseries.json`);
      const countryCodes = Object.keys(byCountry);
      assert.ok(countryCodes.length >= 150, `Série ${code} deve cobrir >= 150 países (atual: ${countryCodes.length})`);

      for (const iso of countryCodes) {
        const arr = byCountry[iso];
        assert.equal(arr.length, ts.years.length, `${code}/${iso} deve alinhar ao eixo de 35 anos`);
        for (const v of arr) {
          if (v === null) {
            sawNullGap = true;
          } else {
            assert.equal(typeof v, "number");
            assert.ok(Number.isFinite(v));
          }
        }
      }
    }
    assert.ok(sawNullGap, "Dataset real deve preservar lacunas oficiais como null sem interpolação");

    // Invariante T25/T32: worldbank-timeseries.json NUNCA é importado estaticamente em apps/web/src
    const walk = (dir: string): string[] => {
      const out: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(full));
        else if (/\.(ts|tsx|mjs|js)$/.test(entry.name)) out.push(full);
      }
      return out;
    };
    for (const file of walk(path.join(webRoot, "src"))) {
      const content = fs.readFileSync(file, "utf-8");
      assert.doesNotMatch(
        content,
        /from\s+["'][^"']*worldbank-timeseries\.json["']/,
        `${path.relative(webRoot, file)} não deve importar worldbank-timeseries.json estaticamente`
      );
    }
  });

  test("3. buildHistoricalSeriesDataset monta séries reais preservando lacunas null e separando ausentes", () => {
    const ts = loadTimeseriesFromDisk();
    const res = buildHistoricalSeriesDataset(ts, ["BRA", "ARG", "CYN"], "GDP_PER_CAPITA");

    assert.equal(res.supported, true);
    assert.equal(res.points.length, 35);
    assert.deepEqual(res.activeSeries.map((s) => s.isoCode), ["BRA", "ARG"]);
    assert.deepEqual(res.missing.map((m) => m.isoCode), ["CYN"]);

    const braMeta = res.activeSeries[0];
    assert.equal(braMeta.firstYear, 1990);
    assert.ok(braMeta.lastYear >= 2023);
    assert.ok(braMeta.pointCount >= 30);
    assert.match(braMeta.sourceUrl, /^https:\/\/data\.worldbank\.org\/indicator\/NY\.GDP\.PCAP\.CD\?locations=BR$/);

    // Lacuna sintética em teste garante que null permanece null (sem interpolação)
    const patched: WorldBankTimeseriesDataset = {
      ...ts,
      series: {
        ...ts.series,
        "NY.GDP.PCAP.CD": {
          ...ts.series["NY.GDP.PCAP.CD"],
          BRA: ts.series["NY.GDP.PCAP.CD"].BRA.map((v, i) => (i === 10 ? null : v)),
        },
      },
    };
    const withGap = buildHistoricalSeriesDataset(patched, ["BRA"], "GDP_PER_CAPITA");
    assert.equal(withGap.points[10].year, 2000);
    assert.equal(withGap.points[10].BRA, null, "Lacuna real no ano 2000 deve permanecer null");

    // HDI não tem série histórica no Banco Mundial
    const hdi = buildHistoricalSeriesDataset(ts, ["BRA"], "HDI");
    assert.equal(hdi.supported, false);
    assert.equal(hdi.points.length, 0);
  });

  test("4. ComparisonCharts usa connectNulls={false}, carrega sob demanda e renderiza série histórica 1990–2024", () => {
    const chartsSrc = read("src/components/comparator/ComparisonCharts.tsx");
    assert.match(chartsSrc, /connectNulls=\{false\}/, "LineChart deve usar connectNulls={false}");
    assert.match(chartsSrc, /loadWorldBankTimeseries/, "ComparisonCharts deve carregar série sob demanda");

    const ts = loadTimeseriesFromDisk();
    useComparatorStore.setState({ selectedIsos: ["BRA", "ARG", "CYN"], activeMetric: "GDP" });
    const html = renderToStaticMarkup(
      React.createElement(ComparisonCharts, {
        initialViewMode: "historical",
        initialTimeseries: ts,
      })
    );
    assert.match(html, /data-chart-mode="historical"/);
    assert.match(html, /data-testid="comparison-historical-chart"/);
    assert.match(html, /Brasil/);
    assert.match(html, /Argentina/);
    assert.match(html, /1990–2024/);
    assert.match(html, /Chipre do Norte/);
    assert.match(html, /sem interpolação/i);
  });

  test("5. getSourceUrl e buildComparisonDataset cobrem os 3 novos indicadores oficiais", () => {
    assert.equal(
      getSourceUrl("Banco Mundial", "NY.GDP.PCAP.CD"),
      "https://data.worldbank.org/indicator/NY.GDP.PCAP.CD"
    );
    assert.equal(
      getSourceUrl("Banco Mundial", "EG.FEC.RNEW.ZS"),
      "https://data.worldbank.org/indicator/EG.FEC.RNEW.ZS"
    );
    assert.equal(
      getSourceUrl("Banco Mundial", "EN.GHG.CO2.PC.CE.AR5"),
      "https://data.worldbank.org/indicator/EN.GHG.CO2.PC.CE.AR5"
    );

    const renew = buildComparisonDataset(["BRA", "DEU", "CHN"], "RENEWABLE_ENERGY");
    assert.equal(renew.entries.length, 3);
    assert.ok(renew.entries[0].value > 30, "Brasil tem alta participação de renováveis (>30%)");

    const co2 = buildComparisonDataset(["BRA", "USA", "CHN"], "CO2_PER_CAPITA");
    assert.equal(co2.entries.length, 3);
    assert.ok(co2.entries[1].value > co2.entries[0].value, "EUA têm CO2 per capita maior que Brasil");
  });
});
