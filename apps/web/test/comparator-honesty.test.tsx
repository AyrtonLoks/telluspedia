import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildComparisonDataset,
  searchComparableCountries,
} from "../src/lib/comparator-data";
import { ComparisonCharts } from "../src/components/comparator/ComparisonCharts";
import { CountryComparator } from "../src/components/comparator/CountryComparator";
import { useComparatorStore } from "../src/stores/comparatorStore";

const webRoot = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(webRoot, rel), "utf-8");

function resetStore() {
  useComparatorStore.setState({
    isOpen: false,
    selectedIsos: [],
    activeMetric: "GDP",
  });
}

describe("T29 · Comparador honesto para os 177 países (sem séries fabricadas)", () => {
  beforeEach(resetStore);
  afterEach(resetStore);

  test("1. ComparisonCharts e CountryComparator não dependem de PILOT_COUNTRIES nem contêm curvas ou fallbacks fabricados", () => {
    const charts = read("src/components/comparator/ComparisonCharts.tsx");
    const modal = read("src/components/comparator/CountryComparator.tsx");

    assert.doesNotMatch(charts, /\bPILOT_COUNTRIES\b/, "ComparisonCharts não pode limitar-se a PILOT_COUNTRIES");
    assert.doesNotMatch(modal, /\bPILOT_COUNTRIES\b/, "CountryComparator não pode limitar-se a PILOT_COUNTRIES");
    assert.doesNotMatch(charts, /\bgrowthFactor\b/, "ComparisonCharts não pode gerar interpolação linear sintética");
    assert.doesNotMatch(charts, /0\.35\s*\+\s*0\.65|0\.75\s*\+\s*0\.25|-\s*0\.15\s*\+\s*0\.15/);
    assert.doesNotMatch(charts, /\|\|\s*(1e12|0\.8|1\.5)\b/, "ComparisonCharts não pode injetar fallbacks numéricos inventados");
    assert.doesNotMatch(charts, /\[1990,\s*1995/, "ComparisonCharts não pode simular série temporal fixa 1990–2023");
  });

  test("2. buildComparisonDataset resolve países fora dos 6 piloto (ARG, CHN, IND, FRA) com leituras e anos reais", () => {
    const gdp = buildComparisonDataset(["ARG", "CHN", "IND", "FRA"], "GDP");
    assert.equal(gdp.entries.length, 4);
    assert.equal(gdp.missing.length, 0);
    for (const entry of gdp.entries) {
      assert.ok(entry.rawValue > 1e11, `${entry.isoCode} deve ter PIB real > 100 bi USD`);
      assert.ok(entry.year !== null && entry.year >= 2018, `${entry.isoCode} deve informar ano real`);
      assert.match(entry.sourceUrl, /^https:\/\/data\.worldbank\.org\/indicator\/NY\.GDP\.MKTP\.CD/);
    }

    const life = buildComparisonDataset(["ARG", "CHN", "IND", "FRA"], "LIFE_EXPECTANCY");
    assert.equal(life.entries.length, 4);
    for (const entry of life.entries) {
      assert.ok(entry.value > 60 && entry.value < 95, `${entry.isoCode} expectativa de vida plausível`);
    }
  });

  test("3. Países sem dado na métrica vão para `missing` sem receber valor falso ou zero", () => {
    // CYN (Chipre do Norte) não tem leituras do Banco Mundial; ARG não tem UNDP.HDI no catálogo atual
    const gdp = buildComparisonDataset(["ARG", "CYN"], "GDP");
    assert.deepEqual(gdp.entries.map((e) => e.isoCode), ["ARG"]);
    assert.deepEqual(gdp.missing.map((m) => m.isoCode), ["CYN"]);

    const hdi = buildComparisonDataset(["BRA", "ARG", "CHN"], "HDI");
    assert.deepEqual(hdi.entries.map((e) => e.isoCode), ["BRA"]);
    assert.deepEqual(hdi.missing.map((m) => m.isoCode), ["ARG", "CHN"]);
  });

  test("4. searchComparableCountries encontra qualquer um dos 177 países (com ou sem acento e por ISO) e exclui selecionados", () => {
    const allUnfiltered = searchComparableCountries("", [], 200);
    assert.ok(allUnfiltered.length >= 177, `Esperado >= 177 países, obtido ${allUnfiltered.length}`);

    const franca = searchComparableCountries("franca", []);
    assert.equal(franca[0]?.isoCode, "FRA");

    const mexico = searchComparableCountries("mexico", []);
    assert.equal(mexico[0]?.isoCode, "MEX");

    const byIso = searchComparableCountries("arg", []);
    assert.equal(byIso[0]?.isoCode, "ARG");

    const excluded = searchComparableCountries("arg", ["ARG"]);
    assert.ok(!excluded.some((c) => c.isoCode === "ARG"), "ISO já selecionado deve ser excluído");
  });

  test("5. ComparisonCharts renderiza leituras reais, anos, fontes clicáveis e aviso explícito de dados indisponíveis", () => {
    useComparatorStore.setState({ selectedIsos: ["ARG", "CHN", "CYN"], activeMetric: "GDP" });
    const html = renderToStaticMarkup(React.createElement(ComparisonCharts));
    assert.match(html, /data-testid="comparison-charts"/);
    assert.match(html, /Argentina/);
    assert.match(html, /China/);
    assert.match(html, /https:\/\/data\.worldbank\.org\/indicator\/NY\.GDP\.MKTP\.CD/);
    assert.match(html, /data-testid="comparison-chart-missing"/);
    assert.match(html, /Chipre do Norte/);

    // Quando nenhum país selecionado tem a métrica (IDH só nos 6 piloto), exibe estado vazio honesto
    useComparatorStore.setState({ selectedIsos: ["ARG", "CHN"], activeMetric: "HDI" });
    const emptyHtml = renderToStaticMarkup(React.createElement(ComparisonCharts));
    assert.match(emptyHtml, /data-testid="comparison-chart-empty"/);
    assert.match(emptyHtml, /Dado indisponível/);
  });

  test("6. CountryComparator aberto exibe busca para os 177 países e renderiza países não-piloto", () => {
    useComparatorStore.setState({ isOpen: true, selectedIsos: ["ARG", "CHN", "IND", "FRA"] });
    const html = renderToStaticMarkup(React.createElement(CountryComparator));
    assert.match(html, /data-testid="comparator-country-search"/);
    assert.match(html, /177 países/);
    assert.match(html, /4\/4 selecionados/);
    assert.match(html, /Argentina/);
    assert.match(html, /China/);
    assert.match(html, /Índia/);
    assert.match(html, /França/);
  });
});
