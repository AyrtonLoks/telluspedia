import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import {
  azimuthToCardinal,
  computeGeodesicRulerSummary,
  EARTH_MEAN_RADIUS_KM,
  finalAzimuthDeg,
  haversineDistanceKm,
  initialAzimuthDeg,
  kmToNauticalMiles,
  sphericalMidpoint,
} from "../src/lib/geodesic-ruler";
import {
  computeSampledArcLengthKm,
  sampleOrthodromicArcVectors,
} from "../src/components/globe/GeodesicRulerLayer";
import {
  buildComparisonChartCsv,
  buildComparisonGridCsv,
  buildStandaloneChartSvg,
  escapeCsvCell,
} from "../src/lib/comparator-export";
import {
  buildComparisonDataset,
  COMPARISON_METRICS,
} from "../src/lib/comparator-data";
import { getCountryData } from "../src/lib/country-data";
import {
  buildHistoricalSeriesDataset,
  type WorldBankTimeseriesDataset,
} from "../src/lib/worldbank-timeseries";
import {
  MAX_ANNOTATION_NOTE_LENGTH,
  MAX_ANNOTATION_TITLE_LENGTH,
  MAX_STUDY_ANNOTATIONS,
  sanitizeStudyAnnotations,
} from "../src/lib/study-annotations";
import { sanitizeStudy, studyInput } from "../src/lib/study-schema";
import { forkStudyRecord } from "../src/lib/studies-store";
import { buildStudyAcademicMarkdown, buildStudyPortableJson } from "../src/lib/study-export";
import { POST as createStudyPost } from "../src/app/api/studies/route";
import { GET as getStudyBySlug } from "../src/app/api/studies/[slug]/route";
import { POST as forkStudyPost } from "../src/app/api/studies/[slug]/fork/route";
import { applyInitialGlobeState } from "../src/components/shell/GlobeExperienceShell";
import { GeodesicRulerPanel } from "../src/components/studio/GeodesicRulerPanel";
import { StudyPinsPanel } from "../src/components/studio/StudyPinsPanel";
import { StudyShareModal } from "../src/components/study/StudyShareModal";
import { ForkStudyBannerView } from "../src/components/study/ForkStudyBanner";
import { useStudioToolsStore } from "../src/stores/studioToolsStore";
import { useStudyStore } from "../src/stores/studyStore";
import { useLocaleStore } from "../src/stores/localeStore";
import { EN_MESSAGES } from "../src/lib/i18n/en";

function assertNoDivInsideParagraph(html: string, context: string) {
  const paragraphs = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? [];
  for (const p of paragraphs) {
    const inner = p.replace(/^<p\b[^>]*>/i, "").replace(/<\/p>$/i, "");
    assert.equal(/<div\b/i.test(inner), false, `${context}: proibido <div> dentro de <p>`);
  }
}

