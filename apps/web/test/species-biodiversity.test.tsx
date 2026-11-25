/**
 * D32 — Mapa de Espécies Animais & Biodiversidade (RN13.7):
 * - Catálogo curado bilíngue com chaves GBIF Backbone verificadas e categorias IUCN Red List (CR–LC).
 * - Proxy server-side GBIF Occurrence API v1 sob contrato T05 (live / cache / stale / fallback honesto T03).
 * - Filtros por grupo taxonômico, status IUCN, bioma (D31) e país + UI D14 + GPU dispose (RN21).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  IUCN_STATUS_META,
  SPECIES_BY_ID,
  SPECIES_CATALOG,
  filterSpeciesCatalog,
  getSpeciesForBiome,
  getSpeciesForCountry,
} from "../src/lib/species-catalog";
import {
  IUCN_STATUS_CODES,
  TAXON_GROUPS,
  isIucnStatus,
  isTaxonGroup,
} from "../src/lib/species-types";
import {
  createGbifSpeciesSource,
  parseGbifOccurrencesResponse,
} from "../src/lib/species-gbif";
import { BIOMES_BY_ID } from "../src/lib/biomes-catalog";
import { BRAZIL_BIOME_IDS } from "../src/lib/biomes-types";
import { speciesCacheKey, useSpeciesStore } from "../src/stores/speciesStore";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { useLocaleStore } from "../src/stores/localeStore";
import { EN_MESSAGES } from "../src/lib/i18n/en";
import { sanitizeStudy, studyInput } from "../src/lib/study-schema";
import { encodeView, restoreView } from "../src/lib/explore/view-url";
import { DEFAULT_CAMERA_OFFSET, type ViewCamera } from "../src/lib/explore/view-camera";
import { searchExplore } from "../src/lib/explore/search";
import { SpeciesLayerControls } from "../src/components/observatory/SpeciesLayerControls";
import { SpeciesHudOverlay } from "../src/components/observatory/SpeciesHudOverlay";
import { CountryFaunaSection } from "../src/components/hud/CountryFaunaSection";

const webRoot = path.resolve(__dirname, "..");

const SAMPLE_GBIF_JSON = {
  count: 143687,
  results: [
    {
      key: 6129874507,
      decimalLatitude: -17.3456,
      decimalLongitude: -56.9123,
      year: 2025,
      countryCode: "BR",
      locality: "Pantanal Norte, Poconé",
      basisOfRecord: "HUMAN_OBSERVATION",
    },
    {
      // Duplicata muito próxima (mesma célula espacial) — deve ser deduplicada
      key: 6129874508,
      decimalLatitude: -17.346,
      decimalLongitude: -56.912,
      year: 2025,
      countryCode: "BR",
      locality: "Pantanal Norte, Poconé",
      basisOfRecord: "HUMAN_OBSERVATION",
    },
    {
      key: 6129874509,
      decimalLatitude: -3.112,
      decimalLongitude: -60.021,
      year: 2024,
      countryCode: "BR",
      stateProvince: "Amazonas",
      basisOfRecord: "MACHINE_OBSERVATION",
    },
    {
      key: 9999999999,
      decimalLatitude: 999,
      decimalLongitude: -60.0,
      year: 2024,
    },
  ],
};

describe("D32 · Catálogo taxonômico, IUCN Red List e vínculo com Biomas (D31)", () => {
  test("1. Catálogo cobre todos os grupos taxonômicos, categorias IUCN e os 6 biomas brasileiros com metadados íntegros", () => {
    assert.ok(SPECIES_CATALOG.length >= 25, "catálogo deve conter ≥ 25 espécies emblemáticas");

    const ids = new Set<string>();
    const taxonKeys = new Set<number>();

    for (const sp of SPECIES_CATALOG) {
      assert.ok(!ids.has(sp.id), `id duplicado: ${sp.id}`);
      ids.add(sp.id);
      assert.ok(Number.isInteger(sp.gbifTaxonKey) && sp.gbifTaxonKey > 0, `taxonKey inválido: ${sp.id}`);
      assert.ok(!taxonKeys.has(sp.gbifTaxonKey), `taxonKey duplicado: ${sp.gbifTaxonKey}`);
      taxonKeys.add(sp.gbifTaxonKey);

      assert.match(sp.scientificName, /^[A-Z][a-z]+ [a-z]+/, `nome científico binomial inválido: ${sp.scientificName}`);
      assert.ok(isTaxonGroup(sp.taxonGroup));
      assert.ok(isIucnStatus(sp.iucnStatus));
      assert.ok(sp.countries.length > 0);
      assert.ok(sp.biomeIds.length > 0);
      for (const bId of sp.biomeIds) {
        assert.ok(BIOMES_BY_ID[bId], `bioma desconhecido ${bId} em ${sp.id}`);
      }
      assert.ok(sp.centerLat >= -90 && sp.centerLat <= 90);
      assert.ok(sp.centerLng >= -180 && sp.centerLng <= 180);
      assert.ok(sp.populationNotePt.length > 15 && sp.populationNoteEn.length > 15);
      assert.ok(sp.habitatPt.length > 15 && sp.habitatEn.length > 15);
      assert.ok(sp.threatsPt.length > 15 && sp.threatsEn.length > 15);
      assert.match(sp.iucnUrl, /^https:\/\/www\.iucnredlist\.org\//);
      assert.match(sp.gbifUrl, /^https:\/\/www\.gbif\.org\/species\/\d+$/);
    }

    for (const group of TAXON_GROUPS) {
      assert.ok(
        SPECIES_CATALOG.some((sp) => sp.taxonGroup === group),
        `grupo taxonômico ${group} deve ter ao menos 1 espécie`
      );
    }
    for (const code of IUCN_STATUS_CODES) {
      assert.ok(IUCN_STATUS_META[code]);
      assert.ok(
        SPECIES_CATALOG.some((sp) => sp.iucnStatus === code),
        `categoria IUCN ${code} deve ter ao menos 1 espécie`
      );
    }
    for (const brBiome of BRAZIL_BIOME_IDS) {
      assert.ok(
        getSpeciesForBiome(brBiome).length > 0,
        `bioma brasileiro ${brBiome} deve possuir espécies catalogadas`
      );
    }
  });

  test("2. Filtros combinados por grupo taxonômico, IUCN, bioma e país funcionam corretamente", () => {
    const brazilBirds = filterSpeciesCatalog({
      taxonGroup: "birds",
      countryIso3: "BRA",
    });
    assert.ok(brazilBirds.length >= 3);
    assert.ok(brazilBirds.every((sp) => sp.taxonGroup === "birds" && sp.countries.includes("BRA")));

    const crSpecies = filterSpeciesCatalog({ iucnStatus: "CR" });
    assert.ok(crSpecies.length >= 3);
    assert.ok(crSpecies.every((sp) => sp.iucnStatus === "CR"));

    const pantanalSpecies = filterSpeciesCatalog({ biomeId: "BR_PANTANAL" });
    assert.ok(pantanalSpecies.some((sp) => sp.id === "panthera-onca"));
    assert.ok(pantanalSpecies.some((sp) => sp.id === "anodorhynchus-hyacinthinus"));

    const brazilFauna = getSpeciesForCountry("BRA");
    assert.ok(brazilFauna.length >= 8);
    assert.equal(getSpeciesForCountry("XXX").length, 0);
  });
});

describe("D32 · Proxy GBIF Occurrence API v1 (T05 / T03)", () => {
  test("3. Parser deduplica células próximas, rejeita coordenadas inválidas e respeita live/cache/stale/fallback", async (t) => {
    t.mock.method(console, "warn", () => undefined);
    const jaguar = SPECIES_BY_ID["panthera-onca"];
    assert.ok(jaguar);

    const parsed = parseGbifOccurrencesResponse(SAMPLE_GBIF_JSON, jaguar, "BR");
    assert.equal(parsed.totalGbifCount, 143687);
    assert.equal(parsed.sampledCount, 2);
    assert.equal(parsed.points.length, 2);
    assert.equal(parsed.countryFilter, "BR");
    assert.match(parsed.gbifSearchUrl, /taxon_key=5219426/);
    assert.match(parsed.points[0].gbifUrl, /^https:\/\/www\.gbif\.org\/occurrence\/6129874507$/);

    let failFetch = false;
    const src = createGbifSpeciesSource(
      jaguar,
      null,
      (async () => {
        if (failFetch) throw new Error("network down");
        return new Response(JSON.stringify(SAMPLE_GBIF_JSON), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }) as typeof fetch
    );

    const t0 = Date.UTC(2026, 10, 25, 14, 0, 0);
    const live = await src.get(t0);
    assert.equal(live.envelope.meta.source, "live");
    assert.equal(live.envelope.data.points.length, 2);

    const cached = await src.get(t0 + 60_000);
    assert.equal(cached.cacheHit, true);

    failFetch = true;
    const stale = await src.get(t0 + 35 * 60 * 1000);
    assert.equal(stale.envelope.meta.stale, true);
    assert.equal(stale.envelope.data.points.length, 2);

    const offlineSrc = createGbifSpeciesSource(
      jaguar,
      null,
      (async () => new Response("Unavailable", { status: 503 })) as typeof fetch
    );
    const fb = await offlineSrc.get(t0);
    assert.equal(fb.envelope.meta.source, "fallback");
    assert.equal(fb.envelope.data.points.length, 0);
    assert.equal(fb.envelope.data.totalGbifCount, 0);
  });
});

describe("D32 · UI D14 bilíngue, GPU dispose, URL, Studies e Busca ⌘K", () => {
  beforeEach(() => {
    useSpeciesStore.getState().resetSpecies();
    useObservatoryStore.getState().resetObservatory();
    useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
  });

  test("4. Controles, ficha flutuante e seção no painel do país renderizam em pt-BR e en", () => {
    const jaguar = SPECIES_BY_ID["panthera-onca"];
    const key = speciesCacheKey(jaguar.id);
    useSpeciesStore.setState({
      selectedSpeciesId: jaguar.id,
      hoveredSpeciesId: "anodorhynchus-hyacinthinus",
      occurrencesByKey: {
        [key]: parseGbifOccurrencesResponse(SAMPLE_GBIF_JSON, jaguar, null),
      },
      metaByKey: {
        [key]: {
          source: "live",
          provider: "GBIF Occurrence API v1",
          fetchedAt: "2026-11-25T14:00:00.000Z",
          stale: false,
        },
      },
    });

    const controlsPt = renderToStaticMarkup(<SpeciesLayerControls />);
    assert.match(controlsPt, /data-testid="species-layer-controls"/);
    assert.match(controlsPt, /Onça-pintada/);
    assert.match(controlsPt, /Panthera onca/);

    const hudPt = renderToStaticMarkup(<SpeciesHudOverlay />);
    assert.match(hudPt, /data-testid="species-hover-pill"/);
    assert.match(hudPt, /Arara-azul-grande/);
    assert.match(hudPt, /data-testid="species-floating-card"/);
    assert.match(hudPt, /143\.687/);
    assert.match(hudPt, /IUCN NT/);
    assert.match(hudPt, /https:\/\/www\.iucnredlist\.org\//);

    const countryPt = renderToStaticMarkup(<CountryFaunaSection isoCode="BRA" />);
    assert.match(countryPt, /data-testid="country-fauna-section"/);
    assert.match(countryPt, /Onça-pintada/);
    assert.match(countryPt, /Mico-leão-dourado/);

    useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
    const hudEn = renderToStaticMarkup(<SpeciesHudOverlay />);
    assert.match(hudEn, /Jaguar/);
    assert.match(hudEn, /Georeferenced records \(GBIF\)/);
    assert.match(hudEn, /Associated biomes \(view on globe\)/);

    const countryEn = renderToStaticMarkup(<CountryFaunaSection isoCode="BRA" />);
    assert.match(countryEn, /Emblematic fauna \(IUCN \/ GBIF\)/);
    assert.match(countryEn, /Golden Lion Tamarin/);
  });

  test("5. SpeciesLayer descarta recursos GPU (RN21), pausa no throttle (RN22) e integra URL/Studies/⌘K", () => {
    const src = fs.readFileSync(
      path.join(webRoot, "src/components/globe/SpeciesLayer.tsx"),
      "utf-8"
    );
    assert.match(src, /markerGeometry\.dispose\(\)/);
    assert.match(src, /markerRingGeometry\.dispose\(\)/);
    assert.match(src, /rangeRingGeometry\?\.dispose\(\)/);
    assert.match(src, /occurrencesGeometry\?\.dispose\(\)/);
    assert.match(src, /occurrencesMaterial\.dispose\(\)/);
    assert.match(src, /if \(isThrottled/);

    const obs = useObservatoryStore.getState();
    obs.setAllLayers(["SPECIES_MAP"]);
    const view: ViewCamera = { offset: [...DEFAULT_CAMERA_OFFSET], restore: null, onChange: null };
    const encoded = encodeView(view);
    assert.match(encoded, /camadas=SPECIES_MAP/);
    obs.resetObservatory();
    assert.equal(restoreView(`?visao=1&${encoded}`, view), true);
    assert.ok(useObservatoryStore.getState().activeLayers.includes("SPECIES_MAP"));

    const validStudy = studyInput.safeParse({
      title: "Biodiversidade Brasileira (GBIF + IUCN)",
      activeObservatoryLayers: ["SPECIES_MAP", "BIOMES_MAP"],
    });
    assert.equal(validStudy.success, true);
    assert.deepEqual(
      sanitizeStudy({ activeObservatoryLayers: ["SPECIES_MAP"] }).activeObservatoryLayers,
      ["SPECIES_MAP"]
    );

    assert.ok(searchExplore("biodiversidade").some((r) => r.id === "layer:SPECIES_MAP"));
    assert.ok(searchExplore("IUCN").some((r) => r.id === "layer:SPECIES_MAP"));
  });
});
