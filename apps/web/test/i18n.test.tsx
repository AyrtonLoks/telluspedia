import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  formatCountryName,
  formatDate,
  formatNumber,
  normalizeLocale,
  readLocaleFromCookieString,
  readStoredLocale,
  writeStoredLocale,
} from "../src/lib/i18n/format";
import { LOCALE_COOKIE_NAME, LOCALE_STORAGE_KEY } from "../src/lib/i18n/types";
import { EN_MESSAGES } from "../src/lib/i18n/en";
import { loadEnMessages, useLocaleStore } from "../src/stores/localeStore";
import { WORLD_COUNTRIES_CATALOG, getCountryData } from "../src/lib/country-data";
import { TopNavBar } from "../src/components/nav/TopNavBar";
import { TimelineBar } from "../src/components/timeline/TimelineBar";
import { GraphicsQualityPanelView } from "../src/components/globe/GraphicsQualityPanel";
import { ChoroplethSelectorView, ChoroplethTooltipView } from "../src/components/choropleth/ChoroplethHud";
import { InspectorHUD } from "../src/components/hud/InspectorHUD";
import { ObservatoryPanel } from "../src/components/observatory/ObservatoryPanel";
import { CosmicInspectorHUD } from "../src/components/hud/CosmicInspectorHUD";
import { ComparisonGrid } from "../src/components/comparator/ComparisonGrid";
import { ComparisonCharts } from "../src/components/comparator/ComparisonCharts";
import { AnalyticalProfileView } from "../src/components/reader/AnalyticalProfileView";
import { ReaderTableOfContents } from "../src/components/reader/ReaderTableOfContents";
import { ForkStudyBannerView } from "../src/components/study/ForkStudyBanner";
import { StudyHub } from "../src/components/tellus-bridge/StudyHub";
import RouteError from "../src/app/error";
import { GlobalErrorView } from "../src/components/shell/GlobalErrorView";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { useCosmicStore } from "../src/stores/cosmicStore";
import { useComparatorStore } from "../src/stores/comparatorStore";
import {
  buildCompareMetadata,
  buildCountryMetadata,
  buildRootMetadata,
  buildStudiesMetadata,
  buildStudyMetadata,
} from "../src/lib/server-loaders";

