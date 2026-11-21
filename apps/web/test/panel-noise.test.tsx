/**
 * D16 — Reduzir ruído visual dos painéis: Observatório com cards compactos e opções recolhidas,
 * métricas do país com nome inteiro e fonte no rodapé, marcos com ações só no selecionado.
 */
import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ObservatoryPanel } from "../src/components/observatory/ObservatoryPanel";
import { CountryMetricsGrid } from "../src/components/hud/CountryMetricsGrid";
import { CountryMiniTimeline } from "../src/components/hud/CountryMiniTimeline";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { useTimelineStore } from "../src/stores/timelineStore";
import { PILOT_COUNTRIES } from "../src/lib/country-data";
import type { ObservatoryLayerId } from "../src/lib/observatory-data";
import { calculateIssPosition } from "../src/lib/satellites";

const ALL: ObservatoryLayerId[] = ["NASA_FIRMS", "NASA_EONET", "ISS_SATELLITES", "FLIGHTS_OPENSKY", "MARITIME_ROUTES"];
const count = (html: string, s: string) => html.split(s).length - 1;

describe("D16: Observatório compacto", () => {
  beforeEach(() => {
    useObservatoryStore.getState().resetObservatory();
    // A telemetria da ISS sai do SGP4 quando a camada carrega (T35: o satellite.js é sob demanda).
    useObservatoryStore.setState({ isPanelOpen: true, activeLayers: [...ALL], issTelemetry: calculateIssPosition() });
    useTimelineStore.setState({ selectedYear: 2024, geologicalMa: null, selectedMilestoneId: null });
  });

  test("com as 5 camadas ligadas, cada card mostra só nome, contagem, status e ações; opções recolhidas", () => {
    const html = renderToStaticMarkup(<ObservatoryPanel />);
    for (const id of ALL) {
      assert.ok(html.includes(`data-testid="layer-card-${id}"`), id);
      assert.ok(html.includes(`data-testid="layer-source-${id}"`), `status da fonte de ${id} visível`);
      assert.ok(html.includes(`data-testid="layer-options-toggle-${id}"`), `botão de opções de ${id}`);
      assert.ok(!html.includes(`data-testid="layer-options-${id}"`), `opções de ${id} recolhidas`);
    }
    assert.equal(count(html, "Aprofundar no TellusLab"), 0, "TellusLab não é repetido em cada card");
    assert.ok(!html.includes(">Anomalias térmicas globais"), "descrição longa fica nas opções (só no title do nome)");
    assert.equal(count(html, 'aria-expanded="false"'), 5);
    assert.match(html, /Altitude: \d{3}(,\d)? km/, "altitude em pt-BR, da telemetria calculada");
    assert.match(html, />\d+ voos</);
    assert.match(html, />\d+ embarcações</);
  });

  test("ao abrir as opções: descrição, controles, opacidade e o TellusLab como ação secundária", () => {
    const html = renderToStaticMarkup(<ObservatoryPanel initialExpanded={["NASA_FIRMS"]} />);
    assert.ok(html.includes('data-testid="layer-options-NASA_FIRMS"'));
    assert.ok(html.includes('aria-controls="layer-options-NASA_FIRMS"') && html.includes('aria-expanded="true"'));
    assert.ok(html.includes("Anomalias térmicas globais"));
    assert.ok(html.includes('data-testid="layer-opacity-NASA_FIRMS"'));
    assert.ok(html.includes('aria-valuetext="100%"'));
    assert.ok(html.includes("<summary") && count(html, "Aprofundar no TellusLab") === 1, "TellusLab recolhido num <details>");
    assert.equal((html.match(/data-testid="layer-options-(?!toggle)/g) ?? []).length, 1, "só a camada aberta mostra opções");
  });

  test("opacidade da camada vai para o store que as camadas do globo já leem", () => {
    useObservatoryStore.getState().setLayerOpacity("NASA_EONET", 0.35);
    const html = renderToStaticMarkup(<ObservatoryPanel initialExpanded={["NASA_EONET"]} />);
    assert.ok(html.includes('aria-valuetext="35%"'));
    assert.ok(html.includes(">35%<"));
  });

  test("camada desligada mostra a fonte e não tem botão de opções", () => {
    useObservatoryStore.setState({ activeLayers: [] });
    const html = renderToStaticMarkup(<ObservatoryPanel />);
    assert.ok(html.includes("NASA MODIS / VIIRS"));
    assert.equal(count(html, "layer-options-toggle-"), 0);
  });
});

describe("D16: Inspector do país", () => {
  test("métrica com o nome inteiro e a fonte, código e ano no rodapé (RN02); citação como ação secundária", () => {
    const html = renderToStaticMarkup(
      <CountryMetricsGrid
        countryName="Brasil"
        isoCode="BRA"
        population={214_300_000}
        areaKm2={8_515_767}
        currencyCode="BRL"
        currencyName="Real"
        governmentType="República Federativa Presidencialista"
        headOfState="Presidente"
        indicators={[
          { indicatorCode: "SP.DYN.LE00.IN", indicatorName: "Expectativa de vida", value: 76.2, unit: "anos", sourcePrimary: "OMS", year: 2022 },
          { indicatorCode: "SP.POP.TOTL", indicatorName: "População", value: 214_300_000, unit: "hab", sourcePrimary: "IBGE / Banco Mundial", year: 2023 },
        ]}
      />
    );
    assert.ok(html.includes(">Expectativa de vida<"), "nome inteiro, sem abreviação");
    assert.ok(html.includes("· SP.DYN.LE00.IN · 2022"), "código e ano visíveis");
    assert.ok(html.includes("· SP.POP.TOTL · 2023"));
    assert.ok(html.includes(">IBGE / BM<"), "fonte primária com link");
    assert.ok(html.includes("Fonte Primária: OMS (SP.DYN.LE00.IN, 2022) (Abrir Repositório)"));
    assert.ok(count(html, 'aria-label="Gerar citação deste indicador"') >= 3);
    assert.match(html, /group-hover:opacity-100/, "citação aparece ao passar o mouse");
    assert.match(html, /focus-visible:opacity-100/, "e ao focar pelo teclado");
    assert.ok(html.includes('aria-label="Gerar citação institucional"'));
    assert.ok(html.includes(">Constituições / ONU<"), "fonte institucional por extenso, sem abreviar");
  });

  test("marcos: o cartão é um botão; ações só no marco selecionado", () => {
    const milestones = PILOT_COUNTRIES.BRA.milestones.slice(0, 3);
    useTimelineStore.setState({ selectedMilestoneId: null });
    const none = renderToStaticMarkup(<CountryMiniTimeline milestones={milestones} countryName="Brasil" />);
    assert.equal(count(none, 'aria-pressed="false"'), milestones.length);
    assert.equal(count(none, ">Citar<"), 0);
    assert.equal(count(none, ">Focar<"), 0, "focar é o próprio cartão");

    useTimelineStore.setState({ selectedMilestoneId: milestones[1].id });
    const one = renderToStaticMarkup(<CountryMiniTimeline milestones={milestones} countryName="Brasil" />);
    assert.equal(count(one, 'aria-pressed="true"'), 1);
    assert.equal(count(one, ">Citar<"), 1);
    assert.equal(count(one, ">Ler dossiê<"), 1);
    assert.equal(count(one, ">Wikipédia<"), 1);
    // Nada de <p> dentro do botão (conteúdo de fraseamento).
    assert.doesNotMatch(one, /<button[^>]*>(?:(?!<\/button>)[\s\S])*<(p|div)\b/);
  });
});