describe("D37 · Parte 1: Régua Geodésica 3D (precisão ortodrômica < 0,5% vs Haversine)", () => {
  beforeEach(() => {
    useStudioToolsStore.getState().resetStudioTools();
    useLocaleStore.setState({ locale: "pt-BR", enMessages: EN_MESSAGES });
  });

  test("1. Pares de capitais: arco 3D (slerpVectors em raio 1.004) tem erro < 0,5% vs Haversine analítico", () => {
    const capitals = [
      {
        name: "Brasília ↔ Lisboa",
        from: { lat: -15.7939, lng: -47.8828 },
        to: { lat: 38.7223, lng: -9.1393 },
        approxKmRange: [7240, 7340] as const,
      },
      {
        name: "Tóquio ↔ São Paulo",
        from: { lat: 35.6762, lng: 139.6503 },
        to: { lat: -23.5505, lng: -46.6333 },
        approxKmRange: [18450, 18620] as const,
      },
      {
        name: "Londres ↔ Nova Iorque",
        from: { lat: 51.5072, lng: -0.1276 },
        to: { lat: 40.7128, lng: -74.006 },
        approxKmRange: [5540, 5600] as const,
      },
      {
        name: "Sydney ↔ Cidade do Cabo",
        from: { lat: -33.8688, lng: 151.2093 },
        to: { lat: -33.9249, lng: 18.4241 },
        approxKmRange: [10960, 11060] as const,
      },
    ];

    for (const pair of capitals) {
      const haversineKm = haversineDistanceKm(pair.from, pair.to);
      assert.ok(
        haversineKm >= pair.approxKmRange[0] && haversineKm <= pair.approxKmRange[1],
        `${pair.name}: Haversine (${haversineKm.toFixed(1)} km) fora da faixa esperada`
      );

      const arcVectors = sampleOrthodromicArcVectors(pair.from, pair.to);
      for (const v of arcVectors) {
        assert.ok(Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z));
        assert.ok(
          Math.abs(v.length() - 1.004) < 1e-4,
          `${pair.name}: todo vértice da régua deve preservar raio esférico 1.004`
        );
      }

      const sampled3dKm = computeSampledArcLengthKm(pair.from, pair.to);
      const relativeErrorPct = (Math.abs(sampled3dKm - haversineKm) / haversineKm) * 100;
      assert.ok(
        relativeErrorPct < 0.5,
        `${pair.name}: erro relativo ${relativeErrorPct.toFixed(4)}% excedeu 0,5%`
      );
    }
  });

  test("2. Milhas náuticas, azimutes inicial/final e estabilidade antipodal sem NaN", () => {
    assert.ok(Math.abs(kmToNauticalMiles(1852) - 1000) < 1e-9);

    // Londres -> Nova Iorque parte a ~288,4° (octante Oeste: 247,5°–292,5°) e chega a ~231,2° (SO: 202,5°–247,5°)
    const azInit = initialAzimuthDeg({ lat: 51.5072, lng: -0.1276 }, { lat: 40.7128, lng: -74.006 });
    const azFinal = finalAzimuthDeg({ lat: 51.5072, lng: -0.1276 }, { lat: 40.7128, lng: -74.006 });
    assert.ok(azInit > 280 && azInit < 295, `Azimute inicial inesperado: ${azInit}`);
    assert.ok(azFinal > 228 && azFinal < 236, `Azimute final inesperado: ${azFinal}`);
    assert.equal(azimuthToCardinal(azInit, "pt-BR"), "O");
    assert.equal(azimuthToCardinal(azInit, "en"), "W");
    assert.equal(azimuthToCardinal(azFinal, "pt-BR"), "SO");
    assert.equal(azimuthToCardinal(azFinal, "en"), "SW");

    // Par antipodal exato (0, 0) <-> (0, 180): semicírculo π * R sem NaN
    const antipodalKm = haversineDistanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    assert.ok(Math.abs(antipodalKm - Math.PI * EARTH_MEAN_RADIUS_KM) < 0.01);
    const antipodal3dKm = computeSampledArcLengthKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    assert.ok(Number.isFinite(antipodal3dKm));
    assert.ok(Math.abs(antipodal3dKm - antipodalKm) / antipodalKm < 0.5);
    const mid = sphericalMidpoint({ lat: 0, lng: 0 }, { lat: 0, lng: 180 });
    assert.ok(Number.isFinite(mid.lat) && Number.isFinite(mid.lng));
  });

  test("3. Store e GeodesicRulerPanel: múltiplos trechos, desfazer/limpar, exclusão mútua e SSR pt-BR/en", () => {
    const store = useStudioToolsStore.getState();
    assert.equal(store.isRulerActive, false, "Desligada por padrão (não conflita com seleção de países)");

    store.setPinPlacementActive(true);
    assert.equal(useStudioToolsStore.getState().isPinPlacementActive, true);
    store.toggleRuler();
    assert.equal(useStudioToolsStore.getState().isRulerActive, true);
    assert.equal(
      useStudioToolsStore.getState().isPinPlacementActive,
      false,
      "Ativar a régua desativa marcação de pino"
    );

    store.addRulerPoint(-15.7939, -47.8828); // Brasília
    store.addRulerPoint(14.7167, -17.4677); // Dacar
    store.addRulerPoint(38.7223, -9.1393); // Lisboa

    const summary = computeGeodesicRulerSummary(useStudioToolsStore.getState().rulerPoints);
    assert.equal(summary.segments.length, 2);
    assert.ok(summary.totalDistanceKm > summary.directDistanceKm);

    const htmlPt = renderToStaticMarkup(React.createElement(GeodesicRulerPanel));
    assert.match(htmlPt, /data-testid="geodesic-ruler-panel"/);
    assert.match(htmlPt, /data-testid="ruler-total-km"/);
    assert.match(htmlPt, /data-testid="ruler-total-nm"/);
    assert.match(htmlPt, /Azimute inicial/);
    assertNoDivInsideParagraph(htmlPt, "GeodesicRulerPanel PT");

    useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
    const htmlEn = renderToStaticMarkup(React.createElement(GeodesicRulerPanel));
    assert.match(htmlEn, /Geodesic ruler/);
    assert.match(htmlEn, /Nautical miles \(nm\)/);
    assert.match(htmlEn, /Initial azimuth/);

    store.removeLastRulerPoint();
    assert.equal(useStudioToolsStore.getState().rulerPoints.length, 2);
    store.clearRulerPoints();
    assert.equal(useStudioToolsStore.getState().rulerPoints.length, 0);
  });
});

