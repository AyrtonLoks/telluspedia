/**
 * T49 — LoD progressivo de fronteiras (`RN21` / `RN07`): Natural Earth `1:50m` sob demanda
 * no zoom aproximado, picking < 0,2 ms com zero-padding ISO, fronteiras tracejadas e selo
 * bilíngue D14 para territórios disputados e regiões autônomas.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  BORDERS_50M_PATH,
  BORDERS_LOD_ENTER_DISTANCE,
  BORDERS_LOD_EXIT_DISTANCE,
  getContemporarySpatialIndexForLod,
  loadHighResTopology,
  resetHighResTopologyCache,
  resolveBorderLod,
} from "../src/lib/borders-lod";
import {
  getBaseBorderPositions,
  getSpecialTerritoryBorderPositions,
} from "../src/lib/country-border-geometry";
import { contemporaryTopology, type CountryTopology } from "../src/lib/historical-topology";
import {
  formatTerritorialStatus,
  getTerritorialStatus,
  TERRITORIAL_STATUS_CATALOG,
} from "../src/lib/territorial-status";
import { CountryHeader } from "../src/components/hud/CountryHeader";
import { useLocaleStore } from "../src/stores/localeStore";
import { EN_MESSAGES } from "../src/lib/i18n/en";

const webRoot = path.resolve(__dirname, "..");
const topo50mDiskPath = path.join(webRoot, "public", BORDERS_50M_PATH);

describe("T49 · LoD progressivo de fronteiras 1:110m ↔ 1:50m (RN21)", () => {
  test("snapshot public/data/countries-ne-50m.json é válido, zero-padded e carregado apenas sob demanda", () => {
    assert.ok(fs.existsSync(topo50mDiskPath), "public/data/countries-ne-50m.json deve existir");
    const topo50 = JSON.parse(fs.readFileSync(topo50mDiskPath, "utf8")) as CountryTopology;
    assert.equal(topo50.type, "Topology");
    assert.ok(
      topo50.objects.countries.geometries.length > contemporaryTopology.objects.countries.geometries.length,
      "1:50m deve conter mais geometrias que 1:110m"
    );
    assert.ok(topo50.arcs.length > contemporaryTopology.arcs.length * 2, "1:50m deve ter maior detalhamento de arcos");

    // Invariante AGENTS.md §2: todo ID numérico deve estar com zero-padding de 3 dígitos
    for (const geom of topo50.objects.countries.geometries) {
      if (geom.id === undefined || geom.id === null) continue;
      const strId = String(geom.id);
      if (/^\d+$/.test(strId)) {
        assert.match(strId, /^\d{3}$/, `ID numérico ${strId} deve ter zero-padding ISO 3166-1`);
      }
    }

    // Garante que countries-50m / countries-ne-50m NUNCA é importado estaticamente em src/
    const bordersSrc = fs.readFileSync(path.join(webRoot, "src/components/globe/CountryBorders.tsx"), "utf8");
    const lodSrc = fs.readFileSync(path.join(webRoot, "src/lib/borders-lod.ts"), "utf8");
    assert.doesNotMatch(bordersSrc, /countries-50m|countries-ne-50m/);
    assert.doesNotMatch(lodSrc, /import\s+.*countries-(?:ne-)?50m/);
  });

  test("histerese de LoD alterna 1:110m ↔ 1:50m sem oscilação e picking 1:50m mantém < 0,2 ms", async (t) => {
    resetHighResTopologyCache();
    t.after(() => resetHighResTopologyCache());

    assert.equal(resolveBorderLod("110m", 3.0), "110m");
    assert.equal(resolveBorderLod("110m", BORDERS_LOD_EXIT_DISTANCE), "110m");
    assert.equal(resolveBorderLod("110m", BORDERS_LOD_ENTER_DISTANCE + 0.05), "110m");
    assert.equal(resolveBorderLod("110m", BORDERS_LOD_ENTER_DISTANCE), "50m");
    assert.equal(resolveBorderLod("50m", BORDERS_LOD_ENTER_DISTANCE + 0.15), "50m");
    assert.equal(resolveBorderLod("50m", BORDERS_LOD_EXIT_DISTANCE - 0.05), "50m");
    assert.equal(resolveBorderLod("50m", BORDERS_LOD_EXIT_DISTANCE), "110m");

    const rawText = fs.readFileSync(topo50mDiskPath, "utf8");
    let fetchCount = 0;
    const mockFetch = (async (input: string | URL | Request) => {
      assert.equal(String(input), BORDERS_50M_PATH);
      fetchCount += 1;
      return new Response(rawText, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch;

    // Requisições concorrentes são deduplicadas em um único fetch
    const [a, b] = await Promise.all([
      loadHighResTopology(mockFetch),
      loadHighResTopology(mockFetch),
    ]);
    assert.ok(a && a === b);
    assert.equal(fetchCount, 1);

    const idx50 = getContemporarySpatialIndexForLod("50m");
    assert.ok(idx50, "índice espacial 1:50m disponível após carregamento");

    const samples: Array<[[number, number], string]> = [
      [[-47.9, -15.8], "076"], // Brasil
      [[-58.4, -51.7], "238"], // Ilhas Malvinas / Falkland Is.
      [[121.5, 25.03], "158"], // Taiwan
      [[35.21, 31.77], "275"], // Palestina
      [[-42.0, 72.0], "304"],  // Groenlândia
    ];

    for (const [pt, expectedId] of samples) {
      const hit = idx50(pt);
      assert.equal(String(hit?.id ?? ""), expectedId, `ponto ${pt.join(",")} deve resolver ${expectedId}`);
    }

    // Benchmark de latência média (< 0,2 ms por lookup)
    const iterations = 500;
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      idx50(samples[i % samples.length][0]);
    }
    const avgMs = (performance.now() - start) / iterations;
    assert.ok(avgMs < 0.2, `picking 1:50m deve ser < 0,2 ms (medido: ${avgMs.toFixed(4)} ms)`);
  });

  test("fronteiras especiais RN07 geram segmentos em 1:110m e 1:50m e CountryBorders faz dispose na GPU", () => {
    const topo50 = JSON.parse(fs.readFileSync(topo50mDiskPath, "utf8")) as CountryTopology;
    const base110 = getBaseBorderPositions(contemporaryTopology);
    const base50 = getBaseBorderPositions(topo50);
    assert.ok(base50.length > base110.length * 4, "1:50m deve aumentar nitidez geométrica dos contornos");

    const special110 = getSpecialTerritoryBorderPositions(contemporaryTopology);
    const special50 = getSpecialTerritoryBorderPositions(topo50);
    assert.ok(special110.disputed.length > 0, "1:110m deve incluir territórios disputados");
    assert.ok(special110.autonomous.length > 0, "1:110m deve incluir territórios autônomos");
    assert.ok(special50.disputed.length > special110.disputed.length, "1:50m deve refinar territórios disputados");
    assert.ok(special50.autonomous.length > special110.autonomous.length, "1:50m deve refinar territórios autônomos");

    // Invariante RN21: CountryBorders deve configurar linhas tracejadas e descartar geometria/material
    const bordersSource = fs.readFileSync(
      path.join(webRoot, "src/components/globe/CountryBorders.tsx"),
      "utf8"
    );
    assert.match(bordersSource, /dashed:\s*true/);
    assert.match(bordersSource, /computeLineDistances\(\)/);
    assert.match(bordersSource, /disputedLine\?\.geometry\.dispose\(\)/);
    assert.match(bordersSource, /autonomousLine\?\.geometry\.dispose\(\)/);
  });
});

describe("T49 · Territórios disputados e autônomos bilíngues (RN07)", () => {
  test("catálogo cobre territórios disputados/autônomos com fonte ONU/Natural Earth e CountryHeader renderiza em pt-BR e en", () => {
    for (const [iso, info] of Object.entries(TERRITORIAL_STATUS_CATALOG)) {
      assert.equal(info.isoCode, iso);
      assert.ok(info.labelPt.length > 3 && info.labelEn.length > 3);
      assert.ok(info.notePt.length > 20 && info.noteEn.length > 20);
      assert.match(info.sourceUrl, /^https:\/\//);
    }

    const esh = getTerritorialStatus("ESH");
    assert.ok(esh);
    assert.equal(formatTerritorialStatus(esh, "pt-BR").label, "Território disputado");
    assert.equal(formatTerritorialStatus(esh, "en").label, "Disputed territory");
    assert.equal(getTerritorialStatus("BRA"), null);

    const prev = useLocaleStore.getState();
    try {
      useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
      const ptDisputed = renderToStaticMarkup(
        React.createElement(CountryHeader, {
          nameCommon: "Saara Ocidental",
          nameOfficial: null,
          capital: null,
          continent: "África",
          region: "Norte da África",
          isoCode: "ESH",
          iso2: "EH",
        })
      );
      assert.match(ptDisputed, /data-testid="territorial-status-note"/);
      assert.match(ptDisputed, /data-territorial-kind="disputed"/);
      assert.match(ptDisputed, /Território disputado/);
      assert.match(ptDisputed, /ONU \/ Natural Earth/);

      useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
      const enAutonomous = renderToStaticMarkup(
        React.createElement(CountryHeader, {
          nameCommon: "Groenlândia",
          nameOfficial: null,
          capital: "Nuuk",
          continent: "América",
          region: "América do Norte",
          isoCode: "GRL",
          iso2: "GL",
        })
      );
      assert.match(enAutonomous, /data-territorial-kind="autonomous"/);
      assert.match(enAutonomous, /Autonomous territory/);
      assert.match(enAutonomous, /Source:/);

      const sovereign = renderToStaticMarkup(
        React.createElement(CountryHeader, {
          nameCommon: "Brasil",
          nameOfficial: "República Federativa do Brasil",
          capital: "Brasília",
          continent: "América",
          region: "América do Sul",
          isoCode: "BRA",
          iso2: "BR",
        })
      );
      assert.doesNotMatch(sovereign, /territorial-status-note/);
    } finally {
      useLocaleStore.setState({ locale: prev.locale, enMessages: prev.enMessages });
    }
  });
});
