import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildCompareMetadata,
  buildCountryMetadata,
  buildStudyMetadata,
  formatStudyPeriod,
  loadCountryByIso,
  loadStudyBySlug,
  parseCompareIsos,
  readFlagDataUri,
} from "../src/lib/server-loaders";
import { getMemoryStudy } from "../src/lib/studies-store";
import { applyInitialGlobeState } from "../src/components/shell/GlobeExperienceShell";
import { useGlobeStore } from "../src/stores/globeStore";
import { useTimelineStore } from "../src/stores/timelineStore";
import { useComparatorStore } from "../src/stores/comparatorStore";
import { useStudyStore } from "../src/stores/studyStore";

const root = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf-8");

function resetStores() {
  useGlobeStore.getState().resetView();
  useTimelineStore.setState({
    startYear: 1974,
    endYear: 2024,
    selectedYear: null,
    selectedMilestoneId: null,
    geologicalMa: null,
  });
  useComparatorStore.getState().closeComparator();
  useComparatorStore.getState().setSelectedIsos([]);
  useStudyStore.setState({ currentStudyId: null, parentId: null, title: "", description: "", notes: "" });
}

describe("T17 · Páginas com SSR, metadata Open Graph, notFound() e hidratação sem flash", () => {
  test("1. Metadata de /study/[slug] expõe título, descrição, og:title e twitter card", async () => {
    const study = await loadStudyBySlug("guerra-fria-br-de-k9x2");
    assert.ok(study, "Estudo semente guerra-fria-br-de-k9x2 deve carregar no servidor");

    const meta = buildStudyMetadata(study, study.id);
    assert.equal(meta.title, `${study.title} — TellusPedia`);
    assert.equal(meta.openGraph?.title, study.title);
    assert.ok(typeof meta.description === "string" && meta.description.length > 20);
    assert.equal(meta.twitter?.title, study.title);
    assert.equal(formatStudyPeriod(study), "1947–1991");

    // Slug inexistente retorna null e metadata noindex
    const missing = await loadStudyBySlug("slug-inexistente-404-xyz");
    assert.equal(missing, null);
    const missingMeta = buildStudyMetadata(null, "slug-inexistente-404-xyz");
    assert.match(String(missingMeta.title), /não encontrado/i);
  });

  test("2. Loader e metadata de /pais/[iso] validam ISO, rejeitam inexistentes e montam OG", () => {
    const bra = loadCountryByIso("bra");
    assert.ok(bra, "BRA deve existir no catálogo");
    assert.equal(bra.isoCode, "BRA");

    const meta = buildCountryMetadata(bra, "bra");
    assert.match(String(meta.title), /Brasil.*BRA/);
    assert.match(String(meta.openGraph?.title), /Brasil.*BRA/);
    assert.ok(typeof meta.description === "string" && meta.description.length > 15);
    assert.ok(meta.twitter?.title);

    assert.equal(loadCountryByIso("ZZZ"), null, "ISO inexistente deve retornar null para notFound()");
    assert.equal(loadCountryByIso("../etc/passwd"), null, "Entrada malformada deve ser rejeitada");
  });

  test("3. parseCompareIsos e buildCompareMetadata deduplicam, validam e limitam a 4 países", () => {
    const isos = parseCompareIsos("bra, deu, INVALID, BRA, usa, jpn, fra");
    assert.deepEqual(isos, ["BRA", "DEU", "USA", "JPN"]);

    const withCountries = buildCompareMetadata(["BRA", "DEU"]);
    assert.match(String(withCountries.title), /Brasil.*Alemanha/);
    assert.match(String(withCountries.openGraph?.title), /Brasil.*Alemanha/);

    const empty = buildCompareMetadata([]);
    assert.match(String(empty.title), /Comparador/);
  });

  test("4. readFlagDataUri carrega bandeira SVG local e bloqueia path traversal", () => {
    const sunFlag = readFlagDataUri("/flags/sun.svg");
    assert.ok(sunFlag && sunFlag.startsWith("data:image/svg+xml;base64,"));
    assert.equal(readFlagDataUri("/flags/../../package.json"), null);
    assert.equal(readFlagDataUri("https://evil.example/flag.svg"), null);
  });

  test("5. Hidratação síncrona única (applyInitialGlobeState) popula stores sem flash do estado padrão", () => {
    try {
      // Estudo compartilhado
      resetStores();
      const seedStudy = getMemoryStudy("guerra-fria-br-de-k9x2");
      assert.ok(seedStudy);
      applyInitialGlobeState({ kind: "study", study: seedStudy });
      assert.equal(useTimelineStore.getState().startYear, 1947);
      assert.equal(useTimelineStore.getState().endYear, 1991);
      assert.equal(useGlobeStore.getState().selectedIso, "BRA");
      assert.deepEqual(useComparatorStore.getState().selectedIsos, ["BRA", "DEU", "USA"]);

      // País direto (/pais/BRA)
      resetStores();
      applyInitialGlobeState({ kind: "country", iso: "BRA", latitude: -15.79, longitude: -47.88 });
      assert.equal(useGlobeStore.getState().selectedIso, "BRA");

      // Comparador (/compare?c=BRA,DEU)
      resetStores();
      applyInitialGlobeState({ kind: "compare", isos: ["BRA", "DEU"] });
      assert.equal(useComparatorStore.getState().isOpen, true);
      assert.deepEqual(useComparatorStore.getState().selectedIsos, ["BRA", "DEU"]);
    } finally {
      resetStores();
    }
  });

  test("6. Guardrails SSR: Server Components, generateMetadata, notFound(), opengraph-image e layout sem overflow-hidden global", () => {
    for (const rel of [
      "src/app/page.tsx",
      "src/app/study/[slug]/page.tsx",
      "src/app/pais/[iso]/page.tsx",
      "src/app/compare/page.tsx",
    ]) {
      const src = read(rel);
      assert.doesNotMatch(src, /^["']use client["']/m, `${rel} deve ser Server Component`);
    }

    const studyPage = read("src/app/study/[slug]/page.tsx");
    const countryPage = read("src/app/pais/[iso]/page.tsx");
    const comparePage = read("src/app/compare/page.tsx");

    assert.match(studyPage, /export async function generateMetadata/);
    assert.match(studyPage, /notFound\(\)/);
    assert.match(countryPage, /export async function generateMetadata/);
    assert.match(countryPage, /notFound\(\)/);
    assert.match(comparePage, /export async function generateMetadata/);

    // Imagens OG dinâmicas
    const studyOg = read("src/app/study/[slug]/opengraph-image.tsx");
    const countryOg = read("src/app/pais/[iso]/opengraph-image.tsx");
    assert.match(studyOg, /new ImageResponse/);
    assert.match(countryOg, /new ImageResponse/);

    // overflow-hidden removido do <body> global e isolado no GlobeExperienceShell
    const layout = read("src/app/layout.tsx");
    assert.doesNotMatch(layout, /overflow-hidden/, "body em layout.tsx não deve aplicar overflow-hidden global");
    const shell = read("src/components/shell/GlobeExperienceShell.tsx");
    assert.match(shell, /overflow-hidden/, "GlobeExperienceShell deve conter overflow-hidden para a cena 3D");
    const dossier = read("src/app/dossies/[slug]/page.tsx");
    assert.doesNotMatch(dossier, /h-dvh overflow-y-auto/, "dossies/[slug] não precisa mais de workaround de scroll");
  });
});
