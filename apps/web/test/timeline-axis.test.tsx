import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  adaptiveTicks,
  clampView,
  clusterPins,
  milestoneDecimalYear,
  panView,
  pxToYear,
  tickStepFor,
  viewForCluster,
  yearToPercent,
  zoomView,
  MIN_PIN_SPACING_PX,
  MIN_TICK_SPACING_PX,
  MIN_VIEW_SPAN,
  type AxisView,
} from "../src/lib/timeline/axis";
import { GLOBAL_MILESTONES, PILOT_COUNTRIES, type MilestoneItem } from "../src/lib/country-data";
import { TimelineAxis } from "../src/components/timeline/TimelineAxis";
import { useTimelineStore, ALL_CATEGORIES } from "../src/stores/timelineStore";
import { useGlobeStore } from "../src/stores/globeStore";

const read = (f: string) => fs.readFileSync(path.join(__dirname, "..", f), "utf-8");
const bounds: AxisView = { start: 1400, end: 2024 };

describe("D13: janela do eixo (zoom e pan)", () => {
  test("zoom ancorado mantém o ano sob o cursor e respeita o período e o mínimo de 3 meses", () => {
    const v = zoomView(bounds, bounds, 0.5, 1800);
    assert.ok(Math.abs(yearToPercent(1800, v) - yearToPercent(1800, bounds)) < 1e-9, "âncora fixa");
    assert.ok(Math.abs(v.end - v.start - 312) < 1e-9);
    let z = bounds;
    for (let i = 0; i < 200; i++) z = zoomView(z, bounds, 0.5, 1989.9);
    assert.ok(Math.abs(z.end - z.start - MIN_VIEW_SPAN) < 1e-9, "não passa do mínimo");
    assert.deepEqual(zoomView(bounds, bounds, 4, 1500), bounds, "não sai do período ao afastar");
  });

  test("pan para no começo e no fim do período", () => {
    const v = { start: 1900, end: 1950 };
    assert.deepEqual(panView(v, bounds, -1000), { start: 1400, end: 1450 });
    assert.deepEqual(panView(v, bounds, 1000), { start: 1974, end: 2024 });
    assert.deepEqual(clampView({ start: 2000, end: 1990 }, bounds).start <= 2024, true);
    assert.equal(pxToYear(400, 800, { start: 1900, end: 2000 }), 1950);
  });
});

describe("D13: ticks adaptativos (século → década → ano → mês)", () => {
  test("o nível acompanha o zoom", () => {
    assert.equal(tickStepFor({ start: 1400, end: 2024 }, 800).unit, "century");
    assert.equal(tickStepFor({ start: 1900, end: 2024 }, 800).unit, "decade");
    assert.equal(tickStepFor({ start: 1985, end: 1993 }, 800).unit, "year");
    const months = adaptiveTicks({ start: 1990, end: 1990.5 }, 800);
    assert.equal(months[0].unit, "month");
    assert.ok(months.some((t) => t.label === "fev 1990"));
    assert.equal(months[0].label, "1990", "janeiro mostra o ano");
  });

  test("espaçamento mínimo entre ticks em qualquer zoom e largura", () => {
    for (const width of [360, 800, 1600]) {
      for (let span = 624; span >= MIN_VIEW_SPAN; span /= 1.37) {
        const view = { start: 2024 - span, end: 2024 };
        const ticks = adaptiveTicks(view, width);
        assert.ok(ticks.length >= 1, `há ticks (span ${span.toFixed(2)})`);
        for (let i = 1; i < ticks.length; i++) {
          const gap = ((ticks[i].percent - ticks[i - 1].percent) / 100) * width;
          assert.ok(gap >= MIN_TICK_SPACING_PX - 1e-6 || ticks.length <= 2, `gap ${gap.toFixed(1)} px (span ${span.toFixed(2)}, ${width} px)`);
        }
        assert.ok(new Set(ticks.map((t) => t.key)).size === ticks.length, "chaves únicas");
      }
    }
  });
});

