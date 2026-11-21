/**
 * D23 — Galeria de Estudos Públicos (/studies + GET /api/studies),
 * árvore de forks (parentId) e exportação acadêmica (Markdown ABNT/APA + JSON portátil).
 */
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, test, type TestContext } from "node:test";
import { NextRequest } from "next/server";
import { GET as listStudiesGET } from "../src/app/api/studies/route";
import StudiesGalleryPage from "../src/app/studies/page";
import { TopNavBar } from "../src/components/nav/TopNavBar";
import { ForkStudyBannerView } from "../src/components/study/ForkStudyBanner";
import { searchExplore } from "../src/lib/explore/search";
import { CACHE_POLICY } from "../src/lib/http-cache";
import { prisma } from "../src/lib/prisma";
import { loadStudyBySlug, loadStudyWithLineage } from "../src/lib/server-loaders";
import { saveMemoryStudy, type StudyLineageInfo, type StudyRecord } from "../src/lib/studies-store";
import {
  buildSafeExportFilename,
  buildStudyAcademicMarkdown,
  buildStudyPortableJson,
} from "../src/lib/study-export";
import {
  buildStudiesGalleryHref,
  buildStudyWhereInput,
  parseStudyListQuery,
} from "../src/lib/study-gallery";

function setNodeEnv(t: TestContext, env: "production" | "development") {
  const previous = process.env.NODE_ENV;
  Reflect.set(process.env, "NODE_ENV", env);
  t.after(() => {
    if (previous === undefined) Reflect.deleteProperty(process.env, "NODE_ENV");
    else Reflect.set(process.env, "NODE_ENV", previous);
  });
}

function mockPrismaStudy<Args extends unknown[], Result>(
  t: TestContext,
  name: "count" | "findMany" | "findUnique",
  implementation: (...args: Args) => Result
) {
  const delegate = prisma.study;
  const previous = delegate[name];
  const mock = t.mock.fn(implementation);
  Reflect.set(delegate, name, mock);
  t.after(() => {
    Reflect.set(delegate, name, previous);
  });
  return mock;
}

const SAMPLE_ROOT_STUDY: StudyRecord = {
  id: "estudo-raiz-d23",
  parentId: null,
  title: "Transição Energética: Brasil e Alemanha",
  description: "Comparação de matriz renovável e emissões entre 1990 e 2024.",
  timelineStartYear: 1990,
  timelineEndYear: 2024,
  selectedCountryIsos: ["BRA", "DEU"],
  activeCategories: ["ECONOMY", "SCIENCE_CULTURE"],
  cameraLat: -14.2,
  cameraLng: -51.9,
  cameraAltitude: 2.3,
  markdownNotes: "Análise comparada com foco em fontes renováveis.",
  historicalEra: "CONTEMPORARY",
  isApollo11Active: false,
  geologicalMa: null,
  activeRouteId: null,
  activeObservatoryLayers: ["NASA_FIRMS"],
  isCosmicMode: false,
  focusedCelestialBody: null,
  activeCosmicLayers: [],
  createdAt: "2026-11-21T12:00:00.000Z",
};

const SAMPLE_FORK_STUDY: StudyRecord = {
  ...SAMPLE_ROOT_STUDY,
  id: "fork-cosmos-d23",
  parentId: SAMPLE_ROOT_STUDY.id,
  title: "[Fork] Sistema Solar e Clima Terrestre",
  description: "Extensão cósmica derivada do estudo energético.",
  isCosmicMode: true,
  focusedCelestialBody: "SATURN",
  activeCosmicLayers: ["ORBITS", "ASTEROID_BELT"],
  createdAt: "2026-11-21T13:00:00.000Z",
};

