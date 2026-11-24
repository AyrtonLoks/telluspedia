import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  resolvePaleoEra,
  isPaleoActive,
  getPaleoEra,
  PALEO_ERAS,
  PANGAEA_TECTONIC_PLATES,
  PANGAEA_PLATE_ARCS,
  generatePaleoPangeaCanvas,
  generatePaleoGondwanaCanvas,
  generatePaleoCanvas,
} from "../src/lib/paleo-data";
import {
  RouteWaypoint,
  getHistoricalRoute,
  findRouteWaypoint,
  calculateRouteDistanceKm,
  interpolateGeodesicSegment,
} from "../src/lib/historical-routes";

describe("Componente 1 (Horizonte 2 Fechamento): Datasets Paleogeográficos & Rotas de Expedições Históricas (RN11 & RN12)", () => {
  test("1. Resolução Canônica e Limites de Fronteira das Eras Paleogeográficas (resolvePaleoEra)", () => {
    // Escala Geológica em Milhões de Anos (Ma)
    assert.equal(resolvePaleoEra(300)?.id, "PANGEA_250MA");
    assert.equal(resolvePaleoEra(250)?.id, "PANGEA_250MA");
    assert.equal(resolvePaleoEra(225)?.id, "PANGEA_250MA");

    assert.equal(resolvePaleoEra(224.9)?.id, "BREAKUP_200MA");
    assert.equal(resolvePaleoEra(200)?.id, "BREAKUP_200MA");
    assert.equal(resolvePaleoEra(175)?.id, "BREAKUP_200MA");

    assert.equal(resolvePaleoEra(174.9)?.id, "GONDWANA_150MA");
    assert.equal(resolvePaleoEra(150)?.id, "GONDWANA_150MA");
    assert.equal(resolvePaleoEra(100)?.id, "GONDWANA_150MA");

    assert.equal(resolvePaleoEra(99.9)?.id, "KPG_66MA");
    assert.equal(resolvePaleoEra(66)?.id, "KPG_66MA");
    assert.equal(resolvePaleoEra(0.3)?.id, "KPG_66MA");

    // Tempos recentes / história humana (< 0.3 Ma = 300 mil anos) devem retornar null
    assert.equal(resolvePaleoEra(0.29), null);
    assert.equal(resolvePaleoEra(0), null);
    assert.equal(resolvePaleoEra(null), null);
    assert.equal(resolvePaleoEra(-100 as any), null);
    assert.equal(resolvePaleoEra(NaN as any), null);
    assert.equal(resolvePaleoEra(Infinity as any), null, "Infinity não é era geológica válida");
    assert.equal(resolvePaleoEra(-Infinity as any), null, "-Infinity não é era geológica válida");
  });

  test("2. Helper de Ativação Paleogeográfica (isPaleoActive)", () => {
    assert.equal(isPaleoActive(null), false);
    assert.equal(isPaleoActive(0), false);
    assert.equal(isPaleoActive(0.2), false);
    assert.equal(isPaleoActive(0.3), true);
    assert.equal(isPaleoActive(66), true);
    assert.equal(isPaleoActive(150), true);
    assert.equal(isPaleoActive(250), true);
    assert.equal(isPaleoActive(NaN), false);
    assert.equal(isPaleoActive(Infinity), false, "Infinity deve ser rejeitado");
    assert.equal(isPaleoActive(-Infinity), false, "-Infinity deve ser rejeitado");
  });

  test("3. Recuperação por Identificador Canônico e Códigos em Caixa-Alta (getPaleoEra)", () => {
    assert.equal(getPaleoEra("pangaea-250ma")?.period, "PERMIAN_TRIASSIC");
    assert.equal(getPaleoEra("pangea-250ma")?.period, "PERMIAN_TRIASSIC");
    assert.equal(getPaleoEra("PANGEA_250MA")?.period, "PERMIAN_TRIASSIC");
    assert.equal(getPaleoEra("pangea")?.period, "PERMIAN_TRIASSIC");

    assert.equal(getPaleoEra("breakup-200ma")?.period, "TRIASSIC_JURASSIC");
    assert.equal(getPaleoEra("BREAKUP_200MA")?.period, "TRIASSIC_JURASSIC");
    assert.equal(getPaleoEra("breakup")?.period, "TRIASSIC_JURASSIC");

    assert.equal(getPaleoEra("gondwana-150ma")?.period, "JURASSIC");
    assert.equal(getPaleoEra("GONDWANA_150MA")?.period, "JURASSIC");
    assert.equal(getPaleoEra("gondwana")?.period, "JURASSIC");

    assert.equal(getPaleoEra("cretaceous-66ma")?.period, "CRETACEOUS");
    assert.equal(getPaleoEra("kpg-66ma")?.period, "CRETACEOUS");
    assert.equal(getPaleoEra("KPG_66MA")?.period, "CRETACEOUS");
    assert.equal(getPaleoEra("cretaceous")?.period, "CRETACEOUS");

    assert.equal(getPaleoEra("non-existent"), null);
    assert.equal(getPaleoEra(null), null);
  });

  test("4. Rastreabilidade, Citações Acadêmicas e Indicadores Quantitativos das 4 Eras (RN02 & RN11)", () => {
    const eraKeys = ["pangaea-250ma", "breakup-200ma", "gondwana-150ma", "cretaceous-66ma"] as const;

    for (const key of eraKeys) {
      const era = PALEO_ERAS[key];
      assert.ok(era, `Era ${key} deve existir no catálogo`);
      assert.ok(era.name.length > 5, `Nome da era ${key} deve ser significativo`);
      assert.ok(era.landmassAreaKm2 > 100000000, "Área continental deve ser > 100M km²");
      assert.ok(era.oceanName.length > 5, "Oceano da era deve estar catalogado");
      assert.ok(era.climate.length > 20, "Descrição do clima deve ser detalhada");
      assert.ok(era.dominantLife.length > 20, "Fauna/Flora dominante deve ser detalhada");
      assert.ok(era.dossierMarkdown.length > 200, "Dossiê educativo deve conter seções markdown ricas");

      // Indicadores quantitativos primários
      assert.ok(era.indicators.length >= 3, `Era ${key} deve ter pelo menos 3 indicadores`);
      for (const ind of era.indicators) {
        assert.ok(ind.name.length > 0);
        assert.ok(ind.value.length > 0);
        assert.ok(ind.sourcePrimary.length > 0, "Indicador deve citar a fonte primária");
      }

      // Citações acadêmicas formatadas
      assert.ok(era.citations.length >= 2, `Era ${key} deve ter pelo menos 2 citações acadêmicas`);
      for (const cit of era.citations) {
        assert.ok(cit.authors.length > 0);
        assert.ok(cit.title.length > 0);
        assert.ok(cit.publication.length > 0);
        assert.ok(cit.year >= 1950 && cit.year <= 2026);
      }
    }
  });

  test("5. Catálogo de Placas Tectônicas e Arcos de Fratura da Pangeia (PANGAEA_TECTONIC_PLATES)", () => {
    assert.ok(PANGAEA_TECTONIC_PLATES.length >= 6);

    const types = new Set(PANGAEA_TECTONIC_PLATES.map((p) => p.type));
    assert.ok(types.has("continental"));
    assert.ok(types.has("oceanic"));
    assert.ok(types.has("rifting"));
    assert.ok(types.has("suture"));

    for (const plate of PANGAEA_TECTONIC_PLATES) {
      assert.ok(plate.id.length > 0);
      assert.ok(plate.name.length > 0);
      assert.ok(plate.movementRateMmPerYear > 0);
      assert.ok(plate.description.length > 15);
    }

    // Arcos esféricos para renderização 3D
    assert.ok(PANGAEA_PLATE_ARCS.length >= 5);
    for (const arc of PANGAEA_PLATE_ARCS) {
      assert.ok(arc.id.length > 0);
      assert.ok(arc.coordinates.length >= 5);
      for (const [lat, lng] of arc.coordinates) {
        assert.ok(lat >= -90 && lat <= 90, `Latitude fora dos limites: ${lat}`);
        assert.ok(lng >= -180 && lng <= 180, `Longitude fora dos limites: ${lng}`);
      }
    }
  });

  test("6. Integridade dos Arquivos Físicos de Dados e Texturas Paleogeográficas no Disco", () => {
    // 1. Dataset TopoJSON / GeoJSON de placas tectônicas da Pangeia
    const platesJsonPath = path.join(__dirname, "../public/data/paleo/pangea-plates-250ma.json");
    assert.ok(fs.existsSync(platesJsonPath), "pangea-plates-250ma.json deve existir em public/data/paleo/");
    const jsonContent = JSON.parse(fs.readFileSync(platesJsonPath, "utf8"));
    assert.equal(jsonContent.type, "FeatureCollection");
    assert.ok(Array.isArray(jsonContent.features));
    assert.ok(jsonContent.features.length >= 5);

    const hasRift = jsonContent.features.some((f: any) =>
      f.properties?.type?.toLowerCase().includes("rift")
    );
    const hasSuture = jsonContent.features.some((f: any) =>
      f.properties?.type?.toLowerCase().includes("suture")
    );
    const hasSubduction = jsonContent.features.some((f: any) =>
      f.properties?.type?.toLowerCase().includes("subduction")
    );
    assert.ok(hasRift, "Deve conter feição de rifting");
    assert.ok(hasSuture, "Deve conter feição de sutura");
    assert.ok(hasSubduction, "Deve conter feição de subducção");

    // 2. Paleomapas equirretangulares (PALEOMAP PaleoDEM — ver test/globe-surface.test.ts)
    for (const [eraId, file] of [["pangea-250ma", "paleo_250ma.webp"], ["gondwana-150ma", "paleo_150ma.webp"]] as const) {
      const texturePath = path.join(__dirname, "../public/textures/paleo", file);
      assert.ok(fs.existsSync(texturePath), `${file} deve existir em public/textures/paleo/`);
      const textureBuffer = fs.readFileSync(texturePath);
      assert.ok(textureBuffer.length > 50000, "Textura WebP deve ter tamanho > 50KB");
      // Assinatura WebP canônica: RIFF....WEBP
      assert.equal(textureBuffer.subarray(0, 4).toString("ascii"), "RIFF");
      assert.equal(textureBuffer.subarray(8, 12).toString("ascii"), "WEBP");
      assert.equal(PALEO_ERAS[eraId].textureUrl, `/textures/paleo/${file}`);
    }
  });

  test("7. Reconstituição da Circum-navegação de Magalhães-Elcano: Frota, Waypoints e Pigafetta (RN12)", () => {
    const route = getHistoricalRoute("magellan-1519");
    assert.ok(route, "getHistoricalRoute deve retornar a rota de Magalhães");
    if (!route) return;
    assert.equal(route.type, "MARITIME");
    assert.equal(route.startYear, 1519);
    assert.equal(route.endYear, 1522);
    assert.equal(route.flagCountry, "ESP");
    assert.ok(route.commander.includes("Magalhães") && route.commander.includes("Elcano"));
    assert.ok(route.survivorsCount.includes("18"));

    // 1. Frota das 5 embarcações da Armada das Molucas
    assert.equal(route.fleet.length, 5);
    const vesselNames = route.fleet.map((v) => v.name);
    assert.ok(vesselNames.includes("Trinidad"));
    assert.ok(vesselNames.includes("San Antonio"));
    assert.ok(vesselNames.includes("Concepción"));
    assert.ok(vesselNames.includes("Victoria"));
    assert.ok(vesselNames.includes("Santiago"));

    for (const vessel of route.fleet) {
      assert.ok(vessel.tonnage > 50);
      assert.ok(vessel.originalCaptain.length > 0);
      assert.ok(vessel.fate.length > 20);
    }

    // 2. Waypoints históricos ordenados
    assert.equal(route.waypoints.length, 17);
    for (let i = 0; i < route.waypoints.length; i++) {
      const wp: RouteWaypoint = route.waypoints[i];
      assert.equal(wp.order, i + 1);
      assert.ok(wp.lat >= -90 && wp.lat <= 90);
      assert.ok(wp.lng >= -180 && wp.lng <= 180);
      assert.ok(wp.vessel.length > 0);
      assert.ok(wp.commander.length > 0);
      assert.ok(wp.modernCountry.length > 0);
      assert.ok(wp.description.length > 10);
      assert.ok(wp.historicalEvent.length > 10);
      assert.ok(wp.quoteFromPigafetta || wp.pigafettaDiary);
      assert.ok(wp.daysAtSea >= 0);
      assert.ok(wp.leaguesNavigated >= 0);

      // Cronologia monotônica crescente
      if (i > 0) {
        const prevWp = route.waypoints[i - 1];
        assert.ok(wp.daysAtSea >= prevWp.daysAtSea, `Dias em mar devem crescer: ${wp.daysAtSea} >= ${prevWp.daysAtSea}`);
        assert.ok(wp.leaguesNavigated >= prevWp.leaguesNavigated, `Léguas navegadas devem crescer`);
      }
    }

    // 3. Marcos geográficos fundamentais
    const wpStart = route.waypoints[0];
    assert.equal(wpStart.lat, 36.78);
    assert.equal(wpStart.lng, -6.35);

    const wpGuanabara = route.waypoints.find((w) => w.id === "GUANABARA_BAY");
    assert.ok(wpGuanabara);
    assert.equal(wpGuanabara.modernCountry, "Brasil");
    assert.equal(wpGuanabara.lat, -22.91);

    const wpStrait = route.waypoints.find((w) => w.id === "STRAIT_OF_MAGELLAN");
    assert.ok(wpStrait);
    assert.equal(wpStrait.lat, -53.47);
    assert.equal(wpStrait.lng, -70.92);

    const wpMactan = route.waypoints.find((w) => w.id === "MACTAN_BATTLE");
    assert.ok(wpMactan);
    assert.equal(wpMactan.lat, 10.31);
    assert.equal(wpMactan.lng, 123.97);

    const wpMoluccas = route.waypoints.find((w) => w.id === "TIDORE_MOLUCCAS");
    assert.ok(wpMoluccas);
    assert.equal(wpMoluccas.lat, 0.68);
    assert.equal(wpMoluccas.lng, 127.4);

    const wpEnd = route.waypoints[route.waypoints.length - 1];
    assert.equal(wpEnd.lat, 36.78);
    assert.equal(wpEnd.lng, -6.35);
    assert.equal(wpEnd.vessel, "Nau Victoria");
    assert.equal(wpEnd.commander, "Juan Sebastián Elcano");

    // 4. Cálculo matemático de distância geodésica
    const calculatedDistance = calculateRouteDistanceKm(route.waypoints);
    assert.ok(
      calculatedDistance >= 50000 && calculatedDistance <= 75000,
      `Distância calculada da rota (${calculatedDistance} km) deve bater com circum-navegação real (~60.000 km)`
    );

    // 5. Interpolação geodésica de anti-meridiano
    const pacificInterp = interpolateGeodesicSegment(
      { lat: -12.0, lng: -135.0 },
      { lat: 13.44, lng: 144.79 },
      10
    );
    assert.equal(pacificInterp.length, 11);
    for (const pt of pacificInterp) {
      assert.ok(pt.lat >= -15 && pt.lat <= 15);
      assert.ok(pt.lng >= -180 && pt.lng <= 180);
    }

    // 6. Diário de bordo de Pigafetta
    assert.ok(route.logbookEntries.length >= 5);
    for (const entry of route.logbookEntries) {
      assert.ok(entry.date.length > 0);
      assert.ok(entry.location.length > 0);
      assert.ok(entry.event.length > 0);
      assert.ok(entry.excerptPigafetta && entry.excerptPigafetta.length > 0);
    }
  });

  test("8. Utilitários Procedurais de Canvas Paleogeográfico (Pangeia e Gondwana)", () => {
    // No ambiente Node.js / SSR sem DOM (document === undefined), as funções retornam null graciosamente
    assert.equal(generatePaleoPangeaCanvas(), null);
    assert.equal(generatePaleoGondwanaCanvas(), null);
    assert.equal(generatePaleoCanvas("pangaea-250ma"), null);
    assert.equal(generatePaleoCanvas("gondwana-150ma"), null);

    // Simulação com mock de document/canvas
    const mockCtx = {
      createRadialGradient: () => ({ addColorStop: () => {} }),
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      ellipse: () => {},
      rect: () => {},
      fill: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => mockCtx,
    };
    const originalDoc = (globalThis as any).document;
    (globalThis as any).document = {
      createElement: (tag: string) => (tag === "canvas" ? mockCanvas : null),
    };

    try {
      const pangeaCanvas = generatePaleoPangeaCanvas(512, 256);
      assert.ok(pangeaCanvas !== null);
      assert.equal(pangeaCanvas.width, 512);
      assert.equal(pangeaCanvas.height, 256);

      const gondwanaCanvas = generatePaleoGondwanaCanvas(512, 256);
      assert.ok(gondwanaCanvas !== null);
      assert.equal(gondwanaCanvas.width, 512);
      assert.equal(gondwanaCanvas.height, 256);

      const unifiedPangea = generatePaleoCanvas("pangaea-250ma", 256, 128);
      assert.ok(unifiedPangea !== null);
      assert.equal(unifiedPangea.width, 256);

      const unifiedGondwana = generatePaleoCanvas("gondwana-150ma", 256, 128);
      assert.ok(unifiedGondwana !== null);
      assert.equal(unifiedGondwana.width, 256);
    } finally {
      (globalThis as any).document = originalDoc;
    }
  });

  test("9. Funções Auxiliares Náuticas, Geodésia Esférica e Busca de Waypoints (findRouteWaypoint)", () => {
    // 1. Busca por identificador canônico
    const wpDeparture = findRouteWaypoint("SANLUCAR_DEPARTURE");
    assert.ok(wpDeparture !== null);
    assert.equal(wpDeparture.id, "SANLUCAR_DEPARTURE");
    assert.equal(wpDeparture.lat, 36.78);

    const wpGuanabara = findRouteWaypoint("guanabara_bay"); // Case-insensitive
    assert.ok(wpGuanabara !== null);
    assert.equal(wpGuanabara.id, "GUANABARA_BAY");
    assert.equal(wpGuanabara.modernCountry, "Brasil");

    const wpMactan = findRouteWaypoint("MACTAN_BATTLE");
    assert.ok(wpMactan !== null);
    assert.equal(wpMactan.commander, "Fernão de Magalhães");

    const wpNonExistent = findRouteWaypoint("NON_EXISTENT_WP");
    assert.equal(wpNonExistent, null);

    const wpNull = findRouteWaypoint(null as any);
    assert.equal(wpNull, null);

    // 2. Resiliência do cálculo de distância geodésica
    assert.equal(calculateRouteDistanceKm([]), 0);
    assert.equal(calculateRouteDistanceKm(null as any), 0);
    assert.equal(calculateRouteDistanceKm([{ lat: 0, lng: 0 } as any]), 0);
    assert.equal(calculateRouteDistanceKm([{ lat: NaN, lng: 0 } as any, { lat: 10, lng: 10 } as any]), 0);

    // 3. Resiliência e fidelidade da interpolação geodésica esférica
    assert.deepEqual(interpolateGeodesicSegment(null as any, { lat: 10, lng: 10 }), []);
    assert.deepEqual(interpolateGeodesicSegment({ lat: 10, lng: 10 }, null as any), []);
    assert.deepEqual(interpolateGeodesicSegment({ lat: NaN, lng: 0 }, { lat: 10, lng: 10 }), []);

    // steps < 1 retorna o ponto de origem sem emitir NaN
    const zeroStep = interpolateGeodesicSegment({ lat: 10.0, lng: 20.0 }, { lat: 30.0, lng: 40.0 }, 0);
    assert.equal(zeroStep.length, 1);
    assert.equal(zeroStep[0].lat, 10.0);
    assert.equal(zeroStep[0].lng, 20.0);

    // Interpolação entre Sanlúcar e Canárias com slerp
    const segments = interpolateGeodesicSegment({ lat: 36.78, lng: -6.35 }, { lat: 28.47, lng: -16.25 }, 5);
    assert.equal(segments.length, 6);
    assert.equal(segments[0].lat, 36.78);
    assert.equal(segments[5].lat, 28.47);
  });
});
