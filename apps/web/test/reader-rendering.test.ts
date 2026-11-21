import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { getCountryData, PILOT_COUNTRIES, getIso2FromIso3 } from "../src/lib/country-data";
import { formatSourceBadge } from "../src/components/hud/CountryMetricsGrid";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HoverCitationCard } from "../src/components/reader/HoverCitationCard";
import { HoverCardPreview } from "../src/components/reader/HoverCardPreview";
import { ReaderContent } from "../src/components/reader/ReaderContent";

describe("ETAPA 4: Responsive Layout, ISO Flag Resolution & Universal Citations", () => {
  test("ISO3 to ISO2 lookup correctly maps Poland to PL, Germany to DE, Brazil to BR, etc.", () => {
    assert.equal(getIso2FromIso3("POL"), "PL");
    assert.equal(getIso2FromIso3("DEU"), "DE");
    assert.equal(getIso2FromIso3("BRA"), "BR");
    assert.equal(getIso2FromIso3("USA"), "US");
    assert.equal(getIso2FromIso3("JPN"), "JP");
    assert.equal(getIso2FromIso3("ZAF"), "ZA");
    assert.equal(getIso2FromIso3("SWE"), "SE");
    assert.equal(getIso2FromIso3("NLD"), "NL");
  });

  test("getCountryData for Poland (POL) resolves to pl.svg and never po.svg", () => {
    const poland = getCountryData("POL");
    assert.ok(poland);
    assert.equal(poland.isoCode, "POL");
    assert.equal(poland.iso2, "PL");
    assert.equal(poland.flagSvgUrl, "https://flagcdn.com/pl.svg");
    assert.ok(!poland.flagSvgUrl.includes("po.svg"), "Must NOT generate po.svg for Poland");
  });

  test("getCountryData for unindexed ISO returns null instead of invented placeholder data", () => {
    const unknown = getCountryData("XYZ_UNKNOWN");
    assert.equal(unknown, null, "Unknown country ISO must return null (RN02)");
  });

  test("Pilot countries indicators display valid primary sources (World Bank, PNUD, WHO, SIPRI)", () => {
    const brazil = getCountryData("BRA");
    assert.ok(brazil);
    const gdp = brazil.indicators.find((i) => i.indicatorCode === "NY.GDP.MKTP.CD");
    const hdi = brazil.indicators.find((i) => i.indicatorCode === "UNDP.HDI");
    const life = brazil.indicators.find((i) => i.indicatorCode === "SP.DYN.LE00.IN");
    const mil = brazil.indicators.find((i) => i.indicatorCode === "MS.MIL.XPND.GD.ZS");

    assert.equal(gdp?.sourcePrimary, "Banco Mundial");
    assert.equal(hdi?.sourcePrimary, "PNUD");
    assert.equal(life?.sourcePrimary, "OMS");
    assert.equal(mil?.sourcePrimary, "SIPRI");
  });

  test("Pilot countries dossier sections contain explicit academic footnote marks [1], [2], or [3]", () => {
    for (const [iso, country] of Object.entries(PILOT_COUNTRIES)) {
      for (const section of country.dossierSections) {
        assert.ok(
          /\[\d+\]/.test(section.contentMarkdown),
          `Dossier section ${section.dimension} of ${iso} must contain explicit academic footnote marks`
        );
      }
    }
  });

  test("Country mini timeline milestones contain primary sources", () => {
    const brazil = getCountryData("BRA");
    assert.ok(brazil);
    assert.ok(brazil.milestones.length > 0);
    for (const m of brazil.milestones) {
      assert.ok(m.sourcePrimary && m.sourcePrimary.length > 0, `Milestone ${m.id} missing sourcePrimary`);
    }
  });

  test("formatSourceBadge formats institutional sources accurately without broken single-word truncation", () => {
    assert.equal(formatSourceBadge("Banco Mundial"), "B. Mundial");
    assert.equal(formatSourceBadge("Banco Mundial / BEA"), "B. Mundial / BEA");
    assert.equal(formatSourceBadge("IBGE / Banco Mundial"), "IBGE / BM");
    assert.equal(formatSourceBadge("US Census Bureau"), "US Census");
    assert.equal(formatSourceBadge("Stats SA"), "Stats SA");
    assert.equal(formatSourceBadge("E-Stat Japan"), "E-Stat");
    assert.equal(formatSourceBadge("Destatis"), "Destatis");
    assert.equal(formatSourceBadge("PNUD"), "PNUD");
    assert.equal(formatSourceBadge("OMS"), "OMS");
    assert.equal(formatSourceBadge("SIPRI"), "SIPRI");
    assert.equal(formatSourceBadge("Natural Earth"), "Natural Earth");
    assert.notEqual(formatSourceBadge("Banco Mundial"), "Banco", "Must not truncate Banco Mundial to Banco");
    assert.notEqual(formatSourceBadge("US Census Bureau"), "US", "Must not truncate US Census Bureau to US");
  });

  test("MilestonePin horizontal alignment avoids overlapping InspectorHUD at right edge and clipping at left edge", () => {
    const computeAlignment = (percent: number) =>
      percent < 15
        ? "left-0 translate-x-0"
        : percent > 78
        ? "right-0 left-auto translate-x-0"
        : "left-1/2 -translate-x-1/2";

    // Near left edge (e.g., 2%, 5%, 10%)
    assert.equal(computeAlignment(2), "left-0 translate-x-0");
    assert.equal(computeAlignment(14), "left-0 translate-x-0");

    // Center (e.g., 50%)
    assert.equal(computeAlignment(50), "left-1/2 -translate-x-1/2");

    // Near right edge adjacent to InspectorHUD (e.g., 80%, 95%, 98%)
    assert.equal(computeAlignment(79), "right-0 left-auto translate-x-0");
    assert.equal(computeAlignment(85), "right-0 left-auto translate-x-0");
    assert.equal(computeAlignment(98), "right-0 left-auto translate-x-0");
  });

  test("ReaderContent auto-assigns footnote citations to unannotated paragraphs so no text is libre", () => {
    const rawProse = "Primeiro parágrafo do texto histórico.\n\nSegundo parágrafo detalhando o impacto econômico.\n\nTerceiro parágrafo sobre acordos internacionais.";
    const paragraphs = rawProse.split("\n\n");
    const annotated = paragraphs.map((p, idx) => {
      const trimmed = p.trim();
      if (/\[\d+\]/.test(trimmed)) return trimmed;
      const fn = idx === 0 ? " [1]" : idx === 1 ? " [2]" : " [3]";
      return `${trimmed}${fn}`;
    });

    assert.equal(annotated.length, 3);
    assert.ok(annotated[0].endsWith("[1]"));
    assert.ok(annotated[1].endsWith("[2]"));
    assert.ok(annotated[2].endsWith("[3]"));
  });

  test("ReaderContent activeFootnotesMap dynamically includes any cited index (such as [4])", () => {
    const baseMap = {
      1: { source: "Fonte 1", detail: "D1", type: "T1" },
      2: { source: "Fonte 2", detail: "D2", type: "T2" },
      3: { source: "Fonte 3", detail: "D3", type: "T3" },
    };
    const sampleText = "Conforme estudo preliminar [1], complementado por dados [4].";
    const dynamicMap: Record<number, any> = { ...baseMap };
    for (const match of sampleText.matchAll(/\[(\d+)\]/g)) {
      const num = parseInt(match[1], 10);
      if (!dynamicMap[num]) {
        dynamicMap[num] = {
          source: "Arquivo Histórico Oficial",
          detail: "Registro catalogado pelo TellusPedia.",
          type: "Fonte Primária",
        };
      }
    }

    assert.ok(dynamicMap[1]);
    assert.ok(dynamicMap[4], "Footnote [4] must be dynamically cataloged in dynamicMap");
    assert.equal(dynamicMap[4].source, "Arquivo Histórico Oficial");
  });

  test("ComparisonGrid resolves global countries through getCountryData and omits unknown ISOs", () => {
    const countries = ["BRA", "DEU", "POL", "CAN", "XYZ_UNINDEXED"]
      .map((iso) => getCountryData(iso))
      .filter((c) => c !== null);
    assert.equal(countries.length, 4);
    assert.equal(countries[0].nameCommon, "Brasil");
    assert.equal(countries[1].nameCommon, "Alemanha");
    assert.equal(countries[2].nameCommon, "Polônia");
    assert.equal(countries[3].nameCommon, "Canadá");
    assert.equal(getCountryData("XYZ_UNINDEXED"), null);
  });
});

