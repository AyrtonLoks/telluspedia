/**
 * D30 — Dados Ambientais & INPE (`RN17`):
 * - INPE BDQueimadas (CSV diário oficial com agregação pelos 6 biomas brasileiros)
 * - INPE TerraBrasilis (PRODES 2015–2025 oficial + DETER WFS GeoJSON)
 * - Contrato T05 (live / cache / stale / fallback honesto sem valores sintéticos T03)
 * - Controles D14 bilíngues (`pt-BR`/`en`), `dispose()` na GPU e serialização em Estudos.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  INPE_PRODES_SERIES,
  buildTerraBrasilisPayload,
  computeProdesYoYChange,
  normalizeBrazilianBiome,
  parseInpeBdQueimadasCsv,
  parseTerraBrasilisDeterGeoJson,
} from "../src/lib/inpe-data";
import { PRODES_BIOME_IDS } from "../src/lib/inpe-types";
import { PRODES_CRITICAL_HUBS, rasterizeDeforestationHeatmap } from "../src/lib/inpe-heatmap";
import {
  createInpeBdQueimadasSource,
  createInpeTerraBrasilisSource,
} from "../src/lib/inpe-sources";
import { FirmsLayerControls } from "../src/components/observatory/FirmsLayerControls";
import { InpeDeforestationControls } from "../src/components/observatory/InpeDeforestationControls";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { useLocaleStore } from "../src/stores/localeStore";
import { EN_MESSAGES } from "../src/lib/i18n/en";
import { sanitizeStudy, studyInput } from "../src/lib/study-schema";

const webRoot = path.resolve(__dirname, "..");

const SAMPLE_INPE_CSV = [
  "id,lat,lon,data_hora_gmt,satelite,municipio,estado,pais,municipio_id,estado_id,pais_id,numero_dias_sem_chuva,precipitacao,risco_fogo,bioma,frp",
  "f1,-3.3269,-50.4504,2026-11-24 00:00:00,GOES-19,PORTEL,PARÁ,Brasil,1505809,15,33,,,,Amazônia,73.6",
  "f2,-4.1083,-46.1707,2026-11-24 00:00:00,AQUA_M-T,ALTO ALEGRE,MARANHÃO,Brasil,2100477,21,33,,,,Amazônia,58.0",
  "f3,-13.4500,-47.8200,2026-11-24 01:15:00,NPP-375,ALTO PARAÍSO,GOIÁS,Brasil,5200605,52,33,,,,Cerrado,41.2",
  "f4,-18.9000,-56.7000,2026-11-24 02:30:00,NOAA-20,CORUMBÁ,MS,Brasil,5003207,50,33,,,,Pantanal,25.5",
  "f5,-8.6000,-39.2000,2026-11-24 03:00:00,GOES-19,PETROLINA,PE,Brasil,2611101,26,33,,,,Caatinga,18.0",
  "f6,-22.5000,-44.1000,2026-11-24 03:10:00,GOES-19,RESENDE,RJ,Brasil,3304201,33,33,,,,Mata Atlântica,15.0",
  "f7,-30.8000,-55.5000,2026-11-24 03:20:00,GOES-19,LIVRAMENTO,RS,Brasil,4317103,43,33,,,,Pampa,12.0",
  "bad,not-a-lat,-50.0,2026-11-24 03:30:00,GOES-19,X,Y,Brasil,0,0,0,,,,Amazônia,10.0",
].join("\n");

const SAMPLE_DETER_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      id: "deter_amz.101",
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-55.2, -6.1],
            [-55.0, -6.1],
            [-55.0, -6.3],
            [-55.2, -6.3],
            [-55.2, -6.1],
          ],
        ],
      },
      properties: {
        areamunkm: 1.425,
        uf: "PA",
        municipality: "Altamira",
        classname: "DESMATAMENTO_CR",
        view_date: "2026-11-20",
      },
    },
  ],
};

describe("D30 · Dados Ambientais & INPE (BDQueimadas + TerraBrasilis DETER/PRODES)", () => {
  test("1. Parser BDQueimadas agrega todos os 6 biomas brasileiros oficiais e descarta linhas inválidas", () => {
    assert.equal(normalizeBrazilianBiome("Amazônia"), "amazonia");
    assert.equal(normalizeBrazilianBiome("Mata Atlântica"), "mata_atlantica");
    assert.equal(normalizeBrazilianBiome("Cerrado"), "cerrado");
    assert.equal(normalizeBrazilianBiome("Caatinga"), "caatinga");
    assert.equal(normalizeBrazilianBiome("Pantanal"), "pantanal");
    assert.equal(normalizeBrazilianBiome("Pampa"), "pampa");
    assert.equal(normalizeBrazilianBiome(""), null);

    const parsed = parseInpeBdQueimadasCsv(SAMPLE_INPE_CSV, {
      referenceDate: "2026-11-24",
      scope: "America_Sul",
      sourceUrl: "https://queimadas.dgi.inpe.br/queimadas/dados-abertos",
    });

    assert.equal(parsed.total, 7);
    assert.equal(parsed.hotspots.length, 7);
    assert.equal(parsed.byBiome.length, 6);
    const amazon = parsed.byBiome.find((b) => b.id === "amazonia");
    assert.equal(amazon?.count, 2);
    assert.equal(amazon?.maxFrp, 73.6);
    assert.equal(parsed.byBiome.find((b) => b.id === "cerrado")?.count, 1);
    assert.equal(parsed.byBiome.find((b) => b.id === "pantanal")?.count, 1);
    assert.equal(parsed.byBiome.find((b) => b.id === "caatinga")?.count, 1);
    assert.equal(parsed.byBiome.find((b) => b.id === "mata_atlantica")?.count, 1);
    assert.equal(parsed.byBiome.find((b) => b.id === "pampa")?.count, 1);
  });

  test("2. Parser DETER GeoJSON e séries oficiais PRODES (2015–2025) sem valores sintéticos", () => {
    const alerts = parseTerraBrasilisDeterGeoJson(SAMPLE_DETER_GEOJSON, "amazonia");
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].uf, "PA");
    assert.equal(alerts[0].municipality, "Altamira");
    assert.equal(alerts[0].areaKm2, 1.425);
    assert.ok(Math.abs(alerts[0].lat - -6.18) < 0.05);
    assert.ok(Math.abs(alerts[0].lng - -55.12) < 0.05);

    assert.equal(INPE_PRODES_SERIES.amazonia.length, 11);
    assert.equal(INPE_PRODES_SERIES.cerrado.length, 11);
    for (const biome of PRODES_BIOME_IDS) {
      assert.ok(INPE_PRODES_SERIES[biome].length >= 6, `série PRODES para ${biome} deve ter ≥ 6 anos`);
      assert.ok(
        PRODES_CRITICAL_HUBS.some((h) => h.biome === biome),
        `mapa de calor deve cobrir polos críticos PRODES em ${biome}`
      );
    }
    assert.equal(INPE_PRODES_SERIES.amazonia[0].year, 2015);
    assert.equal(INPE_PRODES_SERIES.amazonia[10].year, 2025);
    const amzYoY = computeProdesYoYChange(INPE_PRODES_SERIES.amazonia);
    assert.ok(amzYoY !== null && amzYoY < 0, "variação 2024 → 2025 na Amazônia deve refletir queda oficial");

    // Rasterizador do mapa de calor de desmatamento nos 6 biomas
    const noop = () => {};
    const mockCtx = {
      clearRect: noop,
      save: noop,
      restore: noop,
      beginPath: noop,
      closePath: noop,
      moveTo: noop,
      lineTo: noop,
      arc: noop,
      clip: noop,
      fill: noop,
      stroke: noop,
      createRadialGradient: () => ({ addColorStop: noop }),
    } as unknown as CanvasRenderingContext2D;
    const stats = rasterizeDeforestationHeatmap(
      mockCtx,
      { activeBiome: "pantanal", deterAlerts: alerts, biomeTopology: null },
      512,
      256
    );
    assert.equal(stats.renderedKernels, PRODES_CRITICAL_HUBS.length);
    assert.equal(stats.liveAlertKernels, 1);
  });

  test("3. Fontes T05 do INPE cumprem live, cache, stale e fallback honesto (zero dados fabricados)", async (t) => {
    t.mock.method(console, "warn", () => undefined);

    // BDQueimadas: live → cache hit → falha após TTL → stale
    let failCsv = false;
    const firesSrc = createInpeBdQueimadasSource((async () => {
      if (failCsv) throw new Error("network down");
      return new Response(SAMPLE_INPE_CSV, { status: 200, headers: { "content-type": "text/csv" } });
    }) as typeof fetch);

    const t0 = Date.UTC(2026, 10, 24, 18, 0, 0);
    const liveRes = await firesSrc.get(t0);
    assert.equal(liveRes.envelope.meta.source, "live");
    assert.equal(liveRes.envelope.data.total, 7);
    const cachedRes = await firesSrc.get(t0 + 30_000);
    assert.equal(cachedRes.cacheHit, true);

    failCsv = true;
    const staleRes = await firesSrc.get(t0 + 20 * 60 * 1000);
    assert.equal(staleRes.envelope.meta.stale, true);
    assert.equal(staleRes.envelope.data.total, 7);

    // Sem leitura prévia e servidor fora do ar → fallback honesto com 0 focos (nunca sintéticos)
    const offlineFiresSrc = createInpeBdQueimadasSource((async () => {
      throw new Error("offline");
    }) as typeof fetch);
    const fbFires = await offlineFiresSrc.get(t0);
    assert.equal(fbFires.envelope.meta.source, "fallback");
    assert.equal(fbFires.envelope.data.total, 0);
    assert.equal(fbFires.envelope.data.hotspots.length, 0);

    // TerraBrasilis: live WFS vs fallback honesto (DETER vazio + PRODES oficial intacto)
    const liveTbSrc = createInpeTerraBrasilisSource((async (url: string | URL | Request) => {
      if (String(url).includes("deter-amz")) {
        return new Response(JSON.stringify(SAMPLE_DETER_GEOJSON), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as typeof fetch);
    const liveTb = await liveTbSrc.get(t0);
    assert.equal(liveTb.envelope.meta.source, "live");
    assert.equal(liveTb.envelope.data.deterAvailable, true);
    assert.equal(liveTb.envelope.data.deterAlerts.length, 1);

    const offlineTbSrc = createInpeTerraBrasilisSource((async () => {
      return new Response("Service Unavailable", { status: 503 });
    }) as typeof fetch);
    const fbTb = await offlineTbSrc.get(t0);
    assert.equal(fbTb.envelope.meta.source, "fallback");
    assert.equal(fbTb.envelope.data.deterAvailable, false);
    assert.equal(fbTb.envelope.data.deterAlerts.length, 0);
    assert.equal(fbTb.envelope.data.prodes.amazonia.length, 11);
  });

  test("4. Controles D14 bilíngues (pt-BR/en), dispose GPU e persistência em Estudos", () => {
    const prevObs = useObservatoryStore.getState();
    const prevLocale = useLocaleStore.getState();
    try {
      const parsedFires = parseInpeBdQueimadasCsv(SAMPLE_INPE_CSV, {
        referenceDate: "2026-11-24",
        scope: "America_Sul",
        sourceUrl: "https://queimadas.dgi.inpe.br/queimadas/dados-abertos",
      });
      useObservatoryStore.setState({
        fireSource: "inpe",
        inpeFires: parsedFires,
        prodesBiome: "amazonia",
        inpeDeforestation: buildTerraBrasilisPayload([], 30),
      });

      useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
      const ptFires = renderToStaticMarkup(React.createElement(FirmsLayerControls));
      assert.match(ptFires, /data-testid="fires-source-inpe"/);
      assert.match(ptFires, /data-testid="inpe-biome-summary"/);
      assert.match(ptFires, /Amazônia/);
      assert.match(ptFires, /Pantanal/);

      const ptProdes = renderToStaticMarkup(React.createElement(InpeDeforestationControls));
      assert.match(ptProdes, /data-testid="inpe-deforestation-controls"/);
      assert.match(ptProdes, /data-testid="prodes-chart"/);
      assert.match(ptProdes, /data-testid="inpe-heatmap-legend"/);
      assert.match(ptProdes, /data-testid="inpe-biome-caatinga"/);
      assert.match(ptProdes, /data-testid="inpe-biome-mata_atlantica"/);
      assert.match(ptProdes, /data-testid="inpe-biome-pampa"/);
      assert.match(ptProdes, /data-testid="inpe-biome-pantanal"/);
      assert.match(ptProdes, /INPE \/ MCTI/);

      useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
      const enFires = renderToStaticMarkup(React.createElement(FirmsLayerControls));
      assert.match(enFires, /Hotspots by Brazilian biome \(INPE\)/);
      assert.match(enFires, /Atlantic Forest/);

      const enProdes = renderToStaticMarkup(React.createElement(InpeDeforestationControls));
      assert.match(enProdes, /Atlantic Forest/);
      assert.match(enProdes, /Deforestation heatmap/);
      assert.match(enProdes, /Official PRODES series/);
      assert.match(enProdes, /DETER alerts \(last 30 days\)/);
    } finally {
      useObservatoryStore.setState({
        fireSource: prevObs.fireSource,
        inpeFires: prevObs.inpeFires,
        prodesBiome: prevObs.prodesBiome,
        inpeDeforestation: prevObs.inpeDeforestation,
      });
      useLocaleStore.setState({ locale: prevLocale.locale, enMessages: prevLocale.enMessages });
    }

    const layerSrc = fs.readFileSync(
      path.join(webRoot, "src/components/globe/InpeDeforestationLayer.tsx"),
      "utf8"
    );
    assert.match(layerSrc, /heatmapGeometry\?\.dispose\(\)/);
    assert.match(layerSrc, /heatmapMaterial\?\.dispose\(\)/);
    assert.match(layerSrc, /canvasResource\.current\.texture\.dispose\(\)/);
    assert.match(layerSrc, /hotspotsGeometry\?\.dispose\(\)/);
    assert.match(layerSrc, /hotspotsMaterial\.dispose\(\)/);
    assert.match(layerSrc, /if \(isThrottled/);

    const validStudy = studyInput.safeParse({
      title: "Desmatamento Amazônia e Cerrado (INPE)",
      activeObservatoryLayers: ["INPE_DEFORESTATION", "NASA_FIRMS"],
    });
    assert.equal(validStudy.success, true);

    const historicalSanitized = sanitizeStudy({
      title: "1939",
      timelineStartYear: 1935,
      timelineEndYear: 1939,
      historicalEra: "WW2_1939",
      activeObservatoryLayers: ["INPE_DEFORESTATION"],
    });
    assert.deepEqual(historicalSanitized.activeObservatoryLayers, []);
  });
});
