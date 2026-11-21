import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { getAllCountries, getCountryData } from "../src/lib/country-data";
import { buildCountryAnalyticalProfile } from "../src/lib/country-analytics";
import { ReaderContent } from "../src/components/reader/ReaderContent";
import { ReaderTableOfContents } from "../src/components/reader/ReaderTableOfContents";
import { formatABNT, formatAPA, formatMLA, formatBibTeX } from "../src/lib/citations";
import { useReaderStore } from "../src/stores/readerStore";
import { useGlobeStore } from "../src/stores/globeStore";

describe("T38 · Modo de leitura analítico para todos os 177 países", () => {
  beforeEach(() => {
    useReaderStore.setState({ activeDimension: "GEOGRAPHY", isCitationModalOpen: false });
    useGlobeStore.setState({ selectedIso: null, isReaderOpen: false });
  });
  afterEach(() => {
    useReaderStore.setState({ activeDimension: "GEOGRAPHY", isCitationModalOpen: false });
    useGlobeStore.setState({ selectedIso: null, isReaderOpen: false });
  });

  test("1. buildCountryAnalyticalProfile gera perfil válido para todos os 177 países sem valores sintéticos", () => {
    const all = getAllCountries();
    assert.ok(all.length >= 177);

    let withRankings = 0;
    let withPeers = 0;

    for (const c of all) {
      const profile = buildCountryAnalyticalProfile(c);
      assert.ok(profile, `Perfil deve ser gerado para ${c.isoCode}`);
      assert.equal(profile.isoCode, c.isoCode);
      assert.equal(profile.nameCommon, c.nameCommon);

      if (profile.hasQuantitativeData) {
        withRankings += 1;
        for (const r of profile.rankings) {
          assert.ok(r.globalRank >= 1 && r.globalRank <= r.globalTotal, `${c.isoCode}/${r.code} ranking fora da faixa`);
          assert.ok(r.globalPercentile >= 0 && r.globalPercentile <= 100);
          assert.match(r.sourceUrl, /^https:\/\//);
          if (r.regionalRank !== null) {
            assert.ok(r.regionalRank >= 1 && r.regionalRank <= r.regionalTotal);
            assert.ok(r.regionalAverage !== null && Number.isFinite(r.regionalAverage));
          }
        }
      }
      if (profile.peers.length > 0) withPeers += 1;
    }

    assert.ok(withRankings >= 170, `>= 170 países devem ter rankings reais (obtido: ${withRankings})`);
    assert.ok(withPeers >= 165, `>= 165 países devem ter pares comparáveis reais (obtido: ${withPeers})`);
  });

  test("2. Rankings globais e médias regionais respeitam ordenação real (ex.: EUA #1 PIB, Brasil #1 América do Sul)", () => {
    const usa = buildCountryAnalyticalProfile("USA");
    const bra = buildCountryAnalyticalProfile("BRA");
    const arg = buildCountryAnalyticalProfile("ARG");
    const cyn = buildCountryAnalyticalProfile("CYN");

    assert.ok(usa && bra && arg && cyn);

    const usaGdp = usa.rankings.find((r) => r.code === "NY.GDP.MKTP.CD");
    assert.equal(usaGdp?.globalRank, 1, "EUA devem ser #1 em PIB nominal");

    const braGdp = bra.rankings.find((r) => r.code === "NY.GDP.MKTP.CD");
    assert.equal(braGdp?.regionalGroupName, "América do Sul");
    assert.equal(braGdp?.regionalRank, 1, "Brasil deve ser #1 em PIB na América do Sul");
    assert.ok((braGdp?.deltaVsRegionalAvgPct ?? 0) > 0, "PIB do Brasil deve ficar acima da média sul-americana");

    // País não-piloto (Argentina) tem rankings, média regional, densidade e pares reais
    assert.ok(arg.rankings.length >= 7);
    assert.ok(arg.populationDensityPerKm2 !== null && arg.populationDensityPerKm2 > 5);
    assert.ok(arg.peers.length === 4);
    assert.ok(!arg.peers.some((p) => p.isoCode === "ARG"));
    assert.ok(arg.summarySentences.some((s) => s.includes("Buenos Aires")));

    // Território sem séries no Banco Mundial (CYN) não recebe rankings sintéticos
    assert.equal(cyn.hasQuantitativeData, false);
    assert.equal(cyn.rankings.length, 0);
    assert.equal(cyn.peers.length, 0);
  });

  test("3. ReaderContent renderiza Perfil Analítico com rankings, comparação regional, pares, citação e zero <div> dentro de <p>", () => {
    const arg = getCountryData("ARG");
    assert.ok(arg);

    const html = renderToStaticMarkup(
      React.createElement(ReaderContent, { country: arg, dimension: "ANALYTICAL_PROFILE" })
    );
    assert.match(html, /data-testid="reader-analytical-profile"/);
    assert.match(html, /Argentina — Perfil Analítico/);
    assert.match(html, /data-testid="cite-analytical-profile"/);
    assert.match(html, /data-testid="analytical-rank-NY\.GDP\.MKTP\.CD"/);
    assert.match(html, /América do Sul/);
    assert.match(html, /data-testid="compare-with-peers-button"/);
    assert.match(html, /https:\/\/data\.worldbank\.org\/indicator\/NY\.GDP\.MKTP\.CD/);

    // Invariante HTML5 (AGENTS.md §4): zero <div> dentro de <p>
    const pBlocks = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const p of pBlocks) {
      assert.ok(!p.includes("<div"), `<p> não pode conter <div>: ${p}`);
    }

    // Território sem dados quantitativos (CYN) exibe aviso honesto sem rankings falsos
    const cyn = getCountryData("CYN");
    assert.ok(cyn);
    const cynHtml = renderToStaticMarkup(
      React.createElement(ReaderContent, { country: cyn, dimension: "ANALYTICAL_PROFILE" })
    );
    assert.match(cynHtml, /data-testid="analytical-no-quantitative-data"/);
    assert.match(cynHtml, /Nenhum ranking ou estimativa sintética/);
  });

  test("4. Sumário do Reader inclui Perfil Analítico e geradores de citação (ABNT/APA/MLA/BibTeX) suportam qualquer um dos 177 países", () => {
    const tocHtml = renderToStaticMarkup(React.createElement(ReaderTableOfContents));
    assert.match(tocHtml, /Perfil Analítico/);

    const params = {
      title: "Perfil Analítico e Posição Global: Argentina (ARG)",
      countryName: "Argentina",
      url: "https://telluspedia.org/pais/ARG",
      accessDate: new Date("2026-11-21T12:00:00Z"),
      publicationYear: 2026,
    };

    assert.match(formatABNT(params), /Argentina/);
    assert.match(formatAPA(params), /Argentina/);
    assert.match(formatMLA(params), /Argentina/);
    assert.match(formatBibTeX(params), /Argentina/);
  });
});
