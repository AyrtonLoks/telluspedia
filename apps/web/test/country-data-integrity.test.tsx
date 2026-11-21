import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextRequest } from "next/server";
import {
  type CountryIndicator,
  getAllCountries,
  getCountryData,
  WORLD_BANK_COUNTRIES,
  WORLD_BANK_INDICATOR_SPECS,
  WORLD_BANK_METADATA,
  WORLD_COUNTRIES_CATALOG,
  WORLD_COUNTRIES_METADATA,
} from "../src/lib/country-data";
import { getSourceUrl } from "../src/lib/citations";
import { InspectorHUD } from "../src/components/hud/InspectorHUD";
import { ReaderContent } from "../src/components/reader/ReaderContent";
import { ComparisonGrid } from "../src/components/comparator/ComparisonGrid";
import { GET as getCountriesListApi } from "../src/app/api/countries/route";
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
    geologicalMa: null,
  });
  useComparatorStore.setState({ selectedIsos: [], isOpen: false });
}

describe("T03 + T26 — Integridade de dados de países e ingestão real do Banco Mundial (RN02)", () => {
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

  test("2. Dataset versionado do Banco Mundial cobre o catálogo de 177 países com metadados RN02 íntegros", () => {
    assert.ok(WORLD_COUNTRIES_METADATA.source.includes("Natural Earth"));
    assert.ok(WORLD_COUNTRIES_METADATA.sourceUrl.startsWith("https://"));
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(WORLD_COUNTRIES_METADATA.referenceDate));

    const catalogIsos = Object.keys(WORLD_COUNTRIES_CATALOG);
    assert.ok(catalogIsos.length >= 177);

    // Metadados RN02 do Banco Mundial e REST Countries
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(WORLD_BANK_METADATA.worldBankLastUpdated));
    assert.ok(WORLD_BANK_METADATA.sources.some((s) => s.id === "world-bank-wdi" && s.license === "CC BY 4.0"));
    assert.ok(WORLD_BANK_METADATA.sources.some((s) => s.id === "rest-countries"));

    const expectedCodes = [
      "SP.POP.TOTL",
      "NY.GDP.MKTP.CD",
      "NY.GDP.PCAP.CD",
      "AG.SRF.TOTL.K2",
      "SP.DYN.LE00.IN",
      "MS.MIL.XPND.GD.ZS",
      "EG.FEC.RNEW.ZS",
      "EN.GHG.CO2.PC.CE.AR5",
    ];
    for (const code of expectedCodes) {
      const spec = WORLD_BANK_INDICATOR_SPECS.find((s) => s.code === code);
      assert.ok(spec, `Série oficial ${code} deve existir em WORLD_BANK_INDICATOR_SPECS`);
      assert.equal(spec.sourcePrimary, "Banco Mundial");
      assert.equal(getSourceUrl("Banco Mundial", code), `https://data.worldbank.org/indicator/${code}`);
    }

    let withPop = 0;
    let withGdp = 0;
    let withArea = 0;
    let withLife = 0;
    let withMil = 0;

    for (const iso of catalogIsos) {
      const entry = WORLD_BANK_COUNTRIES[iso];
      assert.ok(entry, `País ${iso} do catálogo Natural Earth deve constar no dataset do Banco Mundial`);

      for (const [code, reading] of Object.entries(entry.indicators)) {
        assert.ok(expectedCodes.includes(code), `Código de indicador inesperado ${code} em ${iso}`);
        assert.equal(typeof reading.value, "number", `${iso}/${code} deve ser numérico`);
        assert.ok(Number.isFinite(reading.value) && reading.value >= 0, `${iso}/${code} fora de faixa válida`);
        assert.ok(
          Number.isInteger(reading.year) && reading.year >= 1960 && reading.year <= 2100,
          `${iso}/${code} ano inválido: ${reading.year}`
        );
        if (code === "SP.DYN.LE00.IN") {
          assert.ok(reading.value > 20 && reading.value < 100, `Expectativa de vida incoerente em ${iso}: ${reading.value}`);
        }
        if (code === "MS.MIL.XPND.GD.ZS") {
          assert.ok(reading.value <= 100, `Gasto militar (% PIB) incoerente em ${iso}: ${reading.value}`);
        }
      }

      if (entry.indicators["SP.POP.TOTL"]) withPop += 1;
      if (entry.indicators["NY.GDP.MKTP.CD"]) withGdp += 1;
      if (entry.indicators["AG.SRF.TOTL.K2"]) withArea += 1;
      if (entry.indicators["SP.DYN.LE00.IN"]) withLife += 1;
      if (entry.indicators["MS.MIL.XPND.GD.ZS"]) withMil += 1;
    }

    assert.ok(withPop >= 165, `Esperava >= 165 países com população real, obtive ${withPop}`);
    assert.ok(withGdp >= 165, `Esperava >= 165 países com PIB real, obtive ${withGdp}`);
    assert.ok(withArea >= 165, `Esperava >= 165 países com área real, obtive ${withArea}`);
    assert.ok(withLife >= 165, `Esperava >= 165 países com expectativa de vida real, obtive ${withLife}`);
    assert.ok(withMil >= 150, `Esperava >= 150 países com gastos militares reais, obtive ${withMil}`);
  });

  test("3. COD, KAZ, MOZ, PER e BRA expõem indicadores oficiais do Banco Mundial com ano e URL sem inventar campos ausentes", () => {
    const cod = getCountryData("COD");
    assert.ok(cod, "COD deve existir no catálogo");
    assert.equal(cod.nameCommon, "República Democrática do Congo");
    assert.equal(cod.nameOfficial, "República Democrática do Congo");
    assert.equal(cod.capital, "Kinshasa");
    assert.equal(cod.currencyCode, "CDF");
    assert.equal(cod.iso2, "CD");
    assert.equal(cod.numericCode, "180");
    assert.equal(cod.completeness, "partial");
    assert.ok(cod.population !== null && cod.population > 80_000_000);
    assert.ok(cod.areaKm2 !== null && cod.areaKm2 > 2_000_000);
    assert.equal(cod.governmentType, null, "Regime político não ingerido permanece null");
    assert.equal(cod.headOfState, null, "Chefia de Estado não ingerida permanece null");
    assert.equal(cod.summary, null, "Resumo editorial não escrito permanece null");
    assert.equal(cod.indicators.find((i) => i.indicatorCode === "UNDP.HDI"), undefined, "IDH não ingerido não deve ser inventado");

    for (const code of ["SP.POP.TOTL", "NY.GDP.MKTP.CD", "AG.SRF.TOTL.K2", "SP.DYN.LE00.IN", "MS.MIL.XPND.GD.ZS"]) {
      const ind: CountryIndicator | undefined = cod.indicators.find((i) => i.indicatorCode === code);
      assert.ok(ind, `COD deve possuir indicador real ${code}`);
      assert.equal(ind.sourcePrimary, "Banco Mundial");
      assert.ok(ind.year >= 2015 && ind.year <= 2030);
      assert.equal(ind.sourceUrl, `https://data.worldbank.org/indicator/${code}?locations=CD`);
    }

    const kaz = getCountryData("KAZ");
    assert.ok(kaz, "KAZ deve existir");
    assert.equal(kaz.nameCommon, "Cazaquistão");
    assert.equal(kaz.capital, "Astana");
    assert.equal(kaz.currencyCode, "KZT");
    assert.equal(kaz.completeness, "partial");
    assert.ok(kaz.population !== null && kaz.population > 18_000_000);
    assert.ok(kaz.areaKm2 !== null && kaz.areaKm2 > 2_500_000);
    assert.ok(kaz.indicators.some((i) => i.indicatorCode === "NY.GDP.MKTP.CD"));

    const moz = getCountryData("MOZ");
    assert.ok(moz);
    assert.equal(moz.nameCommon, "Moçambique");
    assert.equal(moz.capital, "Maputo");
    assert.equal(moz.currencyCode, "MZN");
    assert.equal(moz.completeness, "partial");
    assert.ok(moz.population !== null && moz.population > 25_000_000 && moz.population !== 15_000_000);
    assert.ok(moz.areaKm2 !== null && moz.areaKm2 > 700_000 && moz.areaKm2 !== 350_000);
    assert.equal(moz.governmentType, null);
    assert.equal(moz.headOfState, null);
    assert.equal(moz.summary, null);

    const per = getCountryData("PER");
    assert.ok(per);
    assert.equal(per.nameCommon, "Peru");
    assert.equal(per.capital, "Lima");
    assert.equal(per.completeness, "partial");
    assert.ok(per.population !== null && per.population > 30_000_000);
    assert.ok(per.indicators.some((i) => i.indicatorCode === "NY.GDP.MKTP.CD"));
    assert.ok(per.indicators.some((i) => i.indicatorCode === "AG.SRF.TOTL.K2"));
    assert.equal(per.dossierSections.length, 0);

    const bra = getCountryData("BRA");
    assert.ok(bra);
    assert.equal(bra.completeness, "full");
    assert.ok(bra.indicators.some((i) => i.indicatorCode === "AG.SRF.TOTL.K2"));
    assert.ok(bra.dossierSections.length > 0);
  });

  test("4. Ausências reais na API do Banco Mundial (CYN, ATA, PRK) permanecem null e exibem 'Dado indisponível'", () => {
    const cyn = getCountryData("CYN");
    assert.ok(cyn, "CYN existe no catálogo Natural Earth");
    assert.equal(cyn.completeness, "none");
    assert.equal(cyn.population, null);
    assert.equal(cyn.areaKm2, null);
    assert.equal(cyn.capital, null);
    assert.equal(cyn.indicators.length, 0);

    const ata = getCountryData("ATA");
    assert.ok(ata, "ATA existe no catálogo Natural Earth");
    assert.equal(ata.completeness, "none");
    assert.equal(ata.population, null);
    assert.equal(ata.areaKm2, null);
    assert.equal(ata.capital, null);
    assert.equal(ata.indicators.length, 0);

    // PRK tem população e área no Banco Mundial, mas não possui PIB nominal publicado
    const prk = getCountryData("PRK");
    assert.ok(prk);
    assert.ok(prk.population !== null && prk.population > 20_000_000);
    assert.equal(prk.indicators.find((i) => i.indicatorCode === "NY.GDP.MKTP.CD"), undefined);

    const htmlPrk = renderToStaticMarkup(React.createElement(InspectorHUD, { selectedIso: "PRK" }));
    assert.ok(htmlPrk.includes("SP.POP.TOTL"));
    assert.ok(htmlPrk.includes("Dado indisponível"), "PIB e IDH ausentes em PRK devem renderizar 'Dado indisponível'");

    const htmlCyn = renderToStaticMarkup(React.createElement(InspectorHUD, { selectedIso: "CYN" }));
    assert.ok(htmlCyn.includes('data-completeness="none"'));
    assert.ok(htmlCyn.includes('data-testid="country-data-unavailable"'));
    assert.ok(htmlCyn.includes("Dado indisponível"));
    assert.ok(!htmlCyn.includes("10.000.000"));
    assert.ok(!htmlCyn.includes("Capital Central"));
  });

  test("5. InspectorHUD exibe população, área e PIB reais com ano e link da fonte para COD e KAZ, e null para XYZ", () => {
    const htmlCod = renderToStaticMarkup(
      React.createElement(InspectorHUD, { selectedIso: "COD" })
    );
    assert.ok(htmlCod.includes("República Democrática do Congo"));
    assert.ok(htmlCod.includes("Kinshasa"));
    assert.ok(htmlCod.includes('data-completeness="partial"'));
    assert.ok(htmlCod.includes('data-testid="inspector-summary-unavailable"'));
    assert.ok(htmlCod.includes("SP.POP.TOTL · "));
    assert.ok(htmlCod.includes("AG.SRF.TOTL.K2 · "));
    assert.ok(htmlCod.includes("NY.GDP.MKTP.CD · "));
    assert.ok(htmlCod.includes("https://data.worldbank.org/indicator/SP.POP.TOTL?locations=CD"));
    assert.ok(htmlCod.includes("https://data.worldbank.org/indicator/AG.SRF.TOTL.K2?locations=CD"));
    assert.ok(htmlCod.includes("https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=CD"));
    assert.ok(htmlCod.includes("Dado indisponível"), "IDH e regime político ausentes em COD continuam como Dado indisponível");
    assert.ok(!htmlCod.includes("Nação Soberana"));
    assert.ok(!htmlCod.includes("Capital Central"));

    const htmlKaz = renderToStaticMarkup(
      React.createElement(InspectorHUD, { selectedIso: "KAZ" })
    );
    assert.ok(htmlKaz.includes("Cazaquistão"));
    assert.ok(htmlKaz.includes("Astana"));
    assert.ok(htmlKaz.includes("https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=KZ"));

    const htmlXyz = renderToStaticMarkup(
      React.createElement(InspectorHUD, { selectedIso: "XYZ" })
    );
    assert.equal(htmlXyz, "", "InspectorHUD não deve renderizar para país inexistente");
  });

  test("6. ReaderContent exibe estado vazio honesto sem citações fictícias quando não há dossiê", () => {
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

  test("7. ComparisonGrid omite ISOs inexistentes, exibe anos dos indicadores reais e 'Dado indisponível' para nulos", () => {
    useComparatorStore.setState({ selectedIsos: ["BRA", "COD", "CYN", "XYZ"] });
    const html = renderToStaticMarkup(React.createElement(ComparisonGrid));
    assert.ok(html.includes("Brasil"));
    assert.ok(html.includes("República Democrática do Congo"));
    assert.ok(html.includes("Chipre do Norte"));
    assert.ok(!html.includes("XYZ"));
    assert.ok(html.includes("Kinshasa"));
    assert.ok(html.includes("Dado indisponível"));
    assert.ok(!html.includes("10.000.000"));
    assert.ok(!html.includes("Capital Central"));
  });

  test("8. GET /api/countries retorna catálogo completo (177 países) e GET /api/countries/[iso] retorna dados reais e 404 para XYZ", async () => {
    const allCatalog = getAllCountries();
    assert.ok(allCatalog.length >= 177);

    const listRes = await getCountriesListApi();
    assert.equal(listRes.status, 200);
    const listBody = (await listRes.json()) as Array<{
      isoCode: string;
      population: number | null;
      areaKm2: number | null;
      completeness: string;
      indicators: Array<{ indicatorCode: string }>;
    }>;
    assert.ok(listBody.length >= 177, `GET /api/countries deve retornar >= 177 países, retornou ${listBody.length}`);
    const codInList = listBody.find((c) => c.isoCode === "COD");
    assert.ok(codInList && codInList.population !== null && codInList.population > 80_000_000);
    assert.ok(codInList.indicators.some((i) => i.indicatorCode === "NY.GDP.MKTP.CD"));
    const cynInList = listBody.find((c) => c.isoCode === "CYN");
    assert.ok(cynInList);
    assert.equal(cynInList.population, null, "CYN não pode converter null para 0");
    assert.equal(cynInList.areaKm2, null);

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
    assert.equal(bodyCod.completeness, "partial");
    assert.ok(bodyCod.population > 80_000_000);
    assert.ok(bodyCod.areaKm2 > 2_000_000);

    const reqCyn = new NextRequest("http://127.0.0.1:3003/api/countries/CYN");
    const resCyn = await getCountryApi(reqCyn, { params: Promise.resolve({ iso: "CYN" }) });
    assert.equal(resCyn.status, 200);
    const bodyCyn = await resCyn.json();
    assert.equal(bodyCyn.completeness, "none");
    assert.equal(bodyCyn.population, null);
    assert.equal(bodyCyn.areaKm2, null);

    const reqBra = new NextRequest("http://127.0.0.1:3003/api/countries/BRA");
    const resBra = await getCountryApi(reqBra, { params: Promise.resolve({ iso: "BRA" }) });
    assert.equal(resBra.status, 200);
    const bodyBra = await resBra.json();
    assert.equal(bodyBra.isoCode, "BRA");
    assert.equal(bodyBra.nameCommon, "Brasil");
  });
});