describe("D13: marcos agrupados sem sobreposição", () => {
  const all: MilestoneItem[] = [...GLOBAL_MILESTONES, ...Object.values(PILOT_COUNTRIES).flatMap((c) => c.milestones)];
  const pins = all.map((m) => ({ item: m, value: milestoneDecimalYear(m.year, m.exactDate) }));

  test("data exata vira ano decimal; sem data, meio do ano", () => {
    assert.ok(Math.abs(milestoneDecimalYear(1989, "1989-11-09") - (1989 + (10 + 8 / 31) / 12)) < 1e-9);
    assert.equal(milestoneDecimalYear(1500), 1500.5);
    assert.equal(milestoneDecimalYear(1500, "1499-01-01"), 1500.5, "data inconsistente com o ano é ignorada");
  });

  test("nenhum par de marcadores mais perto que o mínimo, em qualquer zoom e janela", () => {
    for (const width of [480, 1200]) {
      for (let span = 624; span >= 1; span /= 2) {
        for (let start = 1400; start + span <= 2024; start += Math.max(span / 2, 25)) {
          const view = { start, end: start + span };
          const visible = pins.filter((p) => p.value >= view.start && p.value <= view.end);
          const clusters = clusterPins(visible, view, width, (m) => m.id);
          assert.equal(clusters.reduce((n, c) => n + c.members.length, 0), visible.length, "todo marco aparece uma vez");
          for (let i = 1; i < clusters.length; i++) {
            const gap = ((clusters[i].value - clusters[i - 1].value) / span) * width;
            assert.ok(gap >= MIN_PIN_SPACING_PX - 1e-6, `gap ${gap.toFixed(1)} px em ${start}–${start + span}`);
          }
        }
      }
    }
  });

  test("abrir um grupo aproxima o eixo sobre os membros, dentro do período", () => {
    const v = viewForCluster(1989.2, 1991.7, bounds);
    assert.ok(v.start <= 1989.2 && v.end >= 1991.7 && v.end - v.start < 10);
    const same = viewForCluster(1990.5, 1990.5, bounds);
    assert.ok(Math.abs(same.end - same.start - MIN_VIEW_SPAN) < 1e-9);
  });
});

describe("D13: componente", () => {
  test("SSR: eixo com janela, scrubber e todos os marcos (soltos ou agrupados)", () => {
    useTimelineStore.setState({ startYear: 1974, endYear: 2024, selectedYear: 1989, activeCategories: [...ALL_CATEGORIES], selectedMilestoneId: null, geologicalMa: null });
    useGlobeStore.setState({ selectedIso: null });
    const html = renderToStaticMarkup(React.createElement(TimelineAxis));
    assert.match(html, /data-view-start="1974\.00"/);
    assert.match(html, /data-testid="timeline-scrubber"[^>]*aria-valuenow="1989"/);
    const expected = GLOBAL_MILESTONES.filter((m) => m.year >= 1974 && m.year <= 2024).length;
    const loose = (html.match(/rounded-full border-2 transition-transform/g) ?? []).length;
    const grouped = [...html.matchAll(/data-testid="timeline-cluster" data-count="(\d+)"/g)].reduce((n, m) => n + Number(m[1]), 0);
    assert.equal(loose + grouped, expected);
    assert.doesNotMatch(html, /timeline-zoom-reset/, "sem zoom, sem botão de período inteiro");
  });

  test("interações: roda não passiva, pinça/arrasto por pointer, teclado e cores dos tokens", () => {
    const src = read("src/components/timeline/TimelineAxis.tsx");
    assert.match(src, /addEventListener\("wheel", onWheel, \{ passive: false \}\)/);
    assert.match(src, /touch-none/);
    assert.match(src, /pointers\.current\.size >= 2/, "pinça com dois dedos");
    assert.match(src, /e\.key === "\+"/);
    assert.match(src, /role="slider"/);
    assert.match(read("src/components/timeline/MilestoneCluster.tsx"), /CATEGORY_TONE/);
  });
});