describe("D23 · Filtros, paginação e GET /api/studies", () => {
  test("parseStudyListQuery sanitiza parâmetros e buildStudyWhereInput gera consulta Prisma segura", () => {
    const query = parseStudyListQuery(
      new URLSearchParams("q=  Guerra Fria  &era=COLD_WAR_1969&country=bra&cosmic=false&page=2&pageSize=500")
    );
    assert.deepEqual(query, {
      q: "Guerra Fria",
      era: "COLD_WAR_1969",
      country: "BRA",
      cosmic: false,
      page: 2,
      pageSize: 24,
    });

    const invalid = parseStudyListQuery(
      new URLSearchParams("era=INVALID_ERA&country=ZZZ&cosmic=maybe&page=-3&pageSize=0")
    );
    assert.equal(invalid.era, null);
    assert.equal(invalid.country, null);
    assert.equal(invalid.cosmic, null);
    assert.equal(invalid.page, 1);
    assert.equal(invalid.pageSize, 12);

    const where = buildStudyWhereInput(query);
    assert.equal(where.historicalEra, "COLD_WAR_1969");
    assert.deepEqual(where.selectedCountryIsos, { has: "BRA" });
    assert.equal(where.isCosmicMode, false);
    assert.ok(Array.isArray(where.OR) && where.OR.length === 2);

    assert.equal(
      buildStudiesGalleryHref({ q: "Brasil", country: "BRA", cosmic: true, page: 3 }),
      "/studies?q=Brasil&country=BRA&cosmic=true&page=3"
    );
  });

  test("GET /api/studies pagina e filtra registros do Prisma com Cache-Control coerente", async (t) => {
    setNodeEnv(t, "production");
    const countMock = mockPrismaStudy(t, "count", async () => 2);
    const findManyMock = mockPrismaStudy(t, "findMany", async () => [
      {
        ...SAMPLE_FORK_STUDY,
        createdAt: new Date(SAMPLE_FORK_STUDY.createdAt),
        parent: { id: SAMPLE_ROOT_STUDY.id, title: SAMPLE_ROOT_STUDY.title },
        _count: { forks: 0 },
      },
      {
        ...SAMPLE_ROOT_STUDY,
        createdAt: new Date(SAMPLE_ROOT_STUDY.createdAt),
        parent: null,
        _count: { forks: 1 },
      },
    ]);

    const res = await listStudiesGET(
      new NextRequest("http://localhost/api/studies?country=BRA&page=1&pageSize=10")
    );
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("Cache-Control"), CACHE_POLICY.study);
    const payload = await res.json();
    assert.equal(payload.persistence, "database");
    assert.equal(payload.pagination.total, 2);
    assert.equal(payload.items.length, 2);
    assert.equal(payload.items[0].parentId, SAMPLE_ROOT_STUDY.id);
    assert.equal(payload.items[0].parentTitle, SAMPLE_ROOT_STUDY.title);
    assert.equal(payload.items[1].forkCount, 1);
    assert.equal(countMock.mock.callCount(), 1);
    assert.equal(findManyMock.mock.callCount(), 1);
  });

  test("GET /api/studies e loaders SSR usam console.warn (nunca console.error) no fallback em dev e 503 em produção", async (t) => {
    const log = t.mock.method(console, "error", () => undefined);
    const warn = t.mock.method(console, "warn", () => undefined);
    mockPrismaStudy(t, "count", async () => {
      throw new Error("DB offline");
    });
    mockPrismaStudy(t, "findUnique", async () => {
      throw new Error("DB offline");
    });

    setNodeEnv(t, "production");
    const prodRes = await listStudiesGET(new NextRequest("http://localhost/api/studies"));
    assert.equal(prodRes.status, 503);
    assert.equal(prodRes.headers.get("Cache-Control"), "no-store");
    assert.equal(log.mock.callCount(), 1, "produção deve registrar console.error");

    setNodeEnv(t, "development");
    saveMemoryStudy(SAMPLE_ROOT_STUDY);
    saveMemoryStudy(SAMPLE_FORK_STUDY);
    const errorCallsBeforeDev = log.mock.callCount();

    const devRes = await listStudiesGET(
      new NextRequest("http://localhost/api/studies?cosmic=true&q=Saturno")
    );
    assert.equal(devRes.status, 200);
    assert.equal(devRes.headers.get("Cache-Control"), "no-store");
    assert.equal(devRes.headers.get("X-Study-Persistence"), "memory");
    const cosmicRes = await listStudiesGET(
      new NextRequest("http://localhost/api/studies?cosmic=true")
    );
    const cosmicData = await cosmicRes.json();
    assert.ok(cosmicData.items.some((item: StudyRecord) => item.id === SAMPLE_FORK_STUDY.id));

    const devLoaded = await loadStudyBySlug(SAMPLE_ROOT_STUDY.id);
    assert.equal(devLoaded?.id, SAMPLE_ROOT_STUDY.id);
    const devLineage = await loadStudyWithLineage(SAMPLE_FORK_STUDY.id);
    assert.equal(devLineage?.lineage.parent?.id, SAMPLE_ROOT_STUDY.id);

    assert.equal(
      log.mock.callCount(),
      errorCallsBeforeDev,
      "fallback em desenvolvimento não pode disparar console.error (evita overlay Next.js 15)"
    );
    assert.ok(warn.mock.callCount() >= 4);
  });

  test("TopNavBar e Busca Universal expõem acesso direto à Galeria /studies sem digitar URL", () => {
    const navHtml = renderToStaticMarkup(<TopNavBar />);
    assert.match(navHtml, /data-testid="top-nav-studies-link"/);
    assert.match(navHtml, /href="\/studies"/);

    const hits = searchExplore("galeria estudos");
    assert.ok(
      hits.some((item) => item.id === "route:/studies"),
      "busca universal deve oferecer comando direto para /studies"
    );
  });
});

