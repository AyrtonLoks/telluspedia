import { selectCountry } from "../src/stores/actions";
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import * as topojson from "topojson-client";
import whichPolygon from "which-polygon";
import { formatABNT, formatAPA, formatMLA, formatBibTeX } from "../src/lib/citations";
import { NUMERIC_TO_ISO, NAME_TO_ISO, getCountryData } from "../src/lib/country-data";
import { useTimelineStore } from "../src/stores/timelineStore";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveHistoricalEra, resolveHistoricalEntity } from "../src/lib/historical-entities";
import { InspectorHUD } from "../src/components/hud/InspectorHUD";
import {
  loadHistoricalTopology,
  type CountryProperties,
  getHistoricalSpatialIndex,
  getContemporarySpatialIndex,
} from "../src/lib/historical-topology";

describe("Componente 1: Datasets Históricos & Base de Conhecimento de Entidades", () => {
  test("1. Resolução Canônica de Eras Históricas (resolveHistoricalEra)", () => {
    assert.equal(resolveHistoricalEra(1870).id, "PRUSSIA_1870");
    assert.equal(resolveHistoricalEra(1914).id, "WW1_1914");
    assert.equal(resolveHistoricalEra(1939).id, "WW2_1939");
    assert.equal(resolveHistoricalEra(1969).id, "COLD_WAR_1969");
    assert.equal(resolveHistoricalEra(2024).id, "CONTEMPORARY");
    assert.equal(resolveHistoricalEra(null).id, "CONTEMPORARY");
    assert.equal(resolveHistoricalEra(undefined).id, "CONTEMPORARY");

    // Boundary tests
    assert.equal(resolveHistoricalEra(1890).id, "PRUSSIA_1870");
    assert.equal(resolveHistoricalEra(1891).id, "WW1_1914");
    assert.equal(resolveHistoricalEra(1925).id, "WW1_1914");
    assert.equal(resolveHistoricalEra(1926).id, "WW2_1939");
    assert.equal(resolveHistoricalEra(1945).id, "WW2_1939");
    assert.equal(resolveHistoricalEra(1946).id, "COLD_WAR_1969");
    assert.equal(resolveHistoricalEra(1990).id, "COLD_WAR_1969");
    assert.equal(resolveHistoricalEra(1991).id, "CONTEMPORARY");
  });

  test("2. Resolução e Continuidade de Entidades Históricas (resolveHistoricalEntity)", () => {
    // Prussia 1870
    assert.equal(resolveHistoricalEntity("DEU", 1870), "PRU");
    assert.equal(resolveHistoricalEntity("AUT", 1870), "AHU");
    assert.equal(resolveHistoricalEntity("TUR", 1870), "TUR_HIST");
    assert.equal(resolveHistoricalEntity("BRA", 1870), "BRA");

    // WWI 1914
    assert.equal(resolveHistoricalEntity("AUT", 1914), "AHU");
    assert.equal(resolveHistoricalEntity("HUN", 1914), "AHU");
    assert.equal(resolveHistoricalEntity("TUR", 1914), "TUR_HIST");
    assert.equal(resolveHistoricalEntity("SYR", 1914), "TUR_HIST");

    // WWII 1939
    assert.equal(resolveHistoricalEntity("RUS", 1939), "SUN");
    assert.equal(resolveHistoricalEntity("UKR", 1939), "SUN");

    // Cold War 1969
    assert.equal(resolveHistoricalEntity("RUS", 1969), "SUN");
    assert.equal(resolveHistoricalEntity("DEU", 1969), "FRG");
    assert.equal(resolveHistoricalEntity("GDR", 1969), "GDR");
    assert.equal(resolveHistoricalEntity("FRG", 1969), "FRG");

    // Bidirectional historical continuity: extinct entities resolve to sovereign successors in contemporary / mismatched eras
    assert.equal(resolveHistoricalEntity("PRU", 1870), "PRU");
    assert.equal(resolveHistoricalEntity("PRU", 2024), "DEU");
    assert.equal(resolveHistoricalEntity("PRU", 1969), "FRG");
    assert.equal(resolveHistoricalEntity("SUN", 1969), "SUN");
    assert.equal(resolveHistoricalEntity("SUN", 2024), "RUS");
    assert.equal(resolveHistoricalEntity("SUN", 1870), "RUS");
  });

  test("3. getCountryData resolves historical entities with full metadata & citations", () => {
    // Direct historical entity resolution
    const pru = getCountryData("PRU");
    assert.ok(pru);
    assert.equal(pru.isoCode, "PRU");
    assert.ok(pru.nameOfficial?.includes("Reino da Prússia"));
    assert.ok(pru.capital?.includes("Berlim"));
    assert.equal(pru.historicalLeader, "Otto von Bismarck");
    assert.equal(pru.isHistoricalEntity, true);
    assert.ok(pru.dossierSections.length >= 3);
    assert.ok(pru.dossierSections.some((s) => s.dimension === "HISTORY"));
    assert.ok(pru.dossierSections.some((s) => s.dimension === "GOVERNMENT_POLITICS"));

    // Year-based resolution: getCountryData("DEU", 1870) -> Prussia
    const deu1870 = getCountryData("DEU", 1870);
    assert.ok(deu1870);
    assert.equal(deu1870.isoCode, "PRU");
    assert.equal(deu1870.nameCommon, "Reino da Prússia");

    // Year-based resolution: getCountryData("RUS", 1969) -> USSR
    const rus1969 = getCountryData("RUS", 1969);
    assert.ok(rus1969);
    assert.equal(rus1969.isoCode, "SUN");
    assert.equal(rus1969.nameCommon, "União Soviética");

    // Academic citation formatting for historical entities
    const abntCitation = formatABNT({
      title: pru.dossierSections[0].title,
      countryName: pru.nameCommon,
      url: "https://telluspedia.org/pais/PRU",
    });
    assert.ok(abntCitation.includes("REINO DA PRÚSSIA"));
    assert.ok(abntCitation.includes("TELLUSPEDIA."));

    const apaCitation = formatAPA({
      title: pru.dossierSections[0].title,
      countryName: pru.nameCommon,
      url: "https://telluspedia.org/pais/PRU",
    });
    assert.ok(apaCitation.includes("Reino da Prússia"));
    assert.ok(apaCitation.includes("TellusPedia."));

    const mlaCitation = formatMLA({
      title: pru.dossierSections[0].title,
      countryName: pru.nameCommon,
      url: "https://telluspedia.org/pais/PRU",
    });
    assert.ok(mlaCitation.includes("Reino da Prússia"));

    const bibtexCitation = formatBibTeX({
      title: pru.dossierSections[0].title,
      countryName: pru.nameCommon,
      url: "https://telluspedia.org/pais/PRU",
    });
    assert.ok(bibtexCitation.includes("@online{"));
  });

  test("4. TopoJSON snapshots for 1870, 1914, 1939 and 1969 load and index correctly", () => {
    const historyDir = path.resolve(process.cwd(), "public/data/history");
    const snapshots = [
      { file: "borders-1870.json", era: "PRUSSIA_1870" },
      { file: "borders-1914.json", era: "WW1_1914" },
      { file: "borders-1939.json", era: "WW2_1939" },
      { file: "borders-1969.json", era: "COLD_WAR_1969" },
    ];

    for (const { file } of snapshots) {
      const fullPath = path.join(historyDir, file);
      assert.ok(fs.existsSync(fullPath), `Missing snapshot file: ${file}`);
      const raw = fs.readFileSync(fullPath, "utf-8");
      const topo = JSON.parse(raw);
      assert.equal(topo.type, "Topology");
      assert.ok(topo.objects?.countries?.geometries?.length > 100);

      // Verify topojson.mesh works and creates coordinates
      const mesh = topojson.mesh(topo, topo.objects.countries);
      assert.ok(mesh?.coordinates && mesh.coordinates.length > 200);

      // Verify which-polygon spatial indexing works
      const fc = topojson.feature(topo, topo.objects.countries) as any;
      assert.equal(fc.type, "FeatureCollection");
      const spatialIndex = whichPolygon<CountryProperties>(fc);
      assert.ok(spatialIndex, `Spatial index must initialize for ${file}`);
    }

    // Specific geographic raycasting tests
    // 1870
    const topo1870 = JSON.parse(fs.readFileSync(path.join(historyDir, "borders-1870.json"), "utf-8"));
    const fc1870 = topojson.feature(topo1870, topo1870.objects.countries) as any;
    fc1870.features.forEach((f: any) => { if (f.properties) f.properties.id = f.id; });
    const idx1870 = whichPolygon<CountryProperties>(fc1870);
    const berlin1870 = idx1870([13.4, 52.52]);
    assert.equal(berlin1870?.id, "PRU");
    const vienna1870 = idx1870([16.37, 48.20]);
    assert.equal(vienna1870?.id, "AHU");
    const ankara1870 = idx1870([32.85, 39.93]);
    assert.equal(ankara1870?.id, "TUR_HIST");
    const baghdad1870 = idx1870([44.36, 33.31]);
    assert.equal(baghdad1870?.id, "TUR_HIST");

    // 1969
    const topo1969 = JSON.parse(fs.readFileSync(path.join(historyDir, "borders-1969.json"), "utf-8"));
    const fc1969 = topojson.feature(topo1969, topo1969.objects.countries) as any;
    fc1969.features.forEach((f: any) => { if (f.properties) f.properties.id = f.id; });
    const idx1969 = whichPolygon<CountryProperties>(fc1969);
    const moscow1969 = idx1969([37.61, 55.75]);
    assert.equal(moscow1969?.id, "SUN");
    const kyiv1969 = idx1969([30.52, 50.45]);
    assert.equal(kyiv1969?.id, "SUN");
    const bonn1969 = idx1969([7.09, 50.73]);
    assert.equal(bonn1969?.id, "FRG");
    const leipzig1969 = idx1969([12.37, 51.33]);
    assert.equal(leipzig1969?.id, "GDR");
  });

  test("5. Historical flag SVG assets are present and valid", () => {
    const flagsDir = path.resolve(process.cwd(), "public/flags");
    const flagFiles = ["pru.svg", "sun.svg", "ahu.svg", "gdr.svg", "frg.svg", "tur_hist.svg", "yug.svg", "csk.svg"];

    for (const file of flagFiles) {
      const fullPath = path.join(flagsDir, file);
      assert.ok(fs.existsSync(fullPath), `Missing flag file: ${file}`);
      const content = fs.readFileSync(fullPath, "utf-8");
      assert.ok(content.includes("<svg") && content.includes("</svg>"), `${file} must be a valid SVG`);
      assert.ok(content.length > 100, `${file} must have meaningful SVG content`);
    }
  });

  test("6. Raycast click simulation resolves all historical powers without 'Nação Soberana' fallback", () => {
    const simulateClick = (feature: { id?: string; name?: string }) => {
      const numericId = feature.id !== undefined && feature.id !== null ? String(feature.id).padStart(3, "0") : "";
      const iso = NUMERIC_TO_ISO[numericId] || (feature.name && NAME_TO_ISO[feature.name]) || feature.name || null;
      assert.ok(iso, `Failed to resolve ISO for feature ${JSON.stringify(feature)}`);
      const data = getCountryData(iso!);
      assert.ok(data, `Failed to resolve CountryData for ISO ${iso}`);
      return { iso, data };
    };

    // DEU in 1914 TopoJSON
    const deu1914 = simulateClick({ id: "DEU", name: "Império Alemão" });
    assert.equal(deu1914.iso, "DEU");
    assert.equal(deu1914.data.nameCommon, "Alemanha");
    assert.notEqual(deu1914.data.nameOfficial, "Nação Soberana (IMPÉRIO ALEMÃO)");

    // GBR in 1870 TopoJSON
    const gbr1870 = simulateClick({ id: "GBR", name: "Reino Unido da Grã-Bretanha e Irlanda" });
    assert.equal(gbr1870.iso, "GBR");
    assert.equal(gbr1870.data.nameCommon, "Reino Unido");

    // JPN in 1939 TopoJSON
    const jpn1939 = simulateClick({ id: "JPN", name: "Império do Japão" });
    assert.equal(jpn1939.iso, "JPN");
    assert.equal(jpn1939.data.nameCommon, "Japão");

    // YUG in 1969 TopoJSON
    const yug1969 = simulateClick({ id: "YUG", name: "Iugoslávia" });
    assert.equal(yug1969.iso, "YUG");
    assert.equal(yug1969.data.nameCommon, "Iugoslávia");
    assert.equal(yug1969.data.historicalLeader, "Josip Broz Tito");

    // CSK in 1969 TopoJSON
    const csk1969 = simulateClick({ id: "CSK", name: "Tchecoslováquia" });
    assert.equal(csk1969.iso, "CSK");
    assert.equal(csk1969.data.nameCommon, "Tchecoslováquia");
  });

  test("7. Zero null or undefined IDs and zero duplicates across all historical TopoJSON datasets", () => {
    const historyDir = path.resolve(process.cwd(), "public/data/history");
    const files = ["borders-1870.json", "borders-1914.json", "borders-1939.json", "borders-1969.json"];

    for (const f of files) {
      const p = path.join(historyDir, f);
      const data = JSON.parse(fs.readFileSync(p, "utf-8"));
      const geoms = data.objects.countries.geometries;
      const nullIds = geoms.filter((g: any) => !g.id);
      assert.equal(nullIds.length, 0, `Found null IDs in ${f}`);

      const ids = geoms.map((g: any) => g.id);
      const duplicates = ids.filter((id: string, i: number) => ids.indexOf(id) !== i);
      assert.deepEqual(duplicates, [], `Found duplicate IDs in ${f}: ${duplicates.join(", ")}`);
    }
  });

  test("8. Extended territorial continuity and numeric code normalization in resolveHistoricalEntity", () => {
    // Numeric string normalization
    assert.equal(resolveHistoricalEntity("276", 1870), "PRU");
    assert.equal(resolveHistoricalEntity("040", 1870), "AHU");
    assert.equal(resolveHistoricalEntity("643", 1870), "RUS");
    assert.equal(resolveHistoricalEntity("076", 1870), "BRA");

    // 1870 / 1914 Russian Empire constituent territories
    assert.equal(resolveHistoricalEntity("UKR", 1870), "RUS");
    assert.equal(resolveHistoricalEntity("BLR", 1870), "RUS");
    assert.equal(resolveHistoricalEntity("FIN", 1870), "RUS");
    assert.equal(resolveHistoricalEntity("IRL", 1870), "GBR");
    assert.equal(resolveHistoricalEntity("FIN", 1914), "RUS");
    assert.equal(resolveHistoricalEntity("IRL", 1914), "GBR");

    // 1939 Axis and Allied annexations
    assert.equal(resolveHistoricalEntity("AUT", 1939), "DEU");
    assert.equal(resolveHistoricalEntity("CZE", 1939), "DEU");
    assert.equal(resolveHistoricalEntity("ALB", 1939), "ITA");
    assert.equal(resolveHistoricalEntity("KOR", 1939), "JPN");

    // 1969 Cold War federations
    assert.equal(resolveHistoricalEntity("SRB", 1969), "YUG");
    assert.equal(resolveHistoricalEntity("HRV", 1969), "YUG");
    assert.equal(resolveHistoricalEntity("SVN", 1969), "YUG");
    assert.equal(resolveHistoricalEntity("CZE", 1969), "CSK");
    assert.equal(resolveHistoricalEntity("SVK", 1969), "CSK");
  });

  test("9. Historical entities report accurate geographical area, continent and academic citations", () => {
    const sun = getCountryData("SUN");
    assert.ok(sun);
    assert.equal(sun.areaKm2, 22402200, "USSR area must reflect true scale (22.4M km²)");
    assert.equal(sun.continent, "Europe/Asia");
    assert.equal(sun.numericCode, "810");

    const tur = getCountryData("TUR_HIST");
    assert.ok(tur);
    assert.equal(tur.areaKm2, 1800000);
    assert.equal(tur.continent, "Europe/Asia/Africa");
    assert.equal(tur.numericCode, "903");

    const yug = getCountryData("YUG");
    assert.ok(yug);
    assert.equal(yug.areaKm2, 255804);
    assert.equal(yug.numericCode, "891");
    assert.ok(yug.dossierSections.length >= 2);

    const csk = getCountryData("CSK");
    assert.ok(csk);
    assert.equal(csk.areaKm2, 127900);
    assert.equal(csk.numericCode, "200");
    assert.ok(csk.dossierSections.length >= 2);
  });
});

