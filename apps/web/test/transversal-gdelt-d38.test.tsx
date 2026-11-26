import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";

import { WORLD_COUNTRIES_CATALOG } from "../src/lib/country-data";
import {
  buildFallbackCountryNewsPayload,
  buildGdeltCountryQuery,
  parseGdeltDocResponse,
  parseGdeltSeenDate,
  sanitizeExternalNewsUrl,
  sanitizeHeadlineText,
} from "../src/lib/gdelt-data";
import {
  createCountryNewsSource,
  GDELT_LIVE_TTL_MS,
  resetCountryNewsSources,
} from "../src/lib/gdelt-source";
import { GET as getCountryNewsRoute } from "../src/app/api/countries/[iso]/news/route";
import { resetRateLimitState, RATE_LIMIT_BUCKETS } from "../src/lib/rate-limit";
import {
  getTransversalEntitiesForCountry,
  TRANSVERSAL_ENTITIES_META,
} from "../src/lib/transversal-meta";
import { TRANSVERSAL_CATALOG } from "../src/lib/transversal-catalog";
import { findMilestoneById } from "../src/lib/milestones";
import { useTransversalStore } from "../src/stores/transversalStore";
import { useTimelineStore } from "../src/stores/timelineStore";
import { useGlobeStore } from "../src/stores/globeStore";
import { encodeView, restoreView } from "../src/lib/explore/view-url";
import { DEFAULT_CAMERA_OFFSET, type ViewCamera } from "../src/lib/explore/view-camera";
import { searchExplore } from "../src/lib/explore/search";