describe("D23 · Linhagem de forks e página SSR /studies", () => {
  test("loadStudyWithLineage resolve estudo pai e derivados; ForkStudyBanner renderiza links e exportação", async (t) => {
    setNodeEnv(t, "production");
    mockPrismaStudy(t, "findUnique", async () => ({
      ...SAMPLE_FORK_STUDY,
      createdAt: new Date(SAMPLE_FORK_STUDY.createdAt),
      parent: {
        id: SAMPLE_ROOT_STUDY.id,
        title: SAMPLE_ROOT_STUDY.title,
        createdAt: new Date(SAMPLE_ROOT_STUDY.createdAt),
      },
      forks: [
        {
          id: "fork-neto-d23",
          title: "[Fork] Terceira geração",
          createdAt: new Date("2026-11-21T14:00:00.000Z"),
        },
      ],
      _count: { forks: 1 },
    }));

    const loaded = await loadStudyWithLineage(SAMPLE_FORK_STUDY.id);
    assert.ok(loaded);
    assert.equal(loaded.lineage.parent?.id, SAMPLE_ROOT_STUDY.id);
    assert.equal(loaded.lineage.forkCount, 1);
    assert.equal(loaded.lineage.forks[0].id, "fork-neto-d23");

    const bannerHtml = renderToStaticMarkup(
      <ForkStudyBannerView
        studyId={loaded.study.id}
        parentId={loaded.study.parentId}
        title={loaded.study.title}
        study={loaded.study}
        lineage={loaded.lineage}
        onNavigate={() => {}}
      />
    );
    assert.match(bannerHtml, /data-testid="study-parent-link"/);
    assert.match(bannerHtml, new RegExp(`/study/${SAMPLE_ROOT_STUDY.id}`));
    assert.match(bannerHtml, /data-testid="study-forks-toggle"/);
    assert.match(bannerHtml, /1 fork derivado/);
    assert.match(bannerHtml, /data-testid="study-notes-toggle"/);
    assert.match(bannerHtml, /data-testid="study-open-comparator"/);
    assert.match(bannerHtml, /href="\/studies"/);
    assert.match(bannerHtml, /data-testid="study-export-actions"/);
  });

  test("página SSR /studies renderiza formulário de filtros e cartões D14 com linhagem e exportação", async (t) => {
    setNodeEnv(t, "production");
    mockPrismaStudy(t, "count", async () => 1);
    mockPrismaStudy(t, "findMany", async () => [
      {
        ...SAMPLE_FORK_STUDY,
        createdAt: new Date(SAMPLE_FORK_STUDY.createdAt),
        parent: { id: SAMPLE_ROOT_STUDY.id, title: SAMPLE_ROOT_STUDY.title },
        _count: { forks: 2 },
      },
    ]);

    const element = await StudiesGalleryPage({
      searchParams: Promise.resolve({ country: "BRA", cosmic: "true" }),
    });
    const html = renderToStaticMarkup(element);
    assert.match(html, /Galeria de Estudos Públicos/);
    assert.match(html, /data-testid="studies-filter-form"/);
    assert.match(html, /data-testid="study-gallery-card"/);
    assert.match(html, /Sistema Solar e Clima Terrestre/);
    assert.match(html, new RegExp(`/study/${SAMPLE_ROOT_STUDY.id}`));
    assert.match(html, /2 forks/);
    assert.match(html, /data-testid="study-export-actions"/);
  });
});