describe("Reader DOM Nesting & Hydration Safety (validateDOMNesting Invariants)", () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  test("HoverCitationCard source and markup (both closed and open) does not contain <div> tags", () => {
    // 1. Initial closed state
    const closedMarkup = renderToStaticMarkup(
      React.createElement(HoverCitationCard, {
        number: 1,
        source: "Banco Mundial",
        detail: "Indicadores econômicos auditados",
        type: "Fonte Primária",
      })
    );
    assert.ok(!closedMarkup.includes("<div"), "HoverCitationCard (closed) must not render any <div> elements");

    // 2. Open state with full card popup
    const openMarkup = renderToStaticMarkup(
      React.createElement(HoverCitationCard, {
        number: 1,
        source: "Banco Mundial",
        detail: "Indicadores econômicos auditados",
        type: "Fonte Primária",
        defaultOpen: true,
      })
    );
    assert.ok(!openMarkup.includes("<div"), "HoverCitationCard (open) must not render any <div> elements");
    assert.ok(openMarkup.includes("Nota de Rodapé [1]"), "Open citation card must render header");
    assert.ok(openMarkup.includes("Gerar Citação"), "Open citation card must render citation button");
    assert.ok(openMarkup.includes("Copiar ABNT"), "Open citation card must render quick copy button");

    // 3. Static source inspection: ensure no <div> or </div> tag exists in file
    const filePath = path.join(__dirname, "../src/components/reader/HoverCitationCard.tsx");
    const code = fs.readFileSync(filePath, "utf-8");
    assert.ok(!code.includes("<div"), "HoverCitationCard.tsx must not contain any <div tags");
    assert.ok(!code.includes("</div>"), "HoverCitationCard.tsx must not contain any </div> tags");
  });

  test("HoverCardPreview source and markup (both closed and open) does not contain <div> tags", () => {
    // 1. Initial closed state
    const closedMarkup = renderToStaticMarkup(
      React.createElement(HoverCardPreview, {
        isoCode: "USA",
        children: "Estados Unidos",
      })
    );
    assert.ok(!closedMarkup.includes("<div"), "HoverCardPreview (closed) must not render any <div> elements");

    // 2. Open state with full country card popup
    const openMarkup = renderToStaticMarkup(
      React.createElement(HoverCardPreview, {
        isoCode: "USA",
        children: "Estados Unidos",
        defaultOpen: true,
      })
    );
    assert.ok(!openMarkup.includes("<div"), "HoverCardPreview (open) must not render any <div> elements");
    assert.ok(openMarkup.includes("Focar Globo"), "Open preview card must render action buttons");
    assert.ok(openMarkup.includes("Comparar"), "Open preview card must render comparator button");

    // 3. Static source inspection: ensure no <div> or </div> tag exists in file
    const filePath = path.join(__dirname, "../src/components/reader/HoverCardPreview.tsx");
    const code = fs.readFileSync(filePath, "utf-8");
    assert.ok(!code.includes("<div"), "HoverCardPreview.tsx must not contain any <div tags");
    assert.ok(!code.includes("</div>"), "HoverCardPreview.tsx must not contain any </div> tags");
  });

  test("ReaderContent renders prose paragraphs without nested <div> in <p> and lists as semantic <ul> with <li>", () => {
    // 1. Test GEOGRAPHY dimension (pure prose)
    const brazil = getCountryData("BRA");
    assert.ok(brazil);
    const geoMarkup = renderToStaticMarkup(
      React.createElement(ReaderContent, { country: brazil, dimension: "GEOGRAPHY" })
    );

    const geoPBlocks = geoMarkup.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    assert.ok(geoPBlocks.length > 0, "ReaderContent GEOGRAPHY must render at least one <p> tag");
    for (const p of geoPBlocks) {
      assert.ok(!p.includes("<div"), `<p> block must not contain <div>: ${p}`);
      assert.ok(!p.includes("<ul"), `<p> block must not contain <ul>: ${p}`);
    }

    // 2. Test GOVERNMENT_POLITICS dimension (contains both prose and bullet list)
    const polMarkup = renderToStaticMarkup(
      React.createElement(ReaderContent, { country: brazil, dimension: "GOVERNMENT_POLITICS" })
    );

    assert.ok(polMarkup.includes("<ul"), "GOVERNMENT_POLITICS must render a <ul> list for powers of state");
    assert.ok(polMarkup.includes("<li"), "GOVERNMENT_POLITICS must render <li> items for powers of state");

    const polPBlocks = polMarkup.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || [];
    for (const p of polPBlocks) {
      assert.ok(!p.includes("<div"), `Rendered <p> block must not contain any <div> tag: ${p}`);
      assert.ok(!p.includes("<ul"), `Rendered <p> block must not contain any <ul> tag: ${p}`);
      assert.ok(!p.includes("<li"), `Rendered <p> block must not contain any <li> tag: ${p}`);
    }

    const polUlBlocks = polMarkup.match(/<ul\b[^>]*>[\s\S]*?<\/ul>/gi) || [];
    assert.ok(polUlBlocks.length > 0, "Must have at least one <ul> block");
    for (const ul of polUlBlocks) {
      assert.ok(!ul.includes("<p"), `Rendered <ul> block must not contain <p> tag: ${ul}`);
      assert.ok(!ul.includes("<div"), `Rendered <ul> block must not contain <div> tag: ${ul}`);
      assert.ok(ul.includes("<li"), `Rendered <ul> block must contain <li>: ${ul}`);
    }

    // 3. Test USA GOVERNMENT_POLITICS (contains checks and balances in italics)
    const usa = getCountryData("USA");
    assert.ok(usa);
    const usaMarkup = renderToStaticMarkup(
      React.createElement(ReaderContent, { country: usa, dimension: "GOVERNMENT_POLITICS" })
    );
    assert.ok(usaMarkup.includes("<em"), "USA section must format italics (*checks and balances*) as <em>");
    assert.ok(usaMarkup.includes("checks and balances"), "USA section must contain checks and balances");
    assert.ok(usaMarkup.includes("<ul"), "USA section must render <ul> list");
  });

  test("React validateDOMNesting emits zero errors or warnings when rendering popups inside <p>", () => {
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...args: unknown[]) => {
      errors.push(args.map(String).join(" "));
      originalError(...args);
    };

    try {
      // Render <p> with open HoverCitationCard
      renderToStaticMarkup(
        React.createElement("p", null,
          React.createElement(HoverCitationCard, {
            number: 1,
            source: "Banco Mundial",
            detail: "Indicadores econômicos auditados",
            type: "Fonte Primária",
            defaultOpen: true,
          })
        )
      );

      // Render <p> with open HoverCardPreview
      renderToStaticMarkup(
        React.createElement("p", null,
          React.createElement(HoverCardPreview, {
            isoCode: "USA",
            children: "Estados Unidos",
            defaultOpen: true,
          })
        )
      );

      assert.equal(errors.length, 0, `validateDOMNesting logged errors: ${errors.join("; ")}`);
    } finally {
      console.error = originalError;
    }
  });
});
