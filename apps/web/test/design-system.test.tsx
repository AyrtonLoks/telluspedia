import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Badge,
  Button,
  Card,
  Chip,
  IconButton,
  Panel,
  PanelHeader,
  Stat,
  Switch,
  cn,
} from "../src/components/ui";

const root = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf-8");

describe("D14: tokens", () => {
  test("toda variável --color-* usada no Tailwind está definida no globals.css", () => {
    const tailwind = read("tailwind.config.ts");
    const css = read("src/styles/globals.css");
    const used = new Set([...tailwind.matchAll(/token\("([\w-]+)"\)/g)].map((m) => `--color-${m[1]}`));
    assert.ok(used.size >= 25, `esperava os tokens semânticos no Tailwind, achou ${used.size}`);
    for (const v of used) assert.match(css, new RegExp(`${v}:\\s*\\d+ \\d+ \\d+;`), `${v} não definido`);
  });

  test("escala tipográfica de interface tem exatamente 5 tamanhos e mínimo de 12 px", () => {
    const tailwind = read("tailwind.config.ts");
    const block = tailwind.slice(tailwind.indexOf("fontSize:"), tailwind.indexOf("},", tailwind.indexOf("display:")));
    const sizes = [...block.matchAll(/\["(\d+)px"/g)].map((m) => Number(m[1]));
    assert.deepEqual(sizes, [12, 13, 15, 18, 24]);
  });

  test("cn mantém tamanho e cor de texto juntos (tailwind-merge conhece os tokens)", () => {
    assert.equal(cn("text-caption text-fg", "text-fg-secondary"), "text-caption text-fg-secondary");
    assert.equal(cn("text-label", "text-title"), "text-title");
    assert.equal(cn("rounded-card", "rounded-panel"), "rounded-panel");
  });
});

describe("D14: primitivos", () => {
  const html = (el: React.ReactElement) => renderToStaticMarkup(el);

  test("Switch expõe role=switch, aria-checked e nome acessível", () => {
    const on = html(<Switch checked label="Queimadas" onCheckedChange={() => {}} />);
    assert.match(on, /role="switch"/);
    assert.match(on, /aria-checked="true"/);
    assert.match(on, /aria-label="Queimadas"/);
    assert.match(html(<Switch checked={false} label="x" onCheckedChange={() => {}} />), /aria-checked="false"/);
  });

  test("IconButton usa o label como aria-label e esconde o ícone dos leitores de tela", () => {
    const out = html(<IconButton label="Fechar painel" icon={<svg />} />);
    assert.match(out, /aria-label="Fechar painel"/);
    assert.match(out, /title="Fechar painel"/);
    assert.match(out, /aria-hidden="true"/);
  });

  test("Button: type=button por padrão e variante primária usa o acento", () => {
    const out = html(<Button variant="primary">Ir</Button>);
    assert.match(out, /type="button"/);
    assert.match(out, /bg-accent/);
  });

  test("Chip reflete aria-pressed e só tinge quando ligado", () => {
    const on = html(<Chip pressed tone="cat-war">Guerras</Chip>);
    const off = html(<Chip pressed={false} tone="cat-war">Guerras</Chip>);
    assert.match(on, /aria-pressed="true"/);
    assert.match(on, /bg-cat-war\/10/);
    assert.match(off, /aria-pressed="false"/);
    assert.doesNotMatch(off, /bg-cat-war\/10/);
  });

  test("Badge vazado não depende só da cor e não usa <div> (pode ficar dentro de <p>)", () => {
    const out = html(<Badge tone="warning" dot="hollow">Simulado</Badge>);
    assert.match(out, /border-\[1\.5px\]/);
    assert.doesNotMatch(out, /<div/);
  });

  test("Stat mostra valor, rótulo e fonte; Panel/Card/PanelHeader renderizam", () => {
    const out = html(
      <Panel>
        <PanelHeader title="Observatório" subtitle="2 camadas" />
        <Card selected>
          <Stat label="População" value="[VALOR]" source="Banco Mundial · SP.POP.TOTL · [ANO]" />
        </Card>
      </Panel>
    );
    assert.match(out, /<h2[^>]*>Observatório<\/h2>/);
    assert.match(out, /tabular-nums/);
    assert.match(out, /SP\.POP\.TOTL/);
    assert.match(out, /data-selected="true"/);
  });
});

// Critério de aceite do D14: os componentes migrados não usam cor/tamanho fora dos tokens.
const MIGRATED = [
  "src/components/nav/TopNavBar.tsx",
  "src/components/choropleth/ChoroplethHud.tsx",
  "src/components/observatory/ObservatoryPanel.tsx",
  "src/components/observatory/DataSourceBadge.tsx",
  "src/components/observatory/ObservatoryTelemetryHUD.tsx",
  "src/components/observatory/FirmsLayerControls.tsx",
  "src/components/observatory/FirmsCountrySummary.tsx",
  "src/components/observatory/SatelliteLayerControls.tsx",
  "src/components/observatory/GibsLayerControls.tsx",
  "src/components/observatory/WindLayerControls.tsx",
  "src/components/hud/InspectorHUD.tsx",
  "src/components/hud/CountryHeader.tsx",
  "src/components/hud/CountryMetricsGrid.tsx",
  "src/components/hud/CountryMiniTimeline.tsx",
  "src/components/hud/LiveWeatherWidget.tsx",
  "src/components/hud/LocalClockWidget.tsx",
  "src/components/hud/CosmicInspectorHUD.tsx",
  "src/components/layout/RightDock.tsx",
  "src/components/reader/AnalyticalProfileView.tsx",
  "src/components/reader/CitationModal.tsx",
  "src/components/reader/HoverCardPreview.tsx",
  "src/components/reader/HoverCitationCard.tsx",
  "src/components/reader/ReaderContent.tsx",
  "src/components/reader/ReaderMode.tsx",
  "src/components/reader/ReaderTableOfContents.tsx",
  "src/components/comparator/CountryComparator.tsx",
  "src/components/comparator/ComparisonGrid.tsx",
  "src/components/comparator/ComparisonCharts.tsx",
  "src/components/study/ForkStudyBanner.tsx",
  "src/components/study/StudyExportActions.tsx",
  "src/components/study/StudyShareModal.tsx",
  "src/components/timeline/TimelineBar.tsx",
  "src/components/timeline/TimelineAxis.tsx",
  "src/components/timeline/MilestonePin.tsx",
  "src/components/timeline/PresetSelector.tsx",
  "src/components/timeline/CategoryFilterPills.tsx",
  "src/components/tellus-bridge/StudyContext.tsx",
  "src/components/tellus-bridge/EntityLaunch.tsx",
  "src/components/tellus-bridge/StudyHub.tsx",
  "src/components/globe/HistoricalEraBadge.tsx",
  "src/components/globe/PaleoEraBadge.tsx",
  "src/components/globe/GraphicsQualityPanel.tsx",
  "src/components/scenes/ScenePlayerOverlay.tsx",
  "src/components/globe/CelestialLabel.tsx",
  "src/components/globe/WebGLErrorBoundary.tsx",
  "src/components/shell/GlobalErrorView.tsx",
  "src/components/shell/GlobeExperienceShell.tsx",
  "src/app/page.tsx",
  "src/app/error.tsx",
  "src/app/global-error.tsx",
  "src/app/loading.tsx",
  "src/app/pais/[iso]/page.tsx",
  "src/app/compare/page.tsx",
  "src/app/studies/page.tsx",
  "src/app/study/[slug]/page.tsx",
  "src/app/telluslab/page.tsx",
  "src/app/dossies/[slug]/page.tsx",
  "src/app/not-found.tsx",
  "src/app/dev/ui/page.tsx",
  // Os próprios primitivos também só podem usar tokens.
  ...fs
    .readdirSync(path.join(root, "src/components/ui"))
    .filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"))
    .map((f) => `src/components/ui/${f}`),
];

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black";
const RULES: Array<[string, RegExp]> = [
  ["tamanho de fonte arbitrário", /\btext-\[\d/],
  ["tamanho de fonte fora da escala (xs/sm/base/lg/xl…)", /(?<![\w-])text-(xs|sm|base|lg|[2-9]?xl)\b/],
  ["cor da paleta crua do Tailwind", new RegExp(`(?<![\\w-])(?:[a-z-]+:)*(?:text|bg|border|ring|shadow|from|to|via|fill|stroke|outline|divide|decoration|placeholder)-(?:${PALETTE})(?:-\\d{2,3})?\\b`)],
  ["cor arbitrária em classe", /-\[(?:#|rgb|hsl)/],
  ["cor literal (hex)", /#[0-9a-fA-F]{3,8}\b/],
];

describe("D14: componentes migrados sem cor/tamanho fora dos tokens", () => {
  for (const file of MIGRATED) {
    test(file, () => {
      const src = read(file);
      for (const [name, re] of RULES) {
        const lines = src.split("\n").filter((l) => re.test(l) && !l.trim().startsWith("//") && !l.trim().startsWith("*"));
        assert.equal(lines.length, 0, `${name}:\n${lines.slice(0, 5).join("\n")}`);
      }
    });
  }
});

describe("D20: modais acessíveis (Dialog) e remoção de legados cosmic.*/glass-*", () => {
  test("CitationModal, StudyShareModal, CountryComparator e ReaderMode usam o primitivo Dialog", () => {
    for (const file of [
      "src/components/reader/CitationModal.tsx",
      "src/components/study/StudyShareModal.tsx",
      "src/components/comparator/CountryComparator.tsx",
      "src/components/reader/ReaderMode.tsx",
    ]) {
      const src = read(file);
      assert.match(src, /from\s+["']@\/components\/ui\/Dialog["']/, `${file} deve importar Dialog pelo arquivo`);
      assert.match(src, /<Dialog\b/, `${file} deve usar <Dialog>`);
      assert.match(src, /<DialogContent\b/, `${file} deve usar <DialogContent>`);
    }
  });

  test("paleta legada cosmic.* removida do tailwind.config.ts e classes .glass-* removidas do globals.css", () => {
    const tailwind = read("tailwind.config.ts");
    const css = read("src/styles/globals.css");
    assert.doesNotMatch(tailwind, /\bcosmic\s*:/);
    assert.doesNotMatch(css, /\.glass-panel\b/);
    assert.doesNotMatch(css, /\.glass-button\b/);
  });
});
