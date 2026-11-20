import { describe, test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TimelineBar } from "../src/components/timeline/TimelineBar";
import { PresetSelector } from "../src/components/timeline/PresetSelector";
import { TimelineAxis } from "../src/components/timeline/TimelineAxis";
import { CategoryFilterPills } from "../src/components/timeline/CategoryFilterPills";
import { useTimelineStore, ALL_CATEGORIES } from "../src/stores/timelineStore";
import { useGlobeStore } from "../src/stores/globeStore";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { useCosmicStore } from "../src/stores/cosmicStore";

function resetAllStores() {
  useTimelineStore.setState({
    startYear: 1974,
    endYear: 2024,
    selectedYear: null,
    selectedMilestoneId: null,
    activeCategories: [...ALL_CATEGORIES],
    isExpanded: true,
    timelineMode: "HISTORICAL",
    geologicalMa: null,
    selectedGeologicalMa: null,
    activeRouteId: null,
    selectedRouteId: null,
  });
  useGlobeStore.setState({
    selectedIso: null,
    hoveredIso: null,
    isReaderOpen: false,
    isThrottled: false,
  });
  useObservatoryStore.setState({
    isPanelOpen: false,
    activeLayers: [],
    selectedEntity: null,
  });
  useCosmicStore.getState().resetCosmicState();
}

