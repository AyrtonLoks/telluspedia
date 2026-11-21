import { resetGlobeView, selectCountry } from "../src/stores/actions";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatABNT, formatAPA, formatMLA, formatBibTeX, getSourceUrl, copyToClipboard } from "../src/lib/citations";
import { useReaderStore } from "../src/stores/readerStore";

describe("Academic Citations Formatting (ABNT, APA, MLA, BibTeX)", () => {
  const params = {
    title: "Sistema Político e Constituição de 1988",
    countryName: "Brasil",
    url: "https://telluspedia.org/pais/BRA/politica",
    accessDate: new Date("2026-10-19T00:00:00Z"),
    publicationYear: 2026,
  };

  test("ABNT NBR 6023 compliance", () => {
    const abnt = formatABNT(params);
    assert.ok(abnt.includes("TELLUSPEDIA. BRASIL: Sistema Político e Constituição de 1988."));
    assert.ok(abnt.includes("Disponível em: <https://telluspedia.org/pais/BRA/politica>"));
    assert.ok(abnt.includes("Acesso em:"));
  });

  test("APA 7th edition compliance", () => {
    const apa = formatAPA(params);
    assert.ok(apa.includes("TellusPedia. (2026). Brasil: Sistema Político e Constituição de 1988."));
    assert.ok(apa.includes("Retrieved"));
    assert.ok(apa.includes("from https://telluspedia.org/pais/BRA/politica"));
  });

  test("MLA 9th edition compliance", () => {
    const mla = formatMLA(params);
    assert.ok(mla.includes('"Brasil: Sistema Político e Constituição de 1988."'));
    assert.ok(mla.includes("TellusPedia Foundation, 2026"));
    assert.ok(mla.includes("Accessed"));
  });

  test("BibTeX (.bib) format compliance", () => {
    const bib = formatBibTeX(params);
    assert.ok(bib.includes("@online{telluspedia_brasil_2026,"));
    assert.ok(bib.includes("author       = {{TellusPedia Editorial Board}}"));
    assert.ok(bib.includes("url          = {https://telluspedia.org/pais/BRA/politica}"));
  });
});

