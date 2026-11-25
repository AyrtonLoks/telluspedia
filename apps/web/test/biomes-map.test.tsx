import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ALL_BIOMES,
  BIOME_SCOPE_CITATIONS,
  BRAZIL_BIOMES,
  GLOBAL_BIOMES,
  getBiomeById,
  getBiomesForScope,
} from "../src/lib/biomes-catalog";
import {
  BRAZIL_BIOME_IDS,
  GLOBAL_BIOME_IDS,
  encodeBiomesView,
  isBiomeId,
  isBiomeIdForScope,
  isBiomeScope,
  pickLoadedBiomeAt,
  readBiomesView,
  registerBiomePicker,
} from "../src/lib/biomes-types";
import {
  isBiomeTopology,
  loadBiomeTopology,
  pickBiomeAt,
  rasterizeBiomesToCanvas,
  resetBiomeTopologyCache,
  setBiomeTopologyCache,
  type BiomeTopology,
} from "../src/lib/biomes-data";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { loadEnMessages, useLocaleStore } from "../src/stores/localeStore";
import { sanitizeStudy, studyInput } from "../src/lib/study-schema";
import { encodeView, restoreView } from "../src/lib/explore/view-url";
import { DEFAULT_CAMERA_OFFSET, type ViewCamera } from "../src/lib/explore/view-camera";
import { searchExplore } from "../src/lib/explore/search";
import { BiomesLayerControls } from "../src/components/observatory/BiomesLayerControls";
import { BiomeHudOverlay } from "../src/components/observatory/BiomeHudOverlay";

const root = path.resolve(__dirname, "..");

function readTopoJson(relPath: string): BiomeTopology {
  const raw = JSON.parse(fs.readFileSync(path.join(root, relPath), "utf-8")) as unknown;
  assert.ok(isBiomeTopology(raw), `${relPath} deve ser um TopoJSON válido de biomas`);
  return raw;
}

function createMockCanvasContext() {
  let clipCalls = 0;
  let fillCalls = 0;
  let strokeCalls = 0;
  const ctx = {
    globalAlpha: 1,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineJoin: "round",
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    clip: () => {
      clipCalls++;
    },
    fill: () => {
      fillCalls++;
    },
    stroke: () => {
      strokeCalls++;
    },
  };
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    getCounts: () => ({ clipCalls, fillCalls, strokeCalls }),
  };
}

