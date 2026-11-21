import { describe, test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { buildChoroplethDataset } from "../src/lib/choropleth-dataset";
import {
  CHOROPLETH_FIRMS_ZERO_COLOR,
  CHOROPLETH_INDICATOR_IDS,
  CHOROPLETH_INDICATORS,
  CHOROPLETH_MISSING_COLOR,
  normalizeScaleValue,
  samplePaletteColor,
} from "../src/lib/choropleth";
import {
  CHOROPLETH_TEXTURE_HEIGHT,
  CHOROPLETH_TEXTURE_WIDTH,
  createEquirectangularProjection,
  getChoroplethFeatures,
  rasterizeChoroplethToCanvas,
} from "../src/lib/choropleth-texture";
import {
  ChoroplethLegendView,
  ChoroplethSelectorView,
  ChoroplethTooltipView,
} from "../src/components/choropleth/ChoroplethHud";
import { TopNavBar } from "../src/components/nav/TopNavBar";
import { applyInitialGlobeState } from "../src/components/shell/GlobeExperienceShell";
import { useChoroplethStore } from "../src/stores/choroplethStore";
import { sanitizeStudy, studyInput } from "../src/lib/study-schema";
import { forkStudyRecord, type StudyRecord } from "../src/lib/studies-store";
import { buildStudyAcademicMarkdown } from "../src/lib/study-export";
import { runSearchResult, searchExplore } from "../src/lib/explore/search";

function createMockCanvasContext() {
  const fills: Array<string | CanvasGradient | CanvasPattern> = [];
  let clearCalls = 0;
  let fillCalls = 0;
  let strokeCalls = 0;

  const ctx = {
    fillStyle: "" as string | CanvasGradient | CanvasPattern,
    strokeStyle: "" as string | CanvasGradient | CanvasPattern,
    lineJoin: "miter",
    lineWidth: 1,
    clearRect: () => {
      clearCalls++;
    },
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    arc: () => {},
    fill: () => {
      fillCalls++;
      fills.push(ctx.fillStyle);
    },
    stroke: () => {
      strokeCalls++;
    },
  } as unknown as CanvasRenderingContext2D;

  return {
    ctx,
    getStats: () => ({ clearCalls, fillCalls, strokeCalls, fills }),
  };
}

describe("D22 · Modo Coroplético no Globo 3D", () => {
  test("1. Define os 6 indicadores reais com escalas, paletas perceptualmente uniformes e fontes RN02", () => {
    assert.deepEqual([...CHOROPLETH_INDICATOR_IDS], [
      "NY.GDP.MKTP.CD",
      "NY.GDP.PCAP.CD",
      "SP.POP.TOTL",
      "SP.DYN.LE00.IN",
      "MS.MIL.XPND.GD.ZS",
      "NASA_FIRMS",
    ]);

    for (const id of CHOROPLETH_INDICATOR_IDS) {
      const meta = CHOROPLETH_INDICATORS[id];
      assert.equal(meta.palette.length, 5, `${id} deve ter 5 stops perceptualmente uniformes`);
      assert.match(meta.sourceUrl, /^https:\/\//, `${id} deve citar URL oficial RN02`);
      assert.equal(samplePaletteColor(meta.palette, 0), meta.palette[0]);
      assert.equal(samplePaletteColor(meta.palette, 1), meta.palette[4]);
    }
  });

  test("2. Países sem dado nunca aparecem como zero e são excluídos do ranking global", () => {
    const gdp = buildChoroplethDataset("NY.GDP.MKTP.CD");
    assert.equal(gdp.totalCountries, 177);
    assert.ok(gdp.availableCount >= 165 && gdp.availableCount < 177);
    assert.equal(gdp.entries.USA.available, true);
    assert.equal(gdp.entries.USA.rank, 1);
    assert.equal(gdp.entries.BRA.available, true);
    assert.ok((gdp.entries.BRA.rank ?? 999) <= 20);

    // Antártida não possui PIB publicado no Banco Mundial — nunca pode ser 0
    assert.equal(gdp.entries.ATA.available, false);
    assert.equal(gdp.entries.ATA.value, null);
    assert.equal(gdp.entries.ATA.rank, null);
    assert.equal(gdp.entries.ATA.color, CHOROPLETH_MISSING_COLOR);
    assert.equal(gdp.entries.ATA.formattedValue, "Dado indisponível");

    // Gasto militar distingue 0% real de ausência de dado
    const mil = buildChoroplethDataset("MS.MIL.XPND.GD.ZS");
    assert.equal(mil.entries.ATA.available, false);
    assert.equal(mil.entries.ATA.value, null);
    const genuineZero = Object.values(mil.entries).find(
      (entry) => entry.available && entry.value === 0
    );
    assert.ok(genuineZero, "Países com gasto militar real 0% devem permanecer available=true");
  });

  test("3. Queimadas 24h (NASA_FIRMS) distingue servidor indisponível, 0 focos e focos ativos ranqueados", () => {
    const unavailable = buildChoroplethDataset("NASA_FIRMS", null);
    assert.equal(unavailable.isSourceUnavailable, true);
    assert.equal(unavailable.availableCount, 0);
    assert.equal(unavailable.entries.BRA.available, false);
    assert.equal(unavailable.entries.BRA.value, null);
    assert.equal(unavailable.entries.BRA.color, CHOROPLETH_MISSING_COLOR);
    assert.equal(unavailable.entries.BRA.formattedValue, "Dado indisponível");

    const live = buildChoroplethDataset("NASA_FIRMS", {
      BRA: { count: 420, frpSum: 5120.4, frpMax: 185 },
      AUS: { count: 110, frpSum: 890.2, frpMax: 72 },
    });
    assert.equal(live.isSourceUnavailable, false);
    assert.equal(live.activeCount, 2);
    assert.equal(live.entries.BRA.rank, 1);
    assert.equal(live.entries.BRA.rankTotal, 2);
    assert.equal(live.entries.AUS.rank, 2);
    assert.ok((live.entries.BRA.normalized ?? 0) > (live.entries.AUS.normalized ?? 1));
    assert.match(live.entries.BRA.extraDetail ?? "", /FRP acumulado/);

    // País sem focos na janela com servidor ativo recebe estilo distinto de "Dado indisponível"
    assert.equal(live.entries.FRA.available, true);
    assert.equal(live.entries.FRA.isZeroActivity, true);
    assert.equal(live.entries.FRA.color, CHOROPLETH_FIRMS_ZERO_COLOR);
    assert.notEqual(live.entries.FRA.color, CHOROPLETH_MISSING_COLOR);
  });

  test("4. Escala logarítmica, linear e raiz quadrada normalizam corretamente sem NaN", () => {
    assert.equal(normalizeScaleValue(10, 10, 1000, "log"), 0);
    assert.equal(normalizeScaleValue(1000, 10, 1000, "log"), 1);
    assert.ok(Math.abs(normalizeScaleValue(100, 10, 1000, "log") - 0.5) < 1e-6);
    assert.ok(Math.abs(normalizeScaleValue(25, 0, 100, "sqrt") - 0.5) < 1e-6);
    assert.equal(normalizeScaleValue(50, 50, 50, "linear"), 0.5);
  });

  test("5. Rasterizador equiretangular alinha com SphereGeometry e processa 177 países em < 100 ms", () => {
    const features = getChoroplethFeatures();
    assert.equal(features.length, 177, "Todos os 177 países do Natural Earth devem estar mapeados");

    const proj = createEquirectangularProjection(
      CHOROPLETH_TEXTURE_WIDTH,
      CHOROPLETH_TEXTURE_HEIGHT
    );
    const center = proj([0, 0]);
    const nw = proj([-180, 90]);
    const se = proj([180, -90]);
    assert.ok(center && Math.abs(center[0] - CHOROPLETH_TEXTURE_WIDTH / 2) < 1e-3);
    assert.ok(center && Math.abs(center[1] - CHOROPLETH_TEXTURE_HEIGHT / 2) < 1e-3);
    assert.ok(nw && Math.abs(nw[0]) < 1e-3 && Math.abs(nw[1]) < 1e-3);
    assert.ok(
      se &&
        Math.abs(se[0] - CHOROPLETH_TEXTURE_WIDTH) < 1e-3 &&
        Math.abs(se[1] - CHOROPLETH_TEXTURE_HEIGHT) < 1e-3
    );

    const dataset = buildChoroplethDataset("SP.DYN.LE00.IN");
    const mock = createMockCanvasContext();
    const stats = rasterizeChoroplethToCanvas(
      mock.ctx,
      dataset,
      CHOROPLETH_TEXTURE_WIDTH,
      CHOROPLETH_TEXTURE_HEIGHT
    );

    assert.equal(stats.renderedFeatures, 177);
    assert.ok(stats.availableFeatures >= dataset.availableCount);
    assert.equal(stats.availableFeatures + stats.missingFeatures, 177);
    assert.ok(stats.missingFeatures > 0);
    assert.ok(stats.durationMs < 100, `Rasterização levou ${stats.durationMs.toFixed(1)} ms (> 100 ms)`);
    assert.equal(mock.getStats().clearCalls, 1);
    assert.equal(mock.getStats().fillCalls, 177);
    assert.ok(mock.getStats().fills.includes(CHOROPLETH_MISSING_COLOR));
  });

  test("6. Componentes D14 (Seletor, Legenda contínua e Tooltip) renderizam escala, ranking e Dado indisponível", () => {
    const dataset = buildChoroplethDataset("NY.GDP.PCAP.CD");
    const selectorHtml = renderToStaticMarkup(
      <ChoroplethSelectorView
        activeIndicator="NY.GDP.PCAP.CD"
        opacity={0.8}
        isGlobeEligible={true}
        onSelect={() => {}}
        onClear={() => {}}
        onOpacityChange={() => {}}
        onReturnToContemporaryEarth={() => {}}
        onClose={() => {}}
      />
    );
    assert.match(selectorHtml, /Mapa temático coroplético/);
    assert.match(selectorHtml, /PIB per capita/);
    assert.match(selectorHtml, /Queimadas 24h/);
    assert.match(selectorHtml, /aria-checked="true"/);

    const legendHtml = renderToStaticMarkup(
      <ChoroplethLegendView
        dataset={dataset}
        onOpenSelector={() => {}}
        onClose={() => {}}
      />
    );
    assert.match(legendHtml, /choropleth-gradient-bar/);
    assert.match(legendHtml, /Dado indisponível/);
    assert.match(legendHtml, /Banco Mundial \(WDI\)/);

    const tooltipBraHtml = renderToStaticMarkup(
      <ChoroplethTooltipView
        entry={dataset.entries.BRA}
        indicatorLabel="PIB / hab."
        isHovered={true}
      />
    );
    assert.match(tooltipBraHtml, /Brasil/);
    assert.match(tooltipBraHtml, /BRA/);
    assert.match(tooltipBraHtml, /#\d+ de 169/);

    const tooltipMissingHtml = renderToStaticMarkup(
      <ChoroplethTooltipView
        entry={dataset.entries.ATA}
        indicatorLabel="PIB / hab."
        isHovered={false}
      />
    );
    assert.match(tooltipMissingHtml, /Dado indisponível/);
    assert.match(tooltipMissingHtml, /Sem dado/);
  });

  test("7. Persistência em Estudos (schema Zod, fork, restauração no shell e exportação Markdown)", () => {
    const valid = studyInput.safeParse({
      title: "Distribuição Global de PIB per capita",
      choroplethIndicator: "NY.GDP.PCAP.CD",
    });
    assert.equal(valid.success, true);

    const invalid = studyInput.safeParse({
      title: "Indicador desconhecido",
      choroplethIndicator: "INVALID_INDICATOR",
    });
    assert.equal(invalid.success, false);

    const sanitized = sanitizeStudy({
      title: "Mapa de Expectativa de Vida",
      choroplethIndicator: "SP.DYN.LE00.IN",
      selectedCountryIsos: ["BRA", "JPN"],
    });
    assert.equal(sanitized.choroplethIndicator, "SP.DYN.LE00.IN");

    const studyRecord: StudyRecord = {
      ...sanitized,
      id: "estudo-coro-1",
      createdAt: "2026-11-21T16:00:00.000Z",
    };

    const forked = forkStudyRecord(studyRecord, "fork-coro-1");
    assert.equal(forked.choroplethIndicator, "SP.DYN.LE00.IN");
    assert.equal(forked.parentId, "estudo-coro-1");

    // Restauração no GlobeExperienceShell
    useChoroplethStore.getState().resetChoropleth();
    applyInitialGlobeState({ kind: "study", study: studyRecord });
    assert.equal(useChoroplethStore.getState().activeIndicator, "SP.DYN.LE00.IN");
    useChoroplethStore.getState().resetChoropleth();

    // Exportação acadêmica inclui camada coroplética e fonte RN02
    const md = buildStudyAcademicMarkdown(studyRecord);
    assert.match(md, /Camada coroplética:\*\* Expectativa de vida/);
    assert.match(md, /SP\.DYN\.LE00\.IN/);
  });

  test("8. Descoberta na TopNavBar e Busca Universal (⌘K)", () => {
    const navHtml = renderToStaticMarkup(<TopNavBar />);
    assert.match(navHtml, /data-testid="top-nav-choropleth-button"/);
    assert.match(navHtml, /Temático/);

    const results = searchExplore("coropletico");
    assert.ok(results.length >= 1, "Busca por 'coropletico' deve encontrar camadas coropléticas");
    assert.ok(results.some((r) => r.group === "choropleth"));

    const gdpResult = results.find((r) => r.id === "choropleth:NY.GDP.MKTP.CD") ?? results[0];
    useChoroplethStore.getState().resetChoropleth();
    runSearchResult(gdpResult);
    assert.equal(
      useChoroplethStore.getState().activeIndicator,
      gdpResult.id.slice("choropleth:".length)
    );
    useChoroplethStore.getState().resetChoropleth();
  });
});
