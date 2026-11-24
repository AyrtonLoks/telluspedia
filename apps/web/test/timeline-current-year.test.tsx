import { describe, test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CURRENT_YEAR,
  DEFAULT_TIMELINE_END_YEAR,
  DEFAULT_TIMELINE_SPAN,
  DEFAULT_TIMELINE_START_YEAR,
  TIMELINE_INPUT_MAX_YEAR,
  TWENTY_FIRST_CENTURY_START_YEAR,
  getCurrentYear,
} from "../src/lib/timeline/current-year";
import { HISTORICAL_ERAS } from "../src/lib/historical-eras";
import { GLOBAL_MILESTONES } from "../src/lib/milestones";
import { getSourceUrl } from "../src/lib/source-urls";
import { useTimelineStore } from "../src/stores/timelineStore";
import { applyTimelinePreset, restoreContemporaryTimeline } from "../src/stores/actions";
import { TimelineBar } from "../src/components/timeline/TimelineBar";
import { TimelineAxis } from "../src/components/timeline/TimelineAxis";
import { MilestonePin } from "../src/components/timeline/MilestonePin";
import { useLocaleStore } from "../src/stores/localeStore";
import { EN_MESSAGES } from "../src/lib/i18n/en";

describe("T48 · Janela temporal dinâmica até CURRENT_YEAR e marcos curados 2022–2026", () => {
  test("1. getCurrentYear respeita calendário UTC com piso 2026 e janela padrão de 50 anos", () => {
    assert.equal(getCurrentYear(new Date("2024-06-15T12:00:00Z")), 2026);
    assert.equal(getCurrentYear(new Date("2026-11-23T12:00:00Z")), 2026);
    assert.equal(getCurrentYear(new Date("2028-01-01T00:00:01Z")), 2028);

    assert.equal(DEFAULT_TIMELINE_END_YEAR, CURRENT_YEAR);
    assert.equal(DEFAULT_TIMELINE_START_YEAR, CURRENT_YEAR - DEFAULT_TIMELINE_SPAN);
    assert.ok(TIMELINE_INPUT_MAX_YEAR >= CURRENT_YEAR + 10);
    assert.equal(HISTORICAL_ERAS.CONTEMPORARY.endYear, CURRENT_YEAR);
    assert.equal(HISTORICAL_ERAS.CONTEMPORARY.representativeYear, CURRENT_YEAR);
  });

  test("2. Presets, restoreContemporaryTimeline e TimelineBar acompanham CURRENT_YEAR", () => {
    const prev = useTimelineStore.getState();
    try {
      applyTimelinePreset("LAST_50_YEARS");
      assert.equal(useTimelineStore.getState().startYear, DEFAULT_TIMELINE_START_YEAR);
      assert.equal(useTimelineStore.getState().endYear, DEFAULT_TIMELINE_END_YEAR);

      applyTimelinePreset("21ST_CENTURY");
      assert.equal(useTimelineStore.getState().startYear, TWENTY_FIRST_CENTURY_START_YEAR);
      assert.equal(useTimelineStore.getState().endYear, CURRENT_YEAR);

      restoreContemporaryTimeline();
      assert.equal(useTimelineStore.getState().startYear, DEFAULT_TIMELINE_START_YEAR);
      assert.equal(useTimelineStore.getState().endYear, DEFAULT_TIMELINE_END_YEAR);
      assert.equal(useTimelineStore.getState().selectedYear, CURRENT_YEAR);

      const barHtml = renderToStaticMarkup(<TimelineBar />);
      assert.match(barHtml, new RegExp(`value="${DEFAULT_TIMELINE_START_YEAR}"`));
      assert.match(barHtml, new RegExp(`value="${DEFAULT_TIMELINE_END_YEAR}"`));
      assert.match(barHtml, new RegExp(`max="${TIMELINE_INPUT_MAX_YEAR}"`));

      // Todos os marcos da janela padrão (inclusive eventos de 2026 após 01/jan) aparecem no eixo
      const axisHtml = renderToStaticMarkup(<TimelineAxis />);
      const expectedCount = GLOBAL_MILESTONES.filter(
        (m) => m.year >= DEFAULT_TIMELINE_START_YEAR && m.year <= DEFAULT_TIMELINE_END_YEAR
      ).length;
      const loose = (axisHtml.match(/rounded-full border-2 transition-transform/g) ?? []).length;
      const grouped = [...axisHtml.matchAll(/data-testid="timeline-cluster" data-count="(\d+)"/g)].reduce(
        (n, m) => n + Number(m[1]),
        0
      );
      assert.equal(loose + grouped, expectedCount, "Todos os marcos até CURRENT_YEAR (incl. 2026-05-03) devem aparecer no eixo");
    } finally {
      useTimelineStore.setState({
        startYear: prev.startYear,
        endYear: prev.endYear,
        selectedYear: prev.selectedYear,
        selectedMilestoneId: prev.selectedMilestoneId,
        geologicalMa: prev.geologicalMa,
      });
    }
  });

  test("3. Pelo menos 6 marcos históricos verificados entre 2022 e 2026 com fontes e tradução pt-BR ↔ en", () => {
    const recent = GLOBAL_MILESTONES.filter((m) => m.year >= 2022 && m.year <= 2026);
    assert.ok(recent.length >= 6, `Esperava ≥ 6 marcos entre 2022 e 2026, obteve ${recent.length}`);
    assert.ok(recent.some((m) => m.year === 2026), "Deve existir marco curado em 2026");

    for (const m of recent) {
      assert.ok(m.sourcePrimary.length > 0, `Fonte ausente em ${m.id}`);
      const url = getSourceUrl(m.sourcePrimary);
      assert.match(url, /^https:\/\//, `URL inválida para fonte ${m.sourcePrimary}`);
      assert.ok(m.id in Object.fromEntries(Object.keys(EN_MESSAGES).map((k) => [k.replace(/^event\./, ""), true])), `Tradução EN ausente para ${m.id}`);
    }

    const milton = recent.find((m) => m.id === "glo-2026-milton");
    assert.ok(milton, "Marco glo-2026-milton deve existir");
    try {
      useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
      const htmlEn = renderToStaticMarkup(
        <MilestonePin
          id={milton.id}
          title={milton.title}
          summary={milton.summary}
          year={milton.year}
          exactDate={milton.exactDate}
          category={milton.category}
          sourcePrimary={milton.sourcePrimary}
          countryIso={milton.countryIso}
          index={0}
          percent={95}
        />
      );
      assert.match(htmlEn, /Centennial of Milton Santos \(1926–2026\)/);
      assert.match(htmlEn, /Source:/);
      assert.match(htmlEn, /Cite/);
    } finally {
      useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
    }
  });
});