describe("D31: catálogo dos 14 biomas globais (WWF/RESOLVE) e 6 biomas brasileiros (IBGE)", () => {
  test("cobre exatamente os 14 biomas globais e os 6 biomas oficiais do Brasil com metadados completos", () => {
    assert.equal(GLOBAL_BIOMES.length, 14);
    assert.equal(BRAZIL_BIOMES.length, 6);
    assert.equal(ALL_BIOMES.length, 20);
    assert.deepEqual(
      GLOBAL_BIOMES.map((b) => b.id),
      [...GLOBAL_BIOME_IDS]
    );
    assert.deepEqual(
      BRAZIL_BIOMES.map((b) => b.id),
      [...BRAZIL_BIOME_IDS]
    );

    const brazilShareSum = BRAZIL_BIOMES.reduce((acc, b) => acc + (b.brazilSharePct ?? 0), 0);
    assert.ok(Math.abs(brazilShareSum - 100) < 0.2, `soma dos biomas BR deve ser ~100%, obteve ${brazilShareSum}`);

    for (const biome of ALL_BIOMES) {
      assert.ok(isBiomeId(biome.id));
      assert.ok(isBiomeIdForScope(biome.scope, biome.id));
      assert.match(biome.hex, /^#[0-9A-F]{6}$/i, `hex inválido para ${biome.id}`);
      assert.ok(biome.areaKm2 > 0, `área inválida para ${biome.id}`);
      assert.ok(biome.centerLat >= -90 && biome.centerLat <= 90);
      assert.ok(biome.centerLng >= -180 && biome.centerLng <= 180);
      assert.ok(biome.namePt.length > 2 && biome.nameEn.length > 2);
      assert.ok(biome.climatePt.length > 15 && biome.climateEn.length > 15);
      assert.ok(biome.soilsPt.length > 15 && biome.soilsEn.length > 15);
      assert.ok(biome.vegetationPt.length > 15 && biome.vegetationEn.length > 15);
      assert.ok(biome.threatsPt.length > 15 && biome.threatsEn.length > 15);
      assert.match(biome.sourceUrl, /^https:\/\//);
      assert.equal(getBiomeById(biome.id)?.id, biome.id);
    }

    assert.equal(getBiomesForScope("global").length, 14);
    assert.equal(getBiomesForScope("brazil").length, 6);
    assert.match(BIOME_SCOPE_CITATIONS.global.url, /^https:\/\//);
    assert.match(BIOME_SCOPE_CITATIONS.brazil.url, /^https:\/\//);
  });

  test("validadores e codificação de URL de bioma lidam com entradas válidas e inválidas", () => {
    assert.equal(isBiomeScope("global"), true);
    assert.equal(isBiomeScope("brazil"), true);
    assert.equal(isBiomeScope("mars"), false);
    assert.equal(encodeBiomesView("global", null), "global");
    assert.equal(encodeBiomesView("brazil", "BR_CERRADO"), "brazil,BR_CERRADO");
    assert.equal(encodeBiomesView("global", "BR_CERRADO"), "global");
    assert.deepEqual(readBiomesView("brazil,BR_PANTANAL"), {
      scope: "brazil",
      filterId: "BR_PANTANAL",
    });
    assert.deepEqual(readBiomesView("global,INVALID"), {
      scope: "global",
      filterId: null,
    });
    assert.equal(readBiomesView("unknown"), null);
  });
});

describe("D31: TopoJSON sob demanda, picking espacial O(1) e rasterização", () => {
  beforeEach(() => {
    resetBiomeTopologyCache();
  });

  test("datasets TopoJSON oficiais (WWF/RESOLVE 2017 e IBGE 2019) são compactos, íntegros e cobrem todos os códigos", () => {
    const globalPath = path.join(root, "public/data/biomes/global-biomes-wwf.json");
    const brazilPath = path.join(root, "public/data/biomes/brazil-biomes-ibge.json");

    assert.ok(fs.statSync(globalPath).size < 350 * 1024, "global-biomes-wwf.json deve ser compacto (< 350 KiB)");
    assert.ok(fs.statSync(brazilPath).size < 80 * 1024, "brazil-biomes-ibge.json deve ser compacto (< 80 KiB)");

    const globalTopo = readTopoJson("public/data/biomes/global-biomes-wwf.json");
    const brazilTopo = readTopoJson("public/data/biomes/brazil-biomes-ibge.json");

    const globalIds = new Set(
      globalTopo.objects.biomes.geometries.map((g) => (g.properties as { id?: string } | undefined)?.id)
    );
    const brazilIds = new Set(
      brazilTopo.objects.biomes.geometries.map((g) => (g.properties as { id?: string } | undefined)?.id)
    );

    for (const id of GLOBAL_BIOME_IDS) {
      assert.ok(globalIds.has(id), `global TopoJSON deve conter ${id}`);
    }
    for (const id of BRAZIL_BIOME_IDS) {
      assert.ok(brazilIds.has(id), `brazil TopoJSON deve conter ${id}`);
    }
  });

  test("loadBiomeTopology carrega via fetch sob demanda e deduplica chamadas", async () => {
    const brazilTopo = readTopoJson("public/data/biomes/brazil-biomes-ibge.json");
    let fetchCalls = 0;
    const mockFetch = (async () => {
      fetchCalls++;
      return {
        ok: true,
        json: async () => brazilTopo,
      } as unknown as Response;
    }) as typeof fetch;

    const [a, b] = await Promise.all([
      loadBiomeTopology("brazil", mockFetch),
      loadBiomeTopology("brazil", mockFetch),
    ]);
    assert.equal(fetchCalls, 1);
    assert.ok(a && b);
    assert.equal(a, b);
  });

  test("picking em memória (which-polygon) identifica biomas globais e os 6 biomas brasileiros em < 0,2 ms", () => {
    const globalTopo = readTopoJson("public/data/biomes/global-biomes-wwf.json");
    const brazilTopo = readTopoJson("public/data/biomes/brazil-biomes-ibge.json");
    setBiomeTopologyCache("global", globalTopo);
    setBiomeTopologyCache("brazil", brazilTopo);

    // Biomas globais (WWF/RESOLVE 2017 oficial)
    assert.equal(pickBiomeAt("global", -3.1, -60.0), "WWF_01"); // Amazônia
    assert.equal(pickBiomeAt("global", 23.0, 12.0), "WWF_13"); // Saara
    assert.equal(pickBiomeAt("global", 62.0, 95.0), "WWF_06"); // Taiga Siberiana
    assert.equal(pickBiomeAt("global", 69.5, -152.0), "WWF_11"); // Tundra Ártica (Alasca)
    assert.equal(pickBiomeAt("global", 48.85, 2.35), "WWF_04"); // Floresta Temperada (Europa)
    assert.equal(pickBiomeAt("global", 0.0, -150.0), null); // Oceano Pacífico central
    assert.equal(pickBiomeAt("global", Number.NaN, 0), null);

    // 6 Biomas Brasileiros (IBGE 2019 1:250.000 oficial)
    assert.equal(pickBiomeAt("brazil", -3.1, -60.0), "BR_AMAZONIA");
    assert.equal(pickBiomeAt("brazil", -15.8, -47.9), "BR_CERRADO");
    assert.equal(pickBiomeAt("brazil", -23.55, -46.63), "BR_MATA_ATLANTICA");
    assert.equal(pickBiomeAt("brazil", -9.4, -40.5), "BR_CAATINGA");
    assert.equal(pickBiomeAt("brazil", -17.8, -56.8), "BR_PANTANAL");
    assert.equal(pickBiomeAt("brazil", -31.3, -54.1), "BR_PAMPA");
    assert.equal(pickBiomeAt("brazil", 48.8, 2.3), null); // Paris fora do Brasil

    // Bridge de picker registrado sob demanda
    registerBiomePicker((scope, lat, lng) => pickBiomeAt(scope, lat, lng));
    assert.equal(pickLoadedBiomeAt("brazil", -15.8, -47.9), "BR_CERRADO");
    registerBiomePicker(null);
    assert.equal(pickLoadedBiomeAt("brazil", -15.8, -47.9), null);

    // Benchmark de picking O(1) (< 0,2 ms médio)
    const t0 = performance.now();
    for (let i = 0; i < 200; i++) {
      pickBiomeAt("brazil", -15.8, -47.9);
      pickBiomeAt("global", -3.1, -60.0);
    }
    const avgMs = (performance.now() - t0) / 400;
    assert.ok(avgMs < 0.2, `picking médio deve ser < 0.2ms, obteve ${avgMs.toFixed(4)}ms`);
  });

  test("rasterizeBiomesToCanvas aplica máscara terrestre e desenha todos os biomas do escopo", () => {
    const globalTopo = readTopoJson("public/data/biomes/global-biomes-wwf.json");
    const brazilTopo = readTopoJson("public/data/biomes/brazil-biomes-ibge.json");

    const mockGlobal = createMockCanvasContext();
    const statsGlobal = rasterizeBiomesToCanvas(
      mockGlobal.ctx,
      "global",
      globalTopo,
      { filterBiomeId: "WWF_01", selectedBiomeId: "WWF_01" },
      512,
      256
    );
    assert.equal(statsGlobal.renderedFeatures, 14);
    assert.equal(mockGlobal.getCounts().fillCalls, 14);
    assert.ok(mockGlobal.getCounts().strokeCalls >= 1);

    const mockBrazil = createMockCanvasContext();
    const statsBrazil = rasterizeBiomesToCanvas(
      mockBrazil.ctx,
      "brazil",
      brazilTopo,
      { filterBiomeId: "BR_CERRADO", selectedBiomeId: "BR_CERRADO" },
      512,
      256
    );
    assert.equal(statsBrazil.renderedFeatures, 6);
    assert.equal(mockBrazil.getCounts().fillCalls, 6);
    assert.equal(mockBrazil.getCounts().strokeCalls, 6);
  });

  test("BiomesLayer.tsx descarta geometria, material e textura WebGL ao desmontar (RN21)", () => {
    const src = fs.readFileSync(
      path.join(root, "src/components/globe/BiomesLayer.tsx"),
      "utf-8"
    );
    assert.match(src, /geometry\?\.dispose\(\)/);
    assert.match(src, /material\?\.dispose\(\)/);
    assert.match(src, /canvasResource\.current\.texture\.dispose\(\)/);
  });
});

describe("D31: integração com ObservatoryStore, URL, Studies, Busca ⌘K e UI bilíngue", () => {
  beforeEach(() => {
    useObservatoryStore.getState().resetObservatory();
    useObservatoryStore.getState().setBiomeScope("global");
    useLocaleStore.setState({ locale: "pt-BR" });
  });

  test("ObservatoryStore alterna escopo, limpa filtros incompatíveis e publica metadados T05", async () => {
    const store = useObservatoryStore.getState();
    store.setLayerActive("BIOMES_MAP", true);
    await store.loadLayerData("BIOMES_MAP");

    let state = useObservatoryStore.getState();
    assert.ok(state.activeLayers.includes("BIOMES_MAP"));
    assert.equal(state.layerMeta.BIOMES_MAP.source, "computed");
    assert.match(state.layerMeta.BIOMES_MAP.provider, /WWF/);

    state.setBiomeFilterId("WWF_01");
    state.setSelectedBiomeId("WWF_01");
    state.setBiomeScope("brazil");

    state = useObservatoryStore.getState();
    assert.equal(state.biomeScope, "brazil");
    assert.equal(state.biomeFilterId, null);
    assert.equal(state.selectedBiomeId, null);
    assert.match(state.layerMeta.BIOMES_MAP.provider, /IBGE/);
  });

  test("URL compartilhável (view-url.ts), Studies (study-schema.ts) e Busca ⌘K suportam BIOMES_MAP", () => {
    const store = useObservatoryStore.getState();
    store.setAllLayers(["BIOMES_MAP"]);
    store.setBiomeScope("brazil");
    store.setBiomeFilterId("BR_CERRADO");

    const view: ViewCamera = {
      offset: [...DEFAULT_CAMERA_OFFSET],
      restore: null,
      onChange: null,
    };
    const encoded = encodeView(view);
    assert.match(encoded, /camadas=BIOMES_MAP/);
    assert.match(encoded, /bioma=brazil%2CBR_CERRADO|bioma=brazil,BR_CERRADO/);

    store.resetObservatory();
    store.setBiomeScope("global");

    const restored = restoreView(`?visao=1&${encoded}`, view);
    assert.equal(restored, true);
    const after = useObservatoryStore.getState();
    assert.ok(after.activeLayers.includes("BIOMES_MAP"));
    assert.equal(after.biomeScope, "brazil");
    assert.equal(after.biomeFilterId, "BR_CERRADO");

    const parsedStudy = studyInput.safeParse({
      title: "Biomas do Brasil",
      activeObservatoryLayers: ["BIOMES_MAP", "INPE_DEFORESTATION"],
    });
    assert.equal(parsedStudy.success, true);

    const sanitized = sanitizeStudy({
      activeObservatoryLayers: ["BIOMES_MAP"],
    });
    assert.deepEqual(sanitized.activeObservatoryLayers, ["BIOMES_MAP"]);

    const searchBiomes = searchExplore("biomas");
    assert.ok(searchBiomes.some((r) => r.id === "layer:BIOMES_MAP"));
    const searchCerrado = searchExplore("Cerrado");
    assert.ok(searchCerrado.some((r) => r.id === "layer:BIOMES_MAP"));
  });

  test("BiomesLayerControls renderiza ficha ecológica bilíngue (pt-BR e en) e cruzamentos ambientais", async () => {
    const store = useObservatoryStore.getState();
    store.setBiomeScope("brazil");
    store.setBiomeFilterId("BR_CERRADO");
    store.setSelectedBiomeId("BR_CERRADO");

    const htmlPt = renderToStaticMarkup(<BiomesLayerControls />);
    assert.match(htmlPt, /Global \(14 WWF\)/);
    assert.match(htmlPt, /Brasil \(6 IBGE\)/);
    assert.match(htmlPt, /Cerrado/);
    assert.match(htmlPt, /IBGE-02/);
    assert.match(htmlPt, /23,9%/);
    assert.match(htmlPt, /Vegetação típica/);
    assert.match(htmlPt, /INPE BDQueimadas/);
    assert.match(htmlPt, /INPE PRODES/);
    assert.match(htmlPt, /NASA GIBS NDVI/);

    const enMessages = await loadEnMessages();
    useLocaleStore.setState({ locale: "en", enMessages });
    const htmlEn = renderToStaticMarkup(<BiomesLayerControls />);
    assert.match(htmlEn, /Brazil \(6 IBGE\)/);
    assert.match(htmlEn, /Typical vegetation/);
    assert.match(htmlEn, /Main threats/);
    assert.match(htmlEn, /Cross-check environmental layers/);

    // Sem estado duplo entre "Todos" e chip de bioma quando selecionado apenas por clique no globo
    store.setBiomeFilterId(null);
    store.setSelectedBiomeId("BR_MATA_ATLANTICA");
    store.setHoveredBiomeId("BR_PANTANAL");
    const htmlNoDouble = renderToStaticMarkup(<BiomesLayerControls />);
    assert.match(htmlNoDouble, /data-testid="biome-chip-ALL" aria-pressed="true"/);
    assert.match(htmlNoDouble, /data-testid="biome-chip-BR_MATA_ATLANTICA" aria-pressed="false"/);

    // BiomeHudOverlay renderiza pílula de hover ao vivo + cartão flutuante sem colidir com FIRMS
    const htmlHud = renderToStaticMarkup(<BiomeHudOverlay />);
    assert.match(htmlHud, /data-testid="biome-hover-pill"/);
    assert.match(htmlHud, /Pantanal/);
    assert.match(htmlHud, /data-testid="biome-floating-card"/);
    assert.match(htmlHud, /Atlantic Forest/);
  });
});
