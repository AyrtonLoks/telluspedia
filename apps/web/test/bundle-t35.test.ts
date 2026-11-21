/**
 * T35 — Segunda onda de bundle: o carregamento inicial de `/` não leva dossiês/indicadores dos
 * países, entidades históricas, o SGP4 (satellite.js) nem o d3-geo.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { geoCentroid } from "d3-geo";

import { GLOBAL_MILESTONES, PILOT_COUNTRY_ISOS, findMilestoneById, getCountryMilestones } from "../src/lib/milestones";
import * as countryData from "../src/lib/country-data";
import { WORLD_COUNTRIES_CATALOG } from "../src/lib/country-catalog";
import { COUNTRY_ISO_CODES } from "../src/lib/country-isos";
import { HISTORICAL_ENTITY_IDS, HISTORICAL_ERAS, resolveHistoricalEra } from "../src/lib/historical-eras";
import * as historicalEntities from "../src/lib/historical-entities";
import { buildChoroplethDataset } from "../src/lib/choropleth-dataset";
import { observationLocation } from "../src/lib/observatory-data";
import { useObservatoryStore, loadSatelliteLib } from "../src/stores/observatoryStore";

const webRoot = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(webRoot, rel), "utf-8");

/** Módulos que entram no primeiro carregamento de `/` (medidos com o bundle analyzer em 2026-11-21). */
const EAGER = [
  "src/lib/milestones.ts",
  "src/lib/country-isos.ts",
  "src/lib/historical-eras.ts",
  "src/lib/explore/view-url.ts",
  "src/lib/epoch/useEpochState.ts",
  "src/lib/epoch/resolveEpoch.ts",
  "src/lib/timeline/era-study.ts",
  "src/lib/scenes/schema.ts",
  "src/lib/choropleth.ts",
  "src/lib/observatory-data.ts",
  "src/stores/observatoryStore.ts",
  "src/stores/choroplethStore.ts",
  "src/stores/actions.ts",
  "src/components/timeline/TimelineAxis.tsx",
  "src/components/timeline/MilestonePin.tsx",
  "src/components/timeline/MilestoneCluster.tsx",
];
const HEAVY = [
  /from\s+["'][^"']*country-data["']/,
  /from\s+["'][^"']*historical-entities["']/,
  /from\s+["'][^"']*lib\/satellites["']|from\s+["']\.\/satellites["']/,
  /from\s+["']satellite\.js["'](?!;?\s*$)/,
  /from\s+["']d3-geo["']/,
  /from\s+["'][^"']*countries-worldbank-indicators\.json["']/,
];

describe("T35 · carregamento inicial sem dados pesados", () => {
  test("módulos do primeiro carregamento não importam (estaticamente) os módulos pesados", () => {
    for (const rel of EAGER) {
      const src = read(rel).split("\n").filter((l) => /^\s*import\s/.test(l) && !/^\s*import\s+type\s/.test(l)).join("\n");
      for (const re of HEAVY) assert.doesNotMatch(src, re, `${rel} não deve importar ${re}`);
    }
    // O store só usa o tipo SatRec do satellite.js; o SGP4 vem por import().
    assert.match(read("src/stores/observatoryStore.ts"), /import\("@\/lib\/satellites"\)/);
    assert.match(read("src/components/globe/GlobeCanvas.tsx"), /lazy\(\(\) => import\("\.\/IssOrbitLayer"\)/);
    assert.match(read("src/components/timeline/MilestonePin.tsx"), /await import\("@\/lib\/country-data"\)/);
  });

  test("listas leves batem com as fontes completas", () => {
    assert.deepEqual([...PILOT_COUNTRY_ISOS].sort(), Object.keys(countryData.PILOT_COUNTRIES).sort());
    assert.deepEqual([...HISTORICAL_ENTITY_IDS].sort(), Object.keys(historicalEntities.HISTORICAL_ENTITIES).sort());
    assert.deepEqual([...COUNTRY_ISO_CODES].sort(), Object.keys(WORLD_COUNTRIES_CATALOG).sort());
    assert.equal(countryData.WORLD_COUNTRIES_CATALOG, WORLD_COUNTRIES_CATALOG, "country-data re-exporta o mesmo catálogo");
    assert.equal(historicalEntities.HISTORICAL_ERAS, HISTORICAL_ERAS);
    assert.equal(historicalEntities.resolveHistoricalEra(1969).id, resolveHistoricalEra(1969).id);
  });

  test("marcos: mesmos objetos e a mesma busca por id de antes", () => {
    assert.equal(countryData.GLOBAL_MILESTONES, GLOBAL_MILESTONES);
    for (const iso of PILOT_COUNTRY_ISOS) {
      assert.equal(countryData.PILOT_COUNTRIES[iso].milestones, getCountryMilestones(iso), iso);
      for (const m of getCountryMilestones(iso)) assert.equal(findMilestoneById(m.id)?.countryIso, m.countryIso || iso);
    }
    assert.deepEqual(getCountryMilestones("ARG"), []);
    assert.equal(findMilestoneById("glo-1969")?.year, 1969);
    assert.equal(findMilestoneById("nao-existe"), undefined);
  });

  test("dataset coroplético continua completo fora de choropleth.ts", () => {
    const gdp = buildChoroplethDataset("NY.GDP.MKTP.CD");
    assert.equal(gdp.totalCountries, Object.keys(WORLD_COUNTRIES_CATALOG).length);
    assert.ok(gdp.availableCount > 150);
  });

  test("centroide dos eventos EONET igual ao do d3-geo", () => {
    const rings = [
      [[-50, -10], [-40, -10], [-40, 0], [-50, 0], [-50, -10]],
      [[170, 60], [-170, 60], [-170, 70], [170, 70], [170, 60]],
      [[10, 80], [100, 85], [-120, 82], [10, 80]],
    ];
    for (const ring of rings) {
      const [lng, lat] = geoCentroid({ type: "MultiPoint", coordinates: ring.slice(0, -1) });
      const got = observationLocation({ type: "Polygon", coordinates: [ring as [number, number][]], date: "" } as never);
      assert.ok(Math.abs(got.lng - lng) < 1e-9 && Math.abs(got.lat - lat) < 1e-9, JSON.stringify(ring));
    }
  });

  test("telemetria da ISS: nula até a camada ligar; o primeiro cálculo baixa o SGP4", async () => {
    useObservatoryStore.getState().resetObservatory();
    useObservatoryStore.setState({ issTelemetry: null, satellites: [] });
    await loadSatelliteLib();
    useObservatoryStore.getState().refreshIssTelemetry(Date.parse("2026-11-20T12:00:00Z"));
    const t = useObservatoryStore.getState().issTelemetry;
    assert.ok(t && t.altitudeKm > 300 && t.altitudeKm < 500, "posição de referência por SGP4");
  });
});