describe("Primary Data Source URLs & Reader Citation Workflow", () => {
  test("getSourceUrl maps World Bank indicator codes to exact repository URLs", () => {
    assert.equal(
      getSourceUrl("Banco Mundial", "NY.GDP.MKTP.CD"),
      "https://data.worldbank.org/indicator/NY.GDP.MKTP.CD"
    );
    assert.equal(
      getSourceUrl("IBGE / Banco Mundial", "SP.POP.TOTL"),
      "https://data.worldbank.org/indicator/SP.POP.TOTL"
    );
    assert.equal(
      getSourceUrl("World Bank", "NY.GDP.PCAP.CD"),
      "https://data.worldbank.org/indicator/NY.GDP.PCAP.CD"
    );
    assert.equal(
      getSourceUrl("Banco Mundial"),
      "https://data.worldbank.org/"
    );
  });

  test("getSourceUrl maps institutional repositories accurately", () => {
    assert.equal(getSourceUrl("PNUD"), "https://hdr.undp.org/data-center/human-development-index");
    assert.equal(getSourceUrl("UNDP"), "https://hdr.undp.org/data-center/human-development-index");
    assert.equal(getSourceUrl("OMS"), "https://www.who.int/data/gho");
    assert.equal(getSourceUrl("WHO"), "https://www.who.int/data/gho");
    assert.equal(getSourceUrl("SIPRI"), "https://www.sipri.org/databases/milex");
    assert.equal(getSourceUrl("Natural Earth"), "https://www.naturalearthdata.com/");
    assert.equal(getSourceUrl("IBGE"), "https://www.ibge.gov.br/");
    assert.equal(getSourceUrl("ONU"), "https://data.un.org/");
    assert.equal(getSourceUrl("Divisão de Estatística da ONU"), "https://data.un.org/");
    assert.equal(getSourceUrl("ECB"), "https://www.ecb.europa.eu/");
    assert.equal(getSourceUrl("NASA"), "https://www.nasa.gov/");
    assert.equal(getSourceUrl("CERN"), "https://home.cern/");
    assert.equal(getSourceUrl("US Census Bureau"), "https://www.census.gov/");
    assert.equal(getSourceUrl("BEA"), "https://www.bea.gov/");
    assert.equal(getSourceUrl("Destatis"), "https://www.destatis.de/");
    assert.equal(getSourceUrl("Stats SA"), "https://www.statssa.gov.za/");
    assert.equal(getSourceUrl("E-Stat Japan"), "https://www.e-stat.go.jp/");
    assert.equal(getSourceUrl("CAPMAS"), "https://www.capmas.gov.eg/");
    assert.equal(getSourceUrl("IHGB"), "https://ihgb.org.br/");
    assert.equal(getSourceUrl("CDC"), "https://www.cdc.gov/");
    assert.equal(getSourceUrl("MHLW Japan"), "https://www.mhlw.go.jp/");
    assert.equal(getSourceUrl("Banco Central do Brasil"), "https://www.bcb.gov.br/");
    assert.equal(getSourceUrl("Federal Reserve"), "https://www.federalreserve.gov/");
    assert.equal(getSourceUrl("Nelson Mandela Foundation"), "https://www.nelsonmandela.org/");
    assert.equal(getSourceUrl("JR Central"), "https://global.jr-central.co.jp/");
    assert.equal(getSourceUrl("Arquivo Histórico Nacional do Japão"), "https://www.archives.go.jp/");
    assert.equal(getSourceUrl("Eurostat"), "https://ec.europa.eu/eurostat");
    assert.equal(getSourceUrl("OECD"), "https://www.oecd.org/");
    assert.equal(getSourceUrl("IMF"), "https://www.imf.org/");
    assert.equal(getSourceUrl("UNESCO"), "https://www.unesco.org/");
    assert.equal(getSourceUrl("FAO"), "https://www.fao.org/");
    assert.equal(getSourceUrl("WTO"), "https://www.wto.org/");
    assert.equal(getSourceUrl("National Archives (NARA)"), "https://www.archives.gov/");
  });

  test("getSourceUrl handles direct HTTP/HTTPS links and unknown fallbacks", () => {
    assert.equal(
      getSourceUrl("https://example.org/custom-dataset"),
      "https://example.org/custom-dataset"
    );
    assert.equal(
      getSourceUrl("http://custom.repo.org/data"),
      "http://custom.repo.org/data"
    );
    assert.equal(
      getSourceUrl("Arquivo Desconhecido Sem Mapeamento"),
      "https://data.un.org/"
    );
    assert.equal(
      getSourceUrl(undefined),
      "https://data.un.org/"
    );
  });

  test("useReaderStore resetActiveDimension restores activeDimension to GEOGRAPHY", () => {
    const store = useReaderStore.getState();
    store.setActiveDimension("GOVERNMENT_POLITICS");
    assert.equal(useReaderStore.getState().activeDimension, "GOVERNMENT_POLITICS");

    store.resetActiveDimension();
    assert.equal(useReaderStore.getState().activeDimension, "GEOGRAPHY");
  });

  test("useReaderStore customCitationParams passes and resets parameters seamlessly", () => {
    const custom = {
      title: "Expectativa de Vida ao Nascer (76.2 anos)",
      countryName: "Brasil",
      url: "https://www.who.int/data/gho",
      accessDate: new Date("2026-10-19T00:00:00Z"),
      publicationYear: 2026,
    };

    useReaderStore.getState().setCitationModalOpen(true, custom);
    const openState = useReaderStore.getState();
    assert.equal(openState.isCitationModalOpen, true);
    assert.ok(openState.customCitationParams);
    assert.equal(openState.customCitationParams.title, custom.title);
    assert.equal(openState.customCitationParams.url, custom.url);

    // Closing resets custom parameters
    useReaderStore.getState().setCitationModalOpen(false);
    const closedState = useReaderStore.getState();
    assert.equal(closedState.isCitationModalOpen, false);
    assert.equal(closedState.customCitationParams, null);
  });

  test("Academic citations with custom data source produce valid citations", () => {
    const custom = {
      title: "PIB Nominal ($ 2.17 trilhões)",
      countryName: "Brasil",
      url: "https://data.worldbank.org/indicator/NY.GDP.MKTP.CD",
      accessDate: new Date("2026-10-19T00:00:00Z"),
      publicationYear: 2026,
    };

    const abnt = formatABNT(custom);
    assert.ok(abnt.includes("TELLUSPEDIA. BRASIL: PIB Nominal ($ 2.17 trilhões)."));
    assert.ok(abnt.includes("Disponível em: <https://data.worldbank.org/indicator/NY.GDP.MKTP.CD>"));

    const apa = formatAPA(custom);
    assert.ok(apa.includes("TellusPedia. (2026). Brasil: PIB Nominal ($ 2.17 trilhões)."));
    assert.ok(apa.includes("https://data.worldbank.org/indicator/NY.GDP.MKTP.CD"));

    const mla = formatMLA(custom);
    assert.ok(mla.includes('"Brasil: PIB Nominal ($ 2.17 trilhões)."'));
    assert.ok(mla.includes("https://data.worldbank.org/indicator/NY.GDP.MKTP.CD"));

    const bib = formatBibTeX(custom);
    assert.ok(bib.includes("url          = {https://data.worldbank.org/indicator/NY.GDP.MKTP.CD}"));
  });

  test("Academic citation formatters gracefully handle missing countryName without throwing", () => {
    const withoutCountry = {
      title: "Indicador Global de Emissões",
      countryName: "",
      url: "https://data.un.org/",
      accessDate: new Date("2026-10-19T00:00:00Z"),
      publicationYear: 2026,
    };

    assert.doesNotThrow(() => {
      const abnt = formatABNT(withoutCountry);
      assert.ok(abnt.includes("TELLUSPEDIA"));
      const apa = formatAPA(withoutCountry);
      assert.ok(apa.includes("TellusPedia"));
      const mla = formatMLA(withoutCountry);
      assert.ok(mla.includes("TellusPedia"));
      const bib = formatBibTeX(withoutCountry);
      assert.ok(bib.includes("telluspedia"));
    });
  });

  test("setSelectedIso automatically resets activeDimension when changing countries", () => {
    // 1. User was reading Brazilian politics
    selectCountry("BRA");
    useReaderStore.getState().setActiveDimension("GOVERNMENT_POLITICS");
    assert.equal(useReaderStore.getState().activeDimension, "GOVERNMENT_POLITICS");

    // 2. User selects USA on the globe or search bar
    selectCountry("USA");

    // 3. activeDimension is automatically reset to "GEOGRAPHY" without manual intervention
    assert.equal(
      useReaderStore.getState().activeDimension,
      "GEOGRAPHY",
      "Selecting a different country must reset activeDimension to GEOGRAPHY"
    );
  });

  test("resetView in globeStore resets activeDimension to GEOGRAPHY", () => {
    useReaderStore.getState().setActiveDimension("GOVERNMENT_POLITICS");
    assert.equal(useReaderStore.getState().activeDimension, "GOVERNMENT_POLITICS");

    resetGlobeView();
    assert.equal(
      useReaderStore.getState().activeDimension,
      "GEOGRAPHY",
      "resetView must restore activeDimension to GEOGRAPHY"
    );
  });

  test("copyToClipboard returns boolean without throwing on unsupported contexts", async () => {
    // In Node.js test runner environment (where neither navigator.clipboard nor document exists)
    const result = await copyToClipboard("Citação de Teste");
    assert.equal(typeof result, "boolean");
    assert.equal(result, false, "Should return false cleanly in headless Node environment");
  });
});