describe("D37 · Parte 2: Exportação CSV RFC 4180 e SVG/PNG com atribuição RN02 no Comparador", () => {
  test("4. CSV RFC 4180 da grade e do gráfico (pt-BR e en): valores brutos, CRLF, escape e anti-formula-injection", () => {
    // Segurança: células com gatilho de fórmula são neutralizadas, mas números negativos permanecem puros
    assert.equal(escapeCsvCell("=CMD|' /C calc'!A0"), "'=CMD|' /C calc'!A0");
    assert.equal(escapeCsvCell("+SUM(A1:A2)"), "'+SUM(A1:A2)");
    assert.equal(escapeCsvCell("@IMPORTXML()"), "'@IMPORTXML()");
    assert.equal(escapeCsvCell(-15.7939), "-15.7939");
    assert.equal(escapeCsvCell('País "A", Sul\nNota'), '"País ""A"", Sul\nNota"');

    const bra = getCountryData("BRA")!;
    const deu = getCountryData("DEU")!;
    const csvPt = buildComparisonGridCsv([bra, deu], "pt-BR");
    assert.ok(csvPt.includes("\r\n"), "CSV deve usar terminador CRLF segundo RFC 4180");
    assert.ok(csvPt.startsWith("iso_pais,pais,codigo_indicador,indicador,valor_bruto,unidade,ano_referencia,fonte_primaria,url_fonte\r\n"));
    assert.match(csvPt, /BRA,Brasil,NY\.GDP\.MKTP\.CD/);
    assert.match(csvPt, /Banco Mundial,https:\/\/data\.worldbank\.org/);

    const csvEn = buildComparisonGridCsv([bra, deu], "en");
    assert.ok(csvEn.startsWith("country_iso,country_name,indicator_code,indicator_name,raw_value,unit,reference_year,primary_source,source_url\r\n"));
    assert.match(csvEn, /BRA,Brazil,NY\.GDP\.MKTP\.CD/);
    assert.match(csvEn, /World Bank \(WDI\)/);

    // Série histórica 1990–2024: lacunas reais exportadas vazias (nunca interpoladas nem zeradas)
    const mockTs: WorldBankTimeseriesDataset = {
      metadata: {
        schemaVersion: 1,
        generatedAt: "2026-11-25T00:00:00Z",
        worldBankLastUpdated: "2026-01-01",
        range: [2020, 2022],
        source: {
          id: "WDI",
          name: "World Bank",
          url: "https://data.worldbank.org",
          license: "CC BY 4.0",
        },
        indicators: {},
        coverage: {},
      },
      years: [2020, 2021, 2022],
      series: {
        "NY.GDP.PCAP.CD": {
          BRA: [6800, null, 8900],
          DEU: [46000, 51000, 48500],
        },
      },
    };
    const latestDs = buildComparisonDataset(["BRA", "DEU"], "GDP_PER_CAPITA");
    const histDs = buildHistoricalSeriesDataset(mockTs, ["BRA", "DEU"], "GDP_PER_CAPITA");
    const histCsv = buildComparisonChartCsv({
      viewMode: "historical",
      metric: COMPARISON_METRICS.GDP_PER_CAPITA,
      metricTitle: "GDP per capita",
      metricUnit: "USD",
      latestDataset: latestDs,
      historicalDataset: histDs,
      locale: "en",
    });
    assert.match(histCsv, /2021,NY\.GDP\.PCAP\.CD,GDP per capita,USD,"World Bank \(WDI, CC BY 4\.0\)",https:\/\/[^,]+,,51000\r\n/);
  });

  test("5. SVG autônomo do gráfico: legenda, atribuição de fonte primária (pt-BR/en) e sanitização XSS", () => {
    const svgPt = buildStandaloneChartSvg({
      title: "PIB Nominal (leitura mais recente)",
      indicatorCode: "NY.GDP.MKTP.CD",
      unit: "Bilhões USD",
      viewMode: "latest",
      legend: [
        { isoCode: "BRA", label: "Brasil", colorHex: "#38bdd4", valueLabel: "$ 2,17 tri" },
        { isoCode: "DEU", label: "Alemanha", colorHex: "#f59e0b", valueLabel: "$ 4,46 tri" },
      ],
      sources: ["Banco Mundial"],
      locale: "pt-BR",
      innerSvgMarkup: `<svg width="600" height="240"><script>alert(1)</script><rect x="10" y="10" width="50" height="100" fill="rgb(var(--color-accent))" onload="evil()" /></svg>`,
      exportDateIso: "2026-11-25",
    });

    assert.match(svgPt, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(svgPt, /Fonte primária \(RN02\): Banco Mundial · Código oficial: NY\.GDP\.MKTP\.CD/);
    assert.match(svgPt, /Brasil: \$ 2,17 tri/);
    assert.doesNotMatch(svgPt, /<script/i, "Segurança: tags <script> devem ser removidas do SVG exportado");
    assert.doesNotMatch(svgPt, /onload=/i, "Segurança: handlers inline devem ser removidos do SVG exportado");
    assert.doesNotMatch(svgPt, /var\(--color-/, "Variáveis CSS devem ser resolvidas para cores sólidas");

    const svgEn = buildStandaloneChartSvg({
      title: "Nominal GDP <script>",
      indicatorCode: "NY.GDP.MKTP.CD",
      unit: "US$ billions",
      viewMode: "latest",
      legend: [{ isoCode: "BRA", label: "Brazil", colorHex: "#38bdd4", valueLabel: "$2.17T" }],
      sources: ["Banco Mundial"],
      locale: "en",
      exportDateIso: "2026-11-25",
    });
    assert.match(svgEn, /Primary source \(RN02\): World Bank \(WDI\) · Official code: NY\.GDP\.MKTP\.CD/);
    assert.match(svgEn, /Nominal GDP &lt;script&gt;/);
  });
});

describe("D37 · Parte 3: Pinos Anotados em Estudos (Zod, API /api/studies, Fork e Imutabilidade RN16)", () => {
  beforeEach(() => {
    useStudyStore.getState().resetStudy();
    useStudioToolsStore.getState().resetStudioTools();
    useLocaleStore.setState({ locale: "pt-BR", enMessages: EN_MESSAGES });
  });

  test("6. Validação estrita no Zod: limites rígidos de quantidade, coordenadas, tamanho e IDs seguros", () => {
    const validPayload = studyInput.safeParse({
      title: "Corredores Atlânticos",
      annotations: [
        {
          id: "pin-santos-01",
          lat: -23.9608,
          lng: -46.3336,
          title: "Porto de Santos",
          note: "Principal complexo portuário do Atlântico Sul.",
          tone: "accent",
        },
      ],
    });
    assert.equal(validPayload.success, true);

    // Mais de MAX_STUDY_ANNOTATIONS (20) deve falhar com HTTP 400
    const tooMany = Array.from({ length: MAX_STUDY_ANNOTATIONS + 1 }, (_, i) => ({
      id: `pin-${i}`,
      lat: 0,
      lng: 0,
      title: `Pino ${i}`,
    }));
    assert.equal(studyInput.safeParse({ title: "Excesso", annotations: tooMany }).success, false);

    // Coordenadas inválidas
    assert.equal(
      studyInput.safeParse({
        annotations: [{ id: "pin-1", lat: 95, lng: 0, title: "Lat inválida" }],
      }).success,
      false
    );
    assert.equal(
      studyInput.safeParse({
        annotations: [{ id: "pin-1", lat: 0, lng: -181, title: "Lng inválida" }],
      }).success,
      false
    );

    // Título vazio ou acima de 80 caracteres; nota acima de 280; ID com caracteres inseguros
    assert.equal(
      studyInput.safeParse({
        annotations: [{ id: "pin-1", lat: 0, lng: 0, title: "   " }],
      }).success,
      false
    );
    assert.equal(
      studyInput.safeParse({
        annotations: [{ id: "pin-1", lat: 0, lng: 0, title: "A".repeat(MAX_ANNOTATION_TITLE_LENGTH + 1) }],
      }).success,
      false
    );
    assert.equal(
      studyInput.safeParse({
        annotations: [
          { id: "pin-1", lat: 0, lng: 0, title: "Ok", note: "N".repeat(MAX_ANNOTATION_NOTE_LENGTH + 1) },
        ],
      }).success,
      false
    );
    assert.equal(
      studyInput.safeParse({
        annotations: [{ id: "../evil<script>", lat: 0, lng: 0, title: "Ok" }],
      }).success,
      false
    );

    // Sanitização remove caracteres de controle e deduplica IDs
    const cleaned = sanitizeStudyAnnotations([
      { id: "pin-dup", lat: -15.793889, lng: -47.882778, title: "Brasília\u0000\u0007", note: "Capital\u001F" },
      { id: "pin-dup", lat: 0, lng: 0, title: "Duplicado ignorado" },
    ]);
    assert.equal(cleaned.length, 1);
    assert.equal(cleaned[0]!.title, "Brasília");
    assert.equal(cleaned[0]!.note, "Capital");
    assert.equal(cleaned[0]!.lat, -15.7939);
  });

  test("7. Persistência ponta a ponta em POST /api/studies, GET /api/studies/[slug] e herança em POST /api/studies/[slug]/fork", async () => {
    const createReq = new NextRequest("http://127.0.0.1:3000/api/studies", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.77",
      },
      body: JSON.stringify({
        title: "Estudo Geodésico Atlântico Sul",
        selectedCountryIsos: ["BRA", "PRT"],
        annotations: [
          {
            id: "pin-bsb",
            lat: -15.7939,
            lng: -47.8828,
            title: "Brasília — Eixo Monumental",
            note: "Capital federal planejada (1960).",
            tone: "accent",
          },
          {
            id: "pin-lis",
            lat: 38.7223,
            lng: -9.1393,
            title: "Lisboa — Estuário do Tejo",
            note: "Nó histórico lusófono no Atlântico Norte.",
            tone: "warning",
          },
        ],
      }),
    });

    const createRes = await createStudyPost(createReq);
    assert.equal(createRes.status, 200);
    const created = await createRes.json();
    assert.ok(created.id.startsWith("estudo-"));
    assert.equal(created.annotations.length, 2);
    assert.equal(created.annotations[0].title, "Brasília — Eixo Monumental");

    // Leitura do snapshot imutável
    const getRes = await getStudyBySlug(
      new NextRequest(`http://127.0.0.1:3000/api/studies/${created.id}`),
      { params: Promise.resolve({ slug: created.id }) }
    );
    assert.equal(getRes.status, 200);
    const loaded = await getRes.json();
    assert.equal(loaded.annotations.length, 2);
    assert.equal(loaded.annotations[1].id, "pin-lis");

    // Hidratação no GlobeExperienceShell restaura os pinos no useStudyStore
    applyInitialGlobeState({ kind: "study", study: loaded });
    assert.equal(useStudyStore.getState().annotations.length, 2);

    // Fork imutável herda todos os pinos e registra parentId
    const forkRes = await forkStudyPost(
      new NextRequest(`http://127.0.0.1:3000/api/studies/${created.id}/fork`, {
        method: "POST",
        headers: { "x-forwarded-for": "127.0.0.78" },
      }),
      { params: Promise.resolve({ slug: created.id }) }
    );
    assert.equal(forkRes.status, 200);
    const forked = await forkRes.json();
    assert.equal(forked.parentId, created.id);
    assert.equal(forked.annotations.length, 2);
    assert.deepEqual(forked.annotations, loaded.annotations);

    // Exportação Markdown e JSON portátil incluem os pinos
    const md = buildStudyAcademicMarkdown(loaded);
    assert.match(md, /## Pinos Georreferenciados \(D37\)/);
    assert.match(md, /Brasília — Eixo Monumental/);
    const json = JSON.parse(buildStudyPortableJson(loaded));
    assert.equal(json.study.annotations.length, 2);
  });

  test("8. UI RN16: StudyPinsPanel bloqueia edição em estudo imutável, ForkStudyBanner e StudyShareModal exibem contagem", () => {
    const sanitized = sanitizeStudy({
      title: "Estudo com Pinos",
      annotations: [
        { id: "pin-1", lat: -22.9068, lng: -43.1729, title: "Baía de Guanabara", note: "Porto histórico" },
      ],
    });
    const record = forkStudyRecord({ ...sanitized, id: "orig-study-1" }, "fork-study-1");

    useStudyStore.getState().restoreStudy({ ...record, notes: record.markdownNotes });
    useStudioToolsStore.getState().setPinsPanelOpen(true);

    // Modo imutável (visualizando /study/[slug]): sem formulário nem botão de exclusão
    const immutableHtml = renderToStaticMarkup(
      React.createElement(StudyPinsPanel, { immutable: true, onUnlockDraftFork: () => {} })
    );
    assert.match(immutableHtml, /data-testid="pins-immutable-notice"/);
    assert.match(immutableHtml, /data-testid="pins-unlock-fork-btn"/);
    assert.doesNotMatch(immutableHtml, /data-testid="pin-remove-pin-1"/);
    assertNoDivInsideParagraph(immutableHtml, "StudyPinsPanel immutable");

    // Desbloqueio de cópia editável (fork em rascunho) preserva parentId e libera edição
    useStudyStore.getState().unlockDraftFork();
    assert.equal(useStudyStore.getState().currentStudyId, null);
    assert.equal(useStudyStore.getState().parentId, "fork-study-1");

    const editableHtml = renderToStaticMarkup(
      React.createElement(StudyPinsPanel, { immutable: false })
    );
    assert.match(editableHtml, /data-testid="pin-pick-globe-btn"/);
    assert.match(editableHtml, /data-testid="pin-remove-pin-1"/);
    assertNoDivInsideParagraph(editableHtml, "StudyPinsPanel editable");

    // StudyShareModal e ForkStudyBanner exibem selos dos pinos
    useStudyStore.getState().setShareModalOpen(true);
    const modalHtml = renderToStaticMarkup(React.createElement(StudyShareModal));
    assert.match(modalHtml, /data-testid="modal-annotations-badge"/);

    const bannerHtml = renderToStaticMarkup(
      React.createElement(ForkStudyBannerView, {
        studyId: record.id,
        parentId: record.parentId,
        title: record.title,
        study: record,
        onNavigate: () => {},
      })
    );
    assert.match(bannerHtml, /data-testid="study-annotations-count"/);
  });
});
