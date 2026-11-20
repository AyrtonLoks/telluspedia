import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import {
  getCountryData,
  WORLD_COUNTRIES_CATALOG,
  WORLD_COUNTRIES_METADATA,
} from "../src/lib/country-data";
import { InspectorHUD } from "../src/components/hud/InspectorHUD";
import { ReaderContent } from "../src/components/reader/ReaderContent";
import { ComparisonGrid } from "../src/components/comparator/ComparisonGrid";
import { GET as getCountryApi } from "../src/app/api/countries/[iso]/route";
import { useGlobeStore } from "../src/stores/globeStore";
import { useTimelineStore } from "../src/stores/timelineStore";
import { useComparatorStore } from "../src/stores/comparatorStore";

function resetStores() {
  useGlobeStore.setState({ selectedIso: null, isReaderOpen: false });
  useTimelineStore.setState({
    startYear: 1974,
    endYear: 2024,
    selectedYear: null,
    selectedMilestoneId: null,
    timelineMode: "HISTORICAL",
    geologicalMa: null,
  });
  useComparatorStore.setState({ selectedIsos: [], isOpen: false });
}

describe("T03 — Remoção de dados e citações inventados (RN02)", () => {
  beforeEach(() => {
    resetStores();
  });

  test("1. getCountryData retorna null para códigos ISO inexistentes ou vazios", () => {
    assert.equal(getCountryData("XYZ"), null);
    assert.equal(getCountryData("XYZ_UNKNOWN"), null);
    assert.equal(getCountryData("999"), null);
    assert.equal(getCountryData(""), null);
    assert.equal(getCountryData("   "), null);
  });

  test("2. Catálogo Natural Earth 1:110m possui metadados RN02 e cobertura real para COD, KAZ e 177 territórios", () => {
    assert.ok(WORLD_COUNTRIES_METADATA.source.includes("Natural Earth"));
    assert.ok(WORLD_COUNTRIES_METADATA.sourceUrl.startsWith("https://"));
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(WORLD_COUNTRIES_METADATA.referenceDate));
    assert.ok(Object.keys(WORLD_COUNTRIES_CATALOG).length >= 177);

    const cod = getCountryData("COD");
    assert.ok(cod, "COD deve existir no catálogo real");
    assert.equal(cod.nameCommon, "República Democrática do Congo");
    assert.equal(cod.iso2, "CD");
    assert.equal(cod.numericCode, "180");
    assert.equal(cod.flagSvgUrl, "https://flagcdn.com/cd.svg");
    assert.equal(cod.completeness, "none");
    assert.ok(cod.latitude !== null && cod.longitude !== null);
    assert.ok(cod.latitude !== 0 || cod.longitude !== 0, "COD não pode ter coordenada (0,0)");
    assert.equal(cod.population, null);
    assert.equal(cod.areaKm2, null);
    assert.equal(cod.capital, null);
    assert.equal(cod.nameOfficial, null);
    assert.equal(cod.currencyCode, null);
    assert.equal(cod.currencyName, null);
    assert.equal(cod.governmentType, null);
    assert.equal(cod.headOfState, null);
    assert.equal(cod.summary, null);

    const kaz = getCountryData("KAZ");
    assert.ok(kaz, "KAZ deve existir no catálogo real");
    assert.equal(kaz.nameCommon, "Cazaquistão");
    assert.equal(kaz.completeness, "none");
    assert.equal(kaz.population, null);
    assert.equal(kaz.areaKm2, null);
    assert.ok(kaz.latitude !== null && kaz.latitude > 40 && kaz.latitude < 55);
  });

  test("3. Países parciais (MOZ, PER) mantêm apenas fatos reais e deixam campos ausentes como null", () => {
    const moz = getCountryData("MOZ");
    assert.ok(moz);
    assert.equal(moz.nameCommon, "Moçambique");
    assert.equal(moz.capital, "Maputo");
    assert.equal(moz.currencyCode, "MZN");
    assert.equal(moz.currencyName, "Metical");
    assert.equal(moz.completeness, "partial");
    assert.equal(moz.population, null, "MOZ não pode receber população inventada de 15.000.000");
    assert.equal(moz.areaKm2, null, "MOZ não pode receber área inventada de 350.000");
    assert.equal(moz.governmentType, null);
    assert.equal(moz.headOfState, null);
    assert.equal(moz.summary, null);

    const per = getCountryData("PER");
    assert.ok(per);
    assert.equal(per.nameCommon, "Peru");
    assert.equal(per.capital, "Lima");
    assert.equal(per.completeness, "partial");
    assert.equal(per.population, 34000000);
    assert.equal(per.dossierSections.length, 0);

    const bra = getCountryData("BRA");
    assert.ok(bra);
    assert.equal(bra.completeness, "full");
    assert.ok(bra.indicators.length > 0);
    assert.ok(bra.dossierSections.length > 0);
  });

  test("4. InspectorHUD exibe nome real e estado 'dados indisponíveis' para COD/KAZ, e null para XYZ", () => {
    const htmlCod = renderToStaticMarkup(
      React.createElement(InspectorHUD, { selectedIso: "COD" })
    );
    assert.ok(htmlCod.includes("República Democrática do Congo"));
    assert.ok(htmlCod.includes('data-completeness="none"'));
    assert.ok(htmlCod.includes('data-testid="country-data-unavailable"'));
    assert.ok(htmlCod.includes('data-testid="inspector-summary-unavailable"'));
    assert.ok(htmlCod.includes("Dado indisponível"));
    assert.ok(htmlCod.includes("https://data.worldbank.org/country/COD"));
    assert.ok(!htmlCod.includes("Nação Soberana"));
    assert.ok(!htmlCod.includes("Capital Central"));
    assert.ok(!htmlCod.includes("10.000.000"));
    assert.ok(!htmlCod.includes("250.000"));
    assert.ok(!htmlCod.includes("Chefe de Estado"));
    assert.ok(!htmlCod.includes("Moeda Local"));

    const htmlXyz = renderToStaticMarkup(
      React.createElement(InspectorHUD, { selectedIso: "XYZ" })
    );
    assert.equal(htmlXyz, "", "InspectorHUD não deve renderizar para país inexistente");
  });

  test("5. ReaderContent exibe estado vazio honesto sem citações fictícias quando não há dossiê", () => {
    const cod = getCountryData("COD");
    assert.ok(cod);

    const htmlEmpty = renderToStaticMarkup(
      React.createElement(ReaderContent, { country: cod, dimension: "GEOGRAPHY" })
    );
    assert.ok(htmlEmpty.includes('data-testid="reader-empty-state"'));
    assert.ok(htmlEmpty.includes("Este dossiê ainda não foi escrito"));
    assert.ok(htmlEmpty.includes("https://pt.wikipedia.org/wiki/"));
    assert.ok(htmlEmpty.includes("https://data.worldbank.org/country/COD"));
    assert.ok(!htmlEmpty.includes("Document Archive"));
    assert.ok(!htmlEmpty.includes("Arquivo Histórico e Constitucional Oficial"));
    assert.ok(!htmlEmpty.includes("está em constante expansão"));
    assert.ok(!htmlEmpty.includes("Citar Verbete"));
    assert.ok(!htmlEmpty.includes("footnote-1"));

    // With wikidataQid present on a country without that specific dimension
    const withQid = { ...cod, wikidataQid: "Q974" };
    const htmlWithQid = renderToStaticMarkup(
      React.createElement(ReaderContent, { country: withQid, dimension: "HISTORY" })
    );
    assert.ok(htmlWithQid.includes("https://www.wikidata.org/wiki/Q974"));

    // HTML5 phrasing invariant: no <div> inside <p>
    const pBlocks = htmlEmpty.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const p of pBlocks) {
      assert.ok(!p.includes("<div"), `<p> não pode conter <div>: ${p}`);
    }
  });

  test("6. ComparisonGrid omite ISOs inexistentes e exibe 'Dado indisponível' para campos nulos", () => {
    useComparatorStore.setState({ selectedIsos: ["BRA", "COD", "MOZ", "XYZ"] });
    const html = renderToStaticMarkup(React.createElement(ComparisonGrid));
    assert.ok(html.includes("Brasil"));
    assert.ok(html.includes("República Democrática do Congo"));
    assert.ok(html.includes("Moçambique"));
    assert.ok(!html.includes("XYZ"));
    assert.ok(html.includes("Dado indisponível"));
    assert.ok(!html.includes("10.000.000"));
    assert.ok(!html.includes("15.000.000"));
    assert.ok(!html.includes("Capital Central"));
  });

  test("7. GET /api/countries/[iso] retorna 404 para XYZ e 200 com dados reais para COD e BRA", async () => {
    const reqXyz = new NextRequest("http://127.0.0.1:3003/api/countries/XYZ");
    const resXyz = await getCountryApi(reqXyz, { params: Promise.resolve({ iso: "XYZ" }) });
    assert.equal(resXyz.status, 404);
    const bodyXyz = await resXyz.json();
    assert.equal(bodyXyz.error, "Country not found");

    const reqCod = new NextRequest("http://127.0.0.1:3003/api/countries/COD");
    const resCod = await getCountryApi(reqCod, { params: Promise.resolve({ iso: "COD" }) });
    assert.equal(resCod.status, 200);
    const bodyCod = await resCod.json();
    assert.equal(bodyCod.isoCode, "COD");
    assert.equal(bodyCod.nameCommon, "República Democrática do Congo");
    assert.equal(bodyCod.completeness, "none");
    assert.equal(bodyCod.population, null);
    assert.equal(bodyCod.areaKm2, null);

    const reqBra = new NextRequest("http://127.0.0.1:3003/api/countries/BRA");
    const resBra = await getCountryApi(reqBra, { params: Promise.resolve({ iso: "BRA" }) });
    assert.equal(resBra.status, 200);
    const bodyBra = await resBra.json();
    assert.equal(bodyBra.isoCode, "BRA");
    assert.equal(bodyBra.nameCommon, "Brasil");
  });
});