describe("T02 — Timeline responsive layout, overflow prevention & axis tick separation", () => {
  beforeEach(() => {
    resetAllStores();
  });

  test("1. PresetSelector uses short labels visibly, keeps long labels in title tooltips, and scrolls horizontally", () => {
    const html = renderToStaticMarkup(React.createElement(PresetSelector));

    // Must not toggle to long labels at 2xl
    assert.ok(!html.includes("2xl:inline"), "PresetSelector must not switch to long labels at 2xl");
    assert.ok(!html.includes("2xl:hidden"), "PresetSelector must not hide short labels at 2xl");

    // Scrollable horizontal strip with min-w-0
    assert.ok(html.includes('data-testid="preset-scroll-container"'));
    assert.ok(html.includes("overflow-x-auto"));
    assert.ok(html.includes("scroll-smooth"));
    assert.ok(html.includes("min-w-0"));

    // Short labels rendered as chip text
    assert.ok(html.includes(">50 Anos<"));
    assert.ok(html.includes(">Séc. XXI<"));
    assert.ok(html.includes(">Guerra Fria<"));
    assert.ok(html.includes(">Guerras Mund.<"));
    assert.ok(html.includes(">🌋 Pangeia<"));
    assert.ok(html.includes(">🦖 Gondwana<"));
    assert.ok(html.includes(">☄️ Cretáceo<"));
    assert.ok(html.includes(">⛵ Magalhães<"));

    // Long labels preserved in title tooltips
    assert.ok(html.includes('title="50 Anos Padrão"'));
    assert.ok(html.includes('title="Século XXI"'));
    assert.ok(html.includes('title="Guerras Mundiais"'));
    assert.ok(html.includes('title="🌋 Pangeia (250 Ma)"'));
    assert.ok(html.includes('title="🦖 Gondwana &amp; Laurásia (150 Ma)"'));
    assert.ok(html.includes('title="☄️ Cretáceo K-Pg (66 Ma)"'));
    assert.ok(html.includes('title="⛵ Circum-navegação de Magalhães (1519–1522)"'));
  });

  test("2. TimelineBar header removes unconditional nowrap, uses two zones with min-w-0, and exposes all controls", () => {
    const html = renderToStaticMarkup(React.createElement(TimelineBar));

    assert.ok(!html.includes("xl:flex-nowrap"), "Header must not force xl:flex-nowrap");
    assert.ok(!html.includes("2xl:flex-nowrap"), "Header must not force 2xl:flex-nowrap");

    assert.ok(html.includes('data-testid="timeline-header"'));
    assert.ok(html.includes('data-testid="timeline-presets-zone"'));
    assert.ok(html.includes('data-testid="timeline-controls-zone"'));

    // All key controls present
    assert.ok(html.includes('data-testid="timeline-play-toggle"'));
    assert.ok(html.includes('data-testid="timeline-speed-toggle"'));
    assert.ok(html.includes('aria-label="Ano inicial"'));
    assert.ok(html.includes('aria-label="Ano final"'));
    assert.ok(html.includes('aria-label="Recolher timeline"'));
  });

  test("3. TimelineBar reserves free space whenever any right-side panel is open (InspectorHUD, ObservatoryPanel, CosmicInspectorHUD)", () => {
    // Default: no side panel
    const htmlDefault = renderToStaticMarkup(React.createElement(TimelineBar));
    assert.ok(htmlDefault.includes('data-side-panel-open="false"'));
    assert.ok(htmlDefault.includes("left-1/2 -translate-x-1/2"));

    // Country InspectorHUD open
    useGlobeStore.setState({ selectedIso: "BRA" });
    const htmlInspector = renderToStaticMarkup(React.createElement(TimelineBar));
    assert.ok(htmlInspector.includes('data-side-panel-open="true"'));
    assert.ok(htmlInspector.includes("lg:right-[26.5rem]"));

    // ObservatoryPanel open (without selected country)
    resetAllStores();
    useObservatoryStore.setState({ isPanelOpen: true });
    const htmlObservatory = renderToStaticMarkup(React.createElement(TimelineBar));
    assert.ok(htmlObservatory.includes('data-side-panel-open="true"'));
    assert.ok(htmlObservatory.includes("lg:right-[26.5rem]"));

    // CosmicInspectorHUD open in cosmic mode with focused planet
    resetAllStores();
    useCosmicStore.setState({
      isCosmicMode: true,
      focusedBodyId: "MARS",
      isInspectorOpen: true,
    });
    const htmlCosmic = renderToStaticMarkup(React.createElement(TimelineBar));
    assert.ok(htmlCosmic.includes('data-side-panel-open="true"'));
    assert.ok(htmlCosmic.includes("lg:right-[26.5rem]"));

    // Cosmic mode without focused body / open drawer should NOT shrink timeline
    resetAllStores();
    useCosmicStore.setState({
      isCosmicMode: true,
      focusedBodyId: null,
      isInspectorOpen: false,
    });
    const htmlCosmicNoDrawer = renderToStaticMarkup(React.createElement(TimelineBar));
    assert.ok(htmlCosmicNoDrawer.includes('data-side-panel-open="false"'));

    // Normal mode with Moon focused & inspector open
    resetAllStores();
    useCosmicStore.setState({
      isCosmicMode: false,
      focusedBodyId: "MOON",
      isInspectorOpen: true,
    });
    const htmlMoon = renderToStaticMarkup(React.createElement(TimelineBar));
    assert.ok(htmlMoon.includes('data-side-panel-open="true"'));
  });

  test("4. TimelineAxis places historical year tick labels strictly below central axis so they do not overlap pins", () => {
    const html = renderToStaticMarkup(React.createElement(TimelineAxis));
    assert.ok(html.includes('data-testid="historical-timeline-axis"'));

    const tickMatches = html.match(/<div data-testid="timeline-year-tick"[^>]*>/g) ?? [];
    assert.ok(tickMatches.length > 0, "Should render historical year ticks");

    for (const tag of tickMatches) {
      assert.ok(tag.includes("top-1/2"), `Tick must anchor at top-1/2: ${tag}`);
      assert.ok(
        !tag.includes("-translate-y-1/2"),
        `Tick must hang strictly below axis without -translate-y-1/2 (prevents pin overlap): ${tag}`
      );
    }

    // Edge tick at end (e.g. 2024 when range 1974-2024) should align inward if >= 98%
    useTimelineStore.setState({ startYear: 1975, endYear: 2025 });
    const htmlEdges = renderToStaticMarkup(React.createElement(TimelineAxis));
    assert.ok(htmlEdges.includes('data-year="1975"'));
    assert.ok(htmlEdges.includes('data-year="2025"'));
    assert.ok(htmlEdges.includes("items-start"), "Start edge tick should align left (items-start)");
    assert.ok(htmlEdges.includes("items-end"), "End edge tick should align right (items-end)");
  });

  test("5. TimelineAxis scales tick density cleanly on wide spans and CategoryFilterPills prevent chip wrapping", () => {
    useTimelineStore.setState({ startYear: 1400, endYear: 2024 });
    const htmlWide = renderToStaticMarkup(React.createElement(TimelineAxis));
    const tickCount = (htmlWide.match(/data-testid="timeline-year-tick"/g) ?? []).length;
    assert.ok(
      tickCount <= 10,
      `Wide span (1400-2024) should render at most 10 ticks to avoid crowding, got ${tickCount}`
    );

    const pillsHtml = renderToStaticMarkup(React.createElement(CategoryFilterPills));
    assert.ok(pillsHtml.includes("whitespace-nowrap"));
    assert.ok(pillsHtml.includes("shrink-0"));
    assert.ok(pillsHtml.includes("Política"));
    assert.ok(pillsHtml.includes("Saúde"));
  });
});