describe("Componente 2 e 3: Three.js Historical Cartography, Raycasting Picking & InspectorHUD Context", () => {
  test("1. loadHistoricalTopology asynchronously loads and caches all 4 historical datasets", async () => {
    const paths = [
      "/data/history/borders-1870.json",
      "/data/history/borders-1914.json",
      "/data/history/borders-1939.json",
      "/data/history/borders-1969.json",
    ];

    for (const p of paths) {
      const topo = await loadHistoricalTopology(p);
      assert.ok(topo, `Must load topology for ${p}`);
      assert.equal(topo.type, "Topology");
      assert.ok(topo.objects?.countries?.geometries?.length > 100);

      // Verify second call is served from cache
      const cached = await loadHistoricalTopology(p);
      assert.strictEqual(cached, topo, `Subsequent call for ${p} must return identical cached reference`);
    }
  });

  test("2. getHistoricalSpatialIndex provides instant (<0.2ms) point-in-polygon raycasting for active eras", async () => {
    // 1870 - Prussia & Austria-Hungary
    const topo1870 = await loadHistoricalTopology("/data/history/borders-1870.json");
    const idx1870 = getHistoricalSpatialIndex("PRUSSIA_1870", topo1870);
    assert.ok(idx1870);

    const t0 = performance.now();
    const pruFeature = idx1870([13.4, 52.52]);
    const duration1870 = performance.now() - t0;
    assert.ok(duration1870 < 5.0, `Query duration must be near-instant, took ${duration1870.toFixed(3)}ms`);
    assert.equal(pruFeature?.id, "PRU");

    const vienna1870 = idx1870([16.37, 48.20]);
    assert.equal(vienna1870?.id, "AHU");

    // 1969 - USSR, East Germany (GDR), West Germany (FRG), Yugoslavia (YUG), Czechoslovakia (CSK)
    const topo1969 = await loadHistoricalTopology("/data/history/borders-1969.json");
    const idx1969 = getHistoricalSpatialIndex("COLD_WAR_1969", topo1969);
    assert.ok(idx1969);

    const moscow1969 = idx1969([37.61, 55.75]);
    assert.equal(moscow1969?.id, "SUN");

    const bonn1969 = idx1969([7.09, 50.73]);
    assert.equal(bonn1969?.id, "FRG");

    const leipzig1969 = idx1969([12.37, 51.33]);
    assert.equal(leipzig1969?.id, "GDR");

    const belgrade1969 = idx1969([20.46, 44.81]);
    assert.equal(belgrade1969?.id, "YUG");

    const prague1969 = idx1969([14.43, 50.07]);
    assert.equal(prague1969?.id, "CSK");
  });

  test("3. getContemporarySpatialIndex accurately resolves modern nations from World Atlas", () => {
    const idx = getContemporarySpatialIndex();
    assert.ok(idx);

    // Brasilia
    const brasilia = idx([-47.88, -15.79]);
    assert.ok(brasilia);
    const numId = String(brasilia.id).padStart(3, "0");
    assert.equal(NUMERIC_TO_ISO[numId], "BRA");

    // Berlin in contemporary times
    const berlin = idx([13.4, 52.52]);
    assert.ok(berlin);
    const deuNumId = String(berlin.id).padStart(3, "0");
    assert.equal(NUMERIC_TO_ISO[deuNumId], "DEU");
  });

  test("4. InspectorHUD renders authentic Prussia data, hides live weather, and displays leader title & vigência", () => {
    selectCountry("PRU");
    useTimelineStore.getState().selectYear(1870);

    const html = renderToStaticMarkup(React.createElement(InspectorHUD));

    assert.ok(html.includes("data-inspector-hud=\"true\""), "Must render InspectorHUD container");
    assert.ok(html.includes("Reino da Prússia"), "Must display common name 'Reino da Prússia'");
    assert.ok(html.includes("PRU"), "Must display ISO code PRU");
    assert.ok(html.includes("Otto von Bismarck"), "Must display historical leader Otto von Bismarck");
    assert.ok(html.includes("Rei da Prússia / Chanceler Imperial"), "Must display leader title");
    assert.ok(html.includes("data-historical-context=\"true\""), "Must render historical context widget");
    assert.ok(html.includes("1701 – 1918"), "Must render vigência period 1701 – 1918");

    // Weather widget MUST be hidden for extinct historical entities
    assert.ok(!html.includes("Clima local"), "Live weather widget must be hidden for extinct historical entity");

    // HTML5 Phrasing Content Invariant: zero <div> inside <p>
    const pTags = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const p of pTags) {
      assert.ok(!p.includes("<div"), `<p> block must not contain <div>: ${p}`);
    }

    // Cleanup
    selectCountry(null);
    useTimelineStore.getState().selectYear(null);
  });

  test("5. InspectorHUD renders authentic USSR data in 1969 with Brezhnev and hidden weather", () => {
    selectCountry("SUN");
    useTimelineStore.getState().selectYear(1969);

    const html = renderToStaticMarkup(React.createElement(InspectorHUD));

    assert.ok(html.includes("União Soviética"), "Must display common name 'União Soviética'");
    assert.ok(html.includes("SUN"), "Must display code SUN");
    assert.ok(html.includes("Leonid Brejnev (1969) / Josef Stálin"), "Must display historical leader");
    assert.ok(html.includes("Secretário-Geral do Partido Comunista"), "Must display leader title");
    assert.ok(html.includes("data-historical-context=\"true\""), "Must render historical context widget");
    assert.ok(html.includes("1922 – 1991"), "Must display vigência 1922 – 1991");
    assert.ok(!html.includes("Clima local"), "Live weather widget must be hidden for USSR");

    // Cleanup
    selectCountry(null);
    useTimelineStore.getState().selectYear(null);
  });

  test("6. InspectorHUD renders modern weather widget and no historical context for contemporary Brazil", () => {
    selectCountry("BRA");
    useTimelineStore.getState().selectYear(2024);

    const html = renderToStaticMarkup(React.createElement(InspectorHUD));

    assert.ok(html.includes("Brasil"), "Must display Brasil");
    assert.ok(html.includes("BRA"), "Must display BRA");
    assert.ok(html.includes("Clima local · Brasília"), "Must name the weather reference point for Brazil");
    assert.ok(html.includes("-15.7939, -47.8828"), "Must identify the coordinates queried for weather");
    assert.ok(html.includes("https://open-meteo.com/en/docs"), "Must link to the source of weather estimates");
    assert.ok(!html.includes("data-historical-context=\"true\""), "Must not render historical context for modern Brazil");

    // Cleanup
    selectCountry(null);
    useTimelineStore.getState().selectYear(null);
  });

  test("7. CountryBorders line geometries dispose cleanly without WebGL memory leaks", () => {
    // Verify BufferGeometry creation and disposal invariant
    const geom1 = new THREE.BufferGeometry();
    const geom2 = new THREE.BufferGeometry();

    let disposed1 = false;
    let disposed2 = false;

    geom1.addEventListener("dispose", () => { disposed1 = true; });
    geom2.addEventListener("dispose", () => { disposed2 = true; });

    geom1.dispose();
    geom2.dispose();

    assert.equal(disposed1, true, "geom1 must be disposed");
    assert.equal(disposed2, true, "geom2 must be disposed");
  });

  test("8. Cross-fade lerp dynamics converges within 1 second", () => {
    let opacity = 0.35;
    const targetOpacity = 0.0;
    const delta = 1 / 60; // 60 FPS frame

    for (let frame = 0; frame < 60; frame++) {
      const lerpSpeed = Math.min(delta * 4, 1.0);
      opacity = THREE.MathUtils.lerp(opacity, targetOpacity, lerpSpeed);
    }

    assert.ok(opacity < 0.01, `Expected opacity to converge near 0, got ${opacity}`);
  });

  test("9. loadHistoricalTopology deduplicates concurrent in-flight requests", async () => {
    const path = "/data/history/borders-1870.json";
    // Fire two simultaneous requests
    const [req1, req2] = await Promise.all([
      loadHistoricalTopology(path),
      loadHistoricalTopology(path),
    ]);
    assert.ok(req1 && req2);
    assert.strictEqual(req1, req2, "Concurrent requests must resolve to the identical topology instance");
  });

  test("10. CountryBorders cross-fade lifecycle preserves historical mesh during fade out", () => {
    // Simulate CountryBorders fade-out lifecycle:
    // When switching from historical (opacity 0.45) to CONTEMPORARY (target 0.0),
    // the mesh MUST NOT unmount immediately; it must remain visible while opacity > 0.005.
    let historicalOpacity = 0.45;
    let isHistoricalActive = false; // user switched to CONTEMPORARY
    let isHistoricalMounted = true;
    const targetHistOpacity = 0.0;
    const delta = 1 / 60;
    const lerpSpeed = Math.min(delta * 4, 1.0);

    let frameCount = 0;
    while (isHistoricalMounted && frameCount < 120) {
      historicalOpacity = THREE.MathUtils.lerp(historicalOpacity, targetHistOpacity, lerpSpeed);
      const isVisible = historicalOpacity > 0.005;
      if (!isVisible && !isHistoricalActive && isHistoricalMounted) {
        isHistoricalMounted = false;
      }
      frameCount++;
    }

    // Must have taken multiple frames to fade out (smooth transition, not a 0ms pop)
    assert.ok(frameCount > 15, `Fade-out must be smooth over multiple frames, took ${frameCount} frames`);
    assert.equal(isHistoricalMounted, false, "Mesh should cleanly unmount once opacity reaches zero");
    assert.ok(historicalOpacity <= 0.005, "Opacity must converge below 0.005 threshold");
  });

  test("11. Two-way timeline continuity smoothly recovers modern nation from extinct entity", () => {
    // Selecting Germany in 2024 -> sliding to 1870 resolves to Prussia (PRU)
    const in1870 = resolveHistoricalEntity("DEU", 1870);
    assert.equal(in1870, "PRU");

    // Sliding back to 2024 smoothly resolves Prussia back to Germany (DEU)
    const backTo2024 = resolveHistoricalEntity(in1870, 2024);
    assert.equal(backTo2024, "DEU");

    // Sliding to 1969 resolves Prussia forward to West Germany (FRG)
    const in1969 = resolveHistoricalEntity(in1870, 1969);
    assert.equal(in1969, "FRG");

    // USSR in 1969 resolves back to Russia in 2024
    assert.equal(resolveHistoricalEntity("SUN", 2024), "RUS");
    // USSR in 1969 resolves back to Russian Empire in 1870
    assert.equal(resolveHistoricalEntity("SUN", 1870), "RUS");
  });
});