describe("D38 · Linha do Tempo Transversal (RN14/RN04) & Atualidades GDELT 2.0 (RN13.8/T05)", () => {
  beforeEach(() => {
    useTransversalStore.getState().resetTransversal();
    useGlobeStore.getState().resetView();
    resetCountryNewsSources();
    resetRateLimitState("country:news");
  });

  test("1. Catálogo transversal cobre 5 personalidades e 4 temas com ISOs reais, datas ordenadas e textos PT/EN", () => {
    assert.equal(TRANSVERSAL_CATALOG.length, 9);
    const personalities = TRANSVERSAL_CATALOG.filter((e) => e.kind === "personality");
    const themes = TRANSVERSAL_CATALOG.filter((e) => e.kind === "theme");
    assert.equal(personalities.length, 5);
    assert.equal(themes.length, 4);

    for (const entity of TRANSVERSAL_CATALOG) {
      assert.ok(entity.countryIsos.length >= 2, `${entity.id} deve destacar múltiplos países`);
      assert.ok(entity.summaryPt.length >= 30);
      assert.ok(entity.summaryEn.length >= 30);
      assert.ok(entity.milestones.length >= 4, `${entity.id} deve ter ao menos 4 marcos`);

      for (const iso of entity.countryIsos) {
        assert.ok(
          Object.hasOwn(WORLD_COUNTRIES_CATALOG, iso),
          `ISO ${iso} em ${entity.id} deve existir em WORLD_COUNTRIES_CATALOG`
        );
      }

      let prevYear = -Infinity;
      for (const m of entity.milestones) {
        assert.ok(m.year >= prevYear, `Marcos de ${entity.id} devem estar em ordem cronológica`);
        prevYear = m.year;
        assert.ok(m.title.length >= 8 && m.titleEn.length >= 8);
        assert.ok(m.summary.length >= 12 && m.summaryEn.length >= 12);
        assert.ok(m.sourcePrimary.length >= 3);
      }
    }

    const braEntities = getTransversalEntitiesForCountry("BRA").map((e) => e.id);
    assert.ok(braEntities.includes("milton-santos"));
    assert.ok(braEntities.includes("dom-pedro-ii"));
    assert.ok(braEntities.includes("albert-einstein"));
    assert.equal(TRANSVERSAL_ENTITIES_META.length, TRANSVERSAL_CATALOG.length);
  });

  test("2. useTransversalStore ativa visão transversal, filtra janela temporal, registra marcos e constrói trilha RN04", async () => {
    await useTransversalStore.getState().activateEntity("albert-einstein");

    const trv = useTransversalStore.getState();
    const timeline = useTimelineStore.getState();

    assert.equal(trv.activeEntityId, "albert-einstein");
    assert.ok(trv.activeEntity);
    assert.equal(timeline.startYear, 1879);
    assert.equal(timeline.endYear, 1955);
    assert.equal(timeline.selectedMilestoneId, "trv-einstein-1879");

    // findMilestoneById resolve marcos transversais para destaque em CountryBorders / TimelineAxis
    const sobral = findMilestoneById("trv-einstein-1919");
    assert.ok(sobral);
    assert.equal(sobral.countryIso, "BRA");
    assert.deepEqual(sobral.blocIsos, ["BRA", "GBR", "DEU"]);

    // Trilha RN04 registra navegação multipaís e deduplica passos repetidos
    trv.pushTrailStep({
      key: "country:BRA",
      kind: "country",
      id: "BRA",
      labelPt: "Brasil",
      labelEn: "Brazil",
      lat: -14.2,
      lng: -51.9,
    });
    trv.pushTrailStep({
      key: "milestone:trv-einstein-1919",
      kind: "milestone",
      id: "trv-einstein-1919",
      labelPt: sobral.title,
      labelEn: "Sobral Solar Eclipse",
      year: 1919,
    });
    trv.pushTrailStep({
      key: "country:BRA",
      kind: "country",
      id: "BRA",
      labelPt: "Brasil",
      labelEn: "Brazil",
    });

    const steps = useTransversalStore.getState().trail;
    assert.equal(steps.length, 3);
    assert.deepEqual(
      steps.map((s) => s.key),
      ["transversal:albert-einstein", "milestone:trv-einstein-1919", "country:BRA"]
    );
  });

  test("3. Sincronização de URL (?trilha=) e indexação na busca universal ⌘K", async () => {
    await useTransversalStore.getState().activateEntity("luis-de-camoes", { fly: false });
    const cam: ViewCamera = { offset: [...DEFAULT_CAMERA_OFFSET], restore: null, onChange: null };
    const encoded = encodeView(cam);
    assert.match(encoded, /trilha=luis-de-camoes/);

    useTransversalStore.getState().resetTransversal();
    assert.equal(useTransversalStore.getState().activeEntityId, null);

    const restored = restoreView(`?visao=1&${encoded}`, cam);
    assert.equal(restored, true);
    assert.equal(useTransversalStore.getState().activeEntityId, "luis-de-camoes");

    const hits = searchExplore("Albert Einstein");
    assert.ok(hits.some((h) => h.id === "transversal:albert-einstein"));
    const spaceHits = searchExplore("Corrida Espacial");
    assert.ok(spaceHits.some((h) => h.id === "transversal:space-race"));
  });

  test("4. Segurança GDELT: sanitização estrita de URLs externas (XSS/SSRF) e sintaxe de query sem aspas em palavra única", () => {
    // Rejeita vetores perigosos
    assert.equal(sanitizeExternalNewsUrl("javascript:alert(1)"), null);
    assert.equal(sanitizeExternalNewsUrl("data:text/html,<script>alert(1)</script>"), null);
    assert.equal(sanitizeExternalNewsUrl("http://reuters.com/world"), null);
    assert.equal(sanitizeExternalNewsUrl("https://user:secret@reuters.com/world"), null);
    assert.equal(sanitizeExternalNewsUrl("https://localhost:3000/api/health"), null);
    assert.equal(sanitizeExternalNewsUrl("https://127.0.0.1/admin"), null);
    assert.equal(sanitizeExternalNewsUrl("https://192.168.1.10/news"), null);
    assert.equal(sanitizeExternalNewsUrl("https://[::1]/news"), null);
    assert.equal(sanitizeExternalNewsUrl("https://intranet.local/news"), null);

    // Aceita HTTPS público válido e remove fragmentos
    assert.equal(
      sanitizeExternalNewsUrl("https://www.reuters.com/world/americas/brazil-economy-2026/#comments"),
      "https://www.reuters.com/world/americas/brazil-economy-2026/"
    );

    // Sanitiza HTML em manchetes
    assert.equal(
      sanitizeHeadlineText("<b>Brazil &amp; Germany</b> sign &quot;clean energy&quot; pact <script>x()</script>"),
      'Brazil & Germany sign "clean energy" pact x()'
    );

    // Query GDELT 2.0: palavras simples SEM aspas, frases multipalavra COM aspas
    const braQuery = buildGdeltCountryQuery("BRA", "Brasil", "BR", "Brazil");
    assert.doesNotMatch(braQuery, /"Brazil"/);
    assert.doesNotMatch(braQuery, /"Brasil"/);
    assert.match(braQuery, /\(Brazil OR Brasil\)/);

    const usaQuery = buildGdeltCountryQuery("USA", "Estados Unidos", "US", "United States of America");
    assert.match(usaQuery, /"United States"/);

    // Data compacta GDELT YYYYMMDDTHHMMSSZ
    assert.equal(parseGdeltSeenDate("20261125T184530Z"), "2026-11-25T18:45:30.000Z");
  });

  test("5. Contrato T05 (live -> cache -> stale -> fallback honesto sem notícias falsas) e Rate-Limit T43 na rota /api/countries/[iso]/news", async () => {
    assert.equal(GDELT_LIVE_TTL_MS, 30 * 60 * 1000);

    let shouldFail = false;
    const mockFetch: typeof fetch = async () => {
      if (shouldFail) {
        return new Response("Service Unavailable", { status: 503 });
      }
      return new Response(
        JSON.stringify({
          articles: [
            {
              url: "https://www.reuters.com/world/americas/brazil-climate-summit-2026/",
              title: "Brazil hosts multilateral climate governance summit",
              seendate: "20261125T143000Z",
              domain: "reuters.com",
              language: "English",
              sourcecountry: "United Kingdom",
            },
            {
              url: "javascript:alert(1)",
              title: "Malicious headline that must be dropped",
              seendate: "20261125T150000Z",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const src = createCountryNewsSource("BRA", mockFetch);
    const t0 = 1_700_000_000_000;

    // 1. Live
    const r1 = await src.get(t0);
    assert.equal(r1.cacheHit, false);
    assert.equal(r1.envelope.meta.source, "live");
    assert.equal(r1.envelope.meta.stale, false);
    assert.equal(r1.envelope.data.articles.length, 1);
    assert.equal(r1.envelope.data.articles[0]?.domain, "reuters.com");

    // 2. Cache dentro dos 30 min
    const r2 = await src.get(t0 + 10 * 60 * 1000);
    assert.equal(r2.cacheHit, true);
    assert.equal(r2.envelope.meta.source, "live");

    // 3. Stale quando falha após expirar o TTL
    shouldFail = true;
    const r3 = await src.get(t0 + 31 * 60 * 1000);
    assert.equal(r3.envelope.meta.source, "live");
    assert.equal(r3.envelope.meta.stale, true);
    assert.equal(r3.envelope.data.articles.length, 1);

    // 4. Fallback honesto (zero manchetes fabricadas — T03) quando nunca houve leitura live
    const offlineSrc = createCountryNewsSource("DEU", mockFetch);
    const r4 = await offlineSrc.get(t0);
    assert.equal(r4.envelope.meta.source, "fallback");
    assert.deepEqual(r4.envelope.data.articles, []);
    assert.deepEqual(buildFallbackCountryNewsPayload("DEU", "Alemanha", "Germany").articles, []);

    // 5. Validação 404 para ISO inexistente/histórico e 429 no rate-limit (T43)
    const notFoundRes = await getCountryNewsRoute(
      new NextRequest("http://localhost:3000/api/countries/PRU/news"),
      { params: Promise.resolve({ iso: "PRU" }) }
    );
    assert.equal(notFoundRes.status, 404);

    assert.equal(RATE_LIMIT_BUCKETS["country:news"].limit, 90);
    const parsed = parseGdeltDocResponse({ articles: [] }, "JPN", "Japão", "Japan");
    assert.equal(parsed.articles.length, 0);
  });
});