describe("D23 · Exportação em Markdown acadêmico (ABNT/APA) e JSON portátil", () => {
  test("gera Markdown com fontes primárias RN02, linhagem e citações ABNT/APA, e JSON portátil válido", () => {
    const lineage: StudyLineageInfo = {
      parent: {
        id: "estudo-ancestral",
        title: "Estudo Ancestral",
        createdAt: "2026-11-20T00:00:00.000Z",
      },
      forks: [
        {
          id: "fork-filho-1",
          title: "Fork Filho 1",
          createdAt: "2026-11-21T15:00:00.000Z",
        },
      ],
      forkCount: 1,
    };

    const md = buildStudyAcademicMarkdown(SAMPLE_ROOT_STUDY, {
      origin: "https://telluspedia.org",
      lineage,
      accessDate: new Date("2026-11-21T12:00:00.000Z"),
    });

    assert.match(md, /# Transição Energética: Brasil e Alemanha/);
    assert.match(md, /https:\/\/telluspedia\.org\/study\/estudo-raiz-d23/);
    assert.match(md, /## Linhagem de Forks/);
    assert.match(md, /Estudo Ancestral/);
    assert.match(md, /Fork Filho 1/);
    assert.match(md, /## Países e Indicadores Auditados/);
    assert.match(md, /Brasil \(BRA\)/);
    assert.match(md, /Alemanha \(DEU\)/);
    assert.match(md, /## Fontes Primárias \(RN02\)/);
    assert.match(md, /https:\/\/data\.worldbank\.org\//);
    assert.match(md, /### ABNT \(NBR 6023\)/);
    assert.match(md, /TELLUSPEDIA\./);
    assert.match(md, /### APA 7/);
    assert.match(md, /TellusPedia\. \(2026\)\./);

    const jsonText = buildStudyPortableJson(SAMPLE_ROOT_STUDY, {
      origin: "https://telluspedia.org",
      lineage,
      accessDate: new Date("2026-11-21T12:00:00.000Z"),
    });
    const parsed = JSON.parse(jsonText) as {
      schemaVersion: string;
      url: string;
      study: StudyRecord;
      lineage: StudyLineageInfo;
      primarySources: Array<{ source: string; url: string }>;
      citations: { abnt: string; apa: string };
    };
    assert.equal(parsed.schemaVersion, "telluspedia.study.v1");
    assert.equal(parsed.url, "https://telluspedia.org/study/estudo-raiz-d23");
    assert.equal(parsed.study.id, SAMPLE_ROOT_STUDY.id);
    assert.equal(parsed.lineage.forkCount, 1);
    assert.ok(parsed.primarySources.length >= 2);
    assert.match(parsed.citations.abnt, /TELLUSPEDIA\./);
    assert.match(parsed.citations.apa, /TellusPedia\./);

    assert.equal(
      buildSafeExportFilename("../../etc/passwd?foo=bar", "md"),
      "telluspedia-etc-passwd-foo-bar.md"
    );
  });
});