describe("D28a · Fundação i18n (pt-BR / en), Intl e Shell Principal", () => {
  test("1. normalizeLocale, cookie e localStorage persistem e hidratam locale com segurança", () => {
    assert.equal(normalizeLocale("en"), "en");
    assert.equal(normalizeLocale("en-US"), "en");
    assert.equal(normalizeLocale("pt-BR"), "pt-BR");
    assert.equal(normalizeLocale("pt"), "pt-BR");
    assert.equal(normalizeLocale("fr-FR"), "pt-BR");
    assert.equal(normalizeLocale(null), "pt-BR");

    assert.equal(readLocaleFromCookieString(`foo=1; ${LOCALE_COOKIE_NAME}=en; bar=2`), "en");
    assert.equal(readLocaleFromCookieString(`${LOCALE_COOKIE_NAME}=pt-BR`), "pt-BR");
    assert.equal(readLocaleFromCookieString("other=en"), null);

    // Simula window/document mínimos para testar escrita e leitura de persistência
    const store = new Map<string, string>();
    const fakeDoc = { cookie: "", documentElement: { lang: "pt-BR" } };
    const fakeWin = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => { store.set(k, v); },
      },
    };
    const prevWin = (globalThis as { window?: unknown }).window;
    const prevDoc = (globalThis as { document?: unknown }).document;
    try {
      (globalThis as { window?: unknown }).window = fakeWin;
      (globalThis as { document?: unknown }).document = fakeDoc;

      writeStoredLocale("en");
      assert.equal(store.get(LOCALE_STORAGE_KEY), "en");
      assert.match(fakeDoc.cookie, new RegExp(`${LOCALE_COOKIE_NAME}=en`));
      assert.equal(fakeDoc.documentElement.lang, "en");
      assert.equal(readStoredLocale(), "en");

      // Fallback para cookie se localStorage estiver vazio
      store.clear();
      assert.equal(readStoredLocale(), "en");

      writeStoredLocale("pt-BR");
      assert.equal(readStoredLocale(), "pt-BR");
      assert.equal(fakeDoc.documentElement.lang, "pt-BR");
    } finally {
      if (prevWin === undefined) delete (globalThis as { window?: unknown }).window;
      else (globalThis as { window?: unknown }).window = prevWin;
      if (prevDoc === undefined) delete (globalThis as { document?: unknown }).document;
      else (globalThis as { document?: unknown }).document = prevDoc;
    }
  });

  test("2. Formatadores Intl (números, datas e Intl.DisplayNames nos 177 países)", () => {
    assert.equal(formatNumber(1234.56, "pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "1.234,56");
    assert.equal(formatNumber(1234.56, "en", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), "1,234.56");
    assert.equal(formatNumber(Number.NaN, "en"), "—");

    const sampleDate = "2026-11-23T12:00:00Z";
    assert.match(formatDate(sampleDate, "pt-BR", { timeZone: "UTC", year: "numeric" }), /2026/);
    assert.match(formatDate(sampleDate, "en", { timeZone: "UTC", month: "short", year: "numeric" }), /Nov 2026/);
    assert.equal(formatDate("invalid", "en"), "—");

    // Em pt-BR preserva o nome curado; em en usa Intl.DisplayNames
    assert.equal(formatCountryName("BR", "Brasil", "pt-BR"), "Brasil");
    assert.equal(formatCountryName("BR", "Brasil", "en"), "Brazil");
    assert.equal(formatCountryName("DE", "Alemanha", "en"), "Germany");
    assert.equal(formatCountryName("JP", "Japão", "en"), "Japan");
    assert.equal(formatCountryName("ZA", "África do Sul", "en"), "South Africa");
    assert.equal(formatCountryName("EG", "Egito", "en"), "Egypt");

    // Todos os 177 países do catálogo produzem nome não-vazio em ambos os idiomas
    const entries = Object.values(WORLD_COUNTRIES_CATALOG);
    assert.ok(entries.length >= 177);
    let resolvedEn = 0;
    for (const c of entries) {
      const enName = formatCountryName(c.iso2, c.nameCommon, "en");
      assert.ok(enName.length > 0, `nome vazio para ${c.isoCode}`);
      if (enName !== c.iso2) resolvedEn++;
    }
    assert.ok(resolvedEn >= 170, `esperava ≥170 nomes resolvidos via Intl.DisplayNames, obteve ${resolvedEn}`);
  });

  test("3. Dicionário EN é carregado sob demanda e não entra estaticamente na casca inicial", async () => {
    const loaded = await loadEnMessages();
    assert.equal(loaded["nav.observatory"], "Observatory");
    assert.ok(Object.keys(EN_MESSAGES).length >= 70);

    const shellSrc = fs.readFileSync(
      path.resolve(__dirname, "../src/components/shell/GlobeExperienceShell.tsx"),
      "utf-8"
    );
    const navSrc = fs.readFileSync(
      path.resolve(__dirname, "../src/components/nav/TopNavBar.tsx"),
      "utf-8"
    );
    assert.doesNotMatch(shellSrc, /from\s+["']@\/lib\/i18n\/en["']/, "dicionário EN não pode ser importado estaticamente no shell");
    assert.doesNotMatch(navSrc, /from\s+["']@\/lib\/i18n\/en["']/, "dicionário EN não pode ser importado estaticamente na navbar");
  });

  test("4. Shell principal (Navbar, Timeline, Qualidade Gráfica e Mapa Temático) alterna pt-BR ↔ en no SSR", () => {
    // Estado padrão pt-BR
    useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
    const navPt = renderToStaticMarkup(<TopNavBar />);
    const timelinePt = renderToStaticMarkup(<TimelineBar />);
    const qualityPt = renderToStaticMarkup(
      <GraphicsQualityPanelView
        preset="auto"
        effectiveDpr={1.5}
        currentFps={60}
        adaptiveDprScale={0.85}
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    assert.match(navPt, /Observatório/);
    assert.match(navPt, /Comparador/);
    assert.match(timelinePt, /Linha do Tempo/);
    assert.match(timelinePt, /Política/);
    assert.match(qualityPt, /Qualidade gráfica/);
    assert.match(qualityPt, /DPR adaptado/);

    // Alterna para inglês (en)
    useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
    const navEn = renderToStaticMarkup(<TopNavBar />);
    const timelineEn = renderToStaticMarkup(<TimelineBar />);
    const qualityEn = renderToStaticMarkup(
      <GraphicsQualityPanelView
        preset="auto"
        effectiveDpr={1.5}
        currentFps={60}
        adaptiveDprScale={0.85}
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    const choroSelectorEn = renderToStaticMarkup(
      <ChoroplethSelectorView
        activeIndicator="NY.GDP.PCAP.CD"
        opacity={0.85}
        isGlobeEligible
        onSelect={() => {}}
        onClear={() => {}}
        onOpacityChange={() => {}}
        onReturnToContemporaryEarth={() => {}}
        onClose={() => {}}
      />
    );
    const choroTooltipEn = renderToStaticMarkup(
      <ChoroplethTooltipView
        entry={{
          isoCode: "BRA",
          nameCommon: "Brasil",
          value: 10294,
          formattedValue: "US$ 10,3 mil",
          year: 2024,
          sourcePrimary: "World Bank",
          sourceUrl: "https://data.worldbank.org/indicator/NY.GDP.PCAP.CD",
          available: true,
          normalized: 0.5,
          color: "#38bdf8",
          rank: 78,
          rankTotal: 170,
        }}
        indicatorLabel="GDP/capita"
        isHovered
      />
    );

    assert.match(navEn, /Observatory/);
    assert.match(navEn, /Compare/);
    assert.match(navEn, /Gallery/);
    assert.match(timelineEn, /Timeline/);
    assert.match(timelineEn, /Politics/);
    assert.match(timelineEn, /Cold War/);
    assert.match(qualityEn, /Graphics quality/);
    assert.match(qualityEn, /Adapted DPR/);
    assert.match(choroSelectorEn, /Choropleth thematic map/);
    assert.match(choroSelectorEn, /GDP per capita/);
    assert.match(choroTooltipEn, /Brazil/);
    assert.match(choroTooltipEn, /Hovered/);
    assert.match(choroTooltipEn, /#78 of 170/);

    // Restaura pt-BR para não interferir em outros testes
    useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
  });

  test("5. D28b · Painéis analíticos (Inspector, Observatório, Cosmos, Comparador, Reader e Estudos) alternam pt-BR ↔ en", () => {
    const prevObs = useObservatoryStore.getState();
    const prevCosmic = useCosmicStore.getState();
    const prevComp = useComparatorStore.getState();

    try {
      useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
      useObservatoryStore.setState({ isPanelOpen: true, activeLayers: ["NASA_FIRMS", "GLOBAL_WINDS"] });
      useCosmicStore.setState({ isCosmicMode: true, focusedBodyId: "MARS", isInspectorOpen: true });
      useComparatorStore.setState({ selectedIsos: ["BRA", "DEU"], activeMetric: "GDP" });

      const bra = getCountryData("BRA")!;
      const inspectorHtml = renderToStaticMarkup(<InspectorHUD selectedIso="BRA" selectedYear={2026} />);
      const observatoryHtml = renderToStaticMarkup(<ObservatoryPanel initialExpanded={["NASA_FIRMS"]} />);
      const cosmicHtml = renderToStaticMarkup(<CosmicInspectorHUD placement="dock" />);
      const compGridHtml = renderToStaticMarkup(<ComparisonGrid />);
      const compChartsHtml = renderToStaticMarkup(<ComparisonCharts />);
      const analyticalHtml = renderToStaticMarkup(<AnalyticalProfileView country={bra} />);
      const tocHtml = renderToStaticMarkup(<ReaderTableOfContents />);
      const forkHtml = renderToStaticMarkup(
        <ForkStudyBannerView
          studyId="study-demo"
          title="Cold War Geopolitics"
          study={{
            id: "study-demo",
            parentId: null,
            title: "Cold War Geopolitics",
            description: "Sample study",
            timelineStartYear: 1947,
            timelineEndYear: 1991,
            selectedCountryIsos: ["BRA", "DEU"],
            activeCategories: [],
            cameraLat: 0,
            cameraLng: 0,
            cameraAltitude: 2.5,
            markdownNotes: "Notes",
            historicalEra: null,
            isApollo11Active: false,
            geologicalMa: null,
            activeRouteId: null,
            activeObservatoryLayers: [],
            isCosmicMode: false,
            focusedCelestialBody: null,
            activeCosmicLayers: [],
            choroplethIndicator: "NY.GDP.MKTP.CD",
            createdAt: "2026-11-23T00:00:00Z",
          }}
          onNavigate={() => {}}
        />
      );

      // InspectorHUD (incluindo ficha curada, região, regime, moeda, badges de fonte e marcos)
      assert.match(inspectorHtml, /Brazil/);
      assert.match(inspectorHtml, /Federative Republic of Brazil/);
      assert.match(inspectorHtml, /South America/);
      assert.match(inspectorHtml, /Largest country in South America/);
      assert.match(inspectorHtml, /IBGE \/ WB/);
      assert.match(inspectorHtml, /World Bank/);
      assert.match(inspectorHtml, /UNDP/);
      assert.match(inspectorHtml, /Federal Presidential Republic/);
      assert.match(inspectorHtml, /Brazilian Real/);
      assert.match(inspectorHtml, /Independence of Brazil/);
      assert.match(inspectorHtml, /Population/);
      assert.match(inspectorHtml, /Nominal GDP/);
      assert.match(inspectorHtml, /Deep Read/);
      assert.match(inspectorHtml, /Audited Primary Sources/);
      assert.match(inspectorHtml, /Deepen in TellusLab/);

      // ObservatoryPanel + 7 camadas
      assert.match(observatoryHtml, /Planetary Observatory/);
      assert.match(observatoryHtml, /Active Wildfires \(FIRMS\)/);
      assert.match(observatoryHtml, /Winds &amp; Ocean Currents/);
      assert.match(observatoryHtml, /Clear Layers/);

      // CosmicInspectorHUD
      assert.match(cosmicHtml, /Mars/);
      assert.match(cosmicHtml, /Distance to Sun/);
      assert.match(cosmicHtml, /Astrophysical Properties/);
      assert.match(cosmicHtml, /Equatorial radius/);

      // Comparator
      assert.match(compGridHtml, /Brazil/);
      assert.match(compGridHtml, /Germany/);
      assert.match(compGridHtml, /Cite comparison/);
      assert.match(compChartsHtml, /1990–2024 Series/);
      assert.match(compChartsHtml, /Nominal GDP \(current US\$ billions\)/);

      // Reader & Analytical Profile
      assert.match(analyticalHtml, /Brazil — Analytical Profile/);
      assert.match(analyticalHtml, /Global Position &amp; Regional Average/);
      assert.match(analyticalHtml, /Closest Countries by Indicators/);
      assert.match(tocHtml, /Multidisciplinary Index/);
      assert.match(tocHtml, /Geography &amp; Biomes/);

      // ForkStudyBanner
      assert.match(forkHtml, /Original shared study/);
      assert.match(forkHtml, /Fork study/);
      assert.match(forkHtml, /Map: GDP/);
    } finally {
      useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
      useObservatoryStore.setState({
        isPanelOpen: prevObs.isPanelOpen,
        activeLayers: prevObs.activeLayers,
      });
      useCosmicStore.setState({
        isCosmicMode: prevCosmic.isCosmicMode,
        focusedBodyId: prevCosmic.focusedBodyId,
        isInspectorOpen: prevCosmic.isInspectorOpen,
      });
      useComparatorStore.setState({
        selectedIsos: prevComp.selectedIsos,
        activeMetric: prevComp.activeMetric,
      });
    }
  });

  test("6. D28b · Metadados SSR (root, país, estudo, comparador e galeria) respeitam locale pt-BR e en", () => {
    const rootPt = buildRootMetadata("pt-BR");
    const rootEn = buildRootMetadata("en");
    assert.match(String(rootPt.title), /Enciclopédia Geopolítica/);
    assert.match(String(rootEn.title), /Geopolitical Encyclopedia/);
    assert.equal(rootEn.openGraph?.locale, "en_US");

    const bra = getCountryData("BRA");
    const braEn = buildCountryMetadata(bra, "BRA", "en");
    assert.match(String(braEn.title), /Brazil \(BRA\)/);
    assert.equal(braEn.openGraph?.locale, "en_US");

    const missingEn = buildCountryMetadata(null, "ZZZ", "en");
    assert.match(String(missingEn.title), /Country not found/);

    const cmpEn = buildCompareMetadata(["BRA", "DEU"], "en");
    assert.match(String(cmpEn.title), /Brazil vs Germany/);
    assert.equal(cmpEn.openGraph?.locale, "en_US");

    const galleryEn = buildStudiesMetadata("en");
    assert.match(String(galleryEn.title), /Public Studies Gallery/);
    assert.equal(galleryEn.openGraph?.locale, "en_US");

    const missingStudyEn = buildStudyMetadata(null, "nope", "en");
    assert.match(String(missingStudyEn.title), /Study not found/);
  });

  test("7. D28b · TellusLab Hub (/telluslab) e Error Boundaries traduzem integralmente para en", () => {
    try {
      useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });

      const hubHtml = renderToStaticMarkup(<StudyHub />);
      assert.match(hubHtml, /TellusPedia Globe/);
      assert.match(hubHtml, /8 domains · 197 works · 299 macro-topics/);
      assert.match(hubHtml, /Progress by complexity/);
      assert.match(hubHtml, /Import JSON snapshot/);
      assert.match(hubHtml, /Choose JSON file/);
      assert.match(hubHtml, /No file selected/);
      assert.match(hubHtml, /Mathematics/);
      assert.match(hubHtml, /Programming &amp; Computer Science/);
      assert.match(hubHtml, /Economics &amp; Finance/);
      assert.match(hubHtml, /Physics &amp; Optics/);
      assert.match(hubHtml, /Engineering/);
      assert.match(hubHtml, /Transversal Foundations/);
      assert.match(hubHtml, /Overdue reviews \(S6\)/);
      assert.match(hubHtml, /Dossiers &amp; historical figures/);
      assert.match(hubHtml, /Astronomy, optics &amp; telescopes/);

      const routeErrHtml = renderToStaticMarkup(
        <RouteError error={Object.assign(new Error("boom"), { digest: "D42" })} reset={() => {}} />
      );
      assert.match(routeErrHtml, /Runtime error/);
      assert.match(routeErrHtml, /Could not load this view/);
      assert.match(routeErrHtml, /Try again/);
      assert.match(routeErrHtml, /Back to globe/);
      assert.match(routeErrHtml, /Country comparator/);

      const globalErrHtml = renderToStaticMarkup(
        <GlobalErrorView error={Object.assign(new Error("fatal"), { digest: "G99" })} reset={() => {}} />
      );
      assert.match(globalErrHtml, /lang="en"/);
      assert.match(globalErrHtml, /Critical application error/);
      assert.match(globalErrHtml, /Reload home/);
    } finally {
      useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
    }
  });
});
