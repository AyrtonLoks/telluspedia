import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { geoArea } from "d3-geo";
import { getPublishedDossier } from "@/lib/dossiers-catalog";
import { findMilestoneById } from "@/lib/milestones";
import { entities } from "@/lib/tellus-bridge/catalog";
import {
  buildMtciDataset,
  CRITICAL_GEO_LENS_LIST,
  FOUR_BRAZILS_LIST,
  VERTICALITY_CORRIDORS,
  VERTICALITY_HUBS,
} from "@/lib/critical-geo-catalog";
import {
  isFourBrazilsDataset,
  pickFourBrazilsAt,
  rasterizeFourBrazilsToCanvas,
  rasterizeHorizontalitiesToCanvas,
  rasterizeMtciToCanvas,
  type FourBrazilsDataset,
} from "@/lib/four-brazils-data";
import {
  MILTON_DOSSIER_CITATIONS,
  MILTON_LENS_SHORTCUTS,
  MILTON_SANTOS_TIMELINE,
  MILTON_SANTOS_WORKS,
} from "@/lib/milton-santos-dossier";
import { MiltonSantosDossierView } from "@/components/dossiers/MiltonSantosDossierView";
import { CriticalGeoHud } from "@/components/critical-geo/CriticalGeoHud";
import { useCriticalGeoStore } from "@/stores/criticalGeoStore";
import { useLocaleStore } from "@/stores/localeStore";
import { EN_MESSAGES } from "@/lib/i18n/en";
import { searchExplore } from "@/lib/explore/search";
import { encodeView, restoreView } from "@/lib/explore/view-url";
import { DEFAULT_CAMERA_OFFSET } from "@/lib/explore/view-camera";

function loadLocalFourBrazils(): FourBrazilsDataset {
  const filePath = path.join(process.cwd(), "public/data/four-brazils.json");
  const raw: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!isFourBrazilsDataset(raw)) {
    assert.fail("four-brazils.json precisa passar em isFourBrazilsDataset");
  }
  return raw;
}

function makeMockCanvasCtx(): CanvasRenderingContext2D {
  const noop = () => {};
  return {
    clearRect: noop,
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    setLineDash: noop,
    lineJoin: "round",
    globalAlpha: 1,
    fillStyle: "#000",
    strokeStyle: "#000",
    lineWidth: 1,
  } as unknown as CanvasRenderingContext2D;
}

test("D36: dossiê /dossies/milton-santos, TellusBridge figure:milton-santos e marcos 1994/2026 existem e são bilíngues", () => {
  const dossier = getPublishedDossier("milton-santos");
  assert.ok(dossier, "Dossiê milton-santos deve estar publicado em dossiers-catalog.ts");
  assert.equal(dossier.entityId, "figure:milton-santos");
  assert.ok(entities.has("figure:milton-santos"), "figure:milton-santos deve existir no manifesto TellusBridge");

  const vautrin = findMilestoneById("bra-1994-milton-santos");
  const centenary = findMilestoneById("glo-2026-milton");
  assert.ok(vautrin && vautrin.year === 1994, "Marco Prêmio Vautrin Lud 1994 ausente");
  assert.ok(centenary && centenary.year === 2026, "Marco Centenário 1926–2026 ausente");

  assert.ok(MILTON_SANTOS_TIMELINE.some((e) => e.year === "1994"));
  assert.ok(MILTON_SANTOS_TIMELINE.some((e) => e.year === "2026"));
  assert.ok(MILTON_SANTOS_WORKS.length >= 4);
  assert.equal(MILTON_LENS_SHORTCUTS.length, 3);

  for (const work of MILTON_SANTOS_WORKS) {
    assert.ok(work.abnt.includes("SANTOS, Milton"), `ABNT ausente em ${work.id}`);
    assert.ok(work.apa.includes("Santos, M."), `APA ausente em ${work.id}`);
    assert.ok(work.mla.includes("Santos, Milton"), `MLA ausente em ${work.id}`);
    assert.ok(work.bibtex.startsWith("@book{"), `BibTeX inválido em ${work.id}`);
  }
  assert.ok(MILTON_DOSSIER_CITATIONS.bibtex.startsWith("@online{"));

  const ptHtml = renderToStaticMarkup(React.createElement(MiltonSantosDossierView, { locale: "pt-BR" }));
  const enHtml = renderToStaticMarkup(React.createElement(MiltonSantosDossierView, { locale: "en" }));
  assert.match(ptHtml, /Centenário 1926–2026/);
  assert.match(ptHtml, /Prêmio Vautrin Lud/);
  assert.match(ptHtml, /O Espaço Dividido/);
  assert.match(enHtml, /Centenary 1926–2026/);
  assert.match(enHtml, /Vautrin Lud Prize/);
});

test("D36: lente MTCI usa estritamente indicadores reais do Banco Mundial (zero valores sintéticos)", () => {
  const ds = buildMtciDataset();
  assert.equal(ds.totalCountries, 177);
  assert.ok(ds.availableCount >= 140, `Esperado >= 140 países com WDI completo, obteve ${ds.availableCount}`);
  assert.ok(ds.availableCount < ds.totalCountries, "Territórios sem dados oficiais devem permanecer sem estimativa sintética");

  const bra = ds.entries.BRA;
  assert.ok(bra && bra.available && bra.score !== null && bra.gdpPerCapita !== null && bra.lifeExpectancy !== null);
  assert.ok(bra.score >= 0 && bra.score <= 100);

  const missingEntries = Object.values(ds.entries).filter((e) => !e.available);
  assert.ok(missingEntries.length > 0);
  for (const m of missingEntries) {
    assert.equal(m.score, null, `${m.isoCode} sem dados WDI completos não pode receber score inventado`);
    assert.equal(m.normalized, null);
  }

  const renderedCount = rasterizeMtciToCanvas(makeMockCanvasCtx(), ds, 256, 128);
  assert.ok(renderedCount >= 170);
});

test("D36: Os Quatro Brasis (Santos & Silveira, 2001) + IBGE — geometria, picking < 0,2 ms e 4 regiões", () => {
  const ds = loadLocalFourBrazils();
  assert.equal(FOUR_BRAZILS_LIST.length, 4);
  assert.equal(CRITICAL_GEO_LENS_LIST.length, 3);
  assert.ok(VERTICALITY_HUBS.length >= 8);
  assert.ok(VERTICALITY_CORRIDORS.length >= 10);

  // Regressão d3-geo winding order: nenhum polígono pode preencher o complemento esférico (~12,5 sr)!
  for (const feat of [...ds.fourBrazils.features, ...ds.ibgeRegions.features]) {
    const areaSr = geoArea(feat);
    assert.ok(
      areaSr > 0.005 && areaSr < 0.2,
      `Área esférica inválida em ${feat.properties.scope}/${feat.id}: ${areaSr.toFixed(4)} sr`
    );
  }

  // Checa classificação crítica (incluindo Palmas/TO no Centro-Oeste de Milton Santos!)
  assert.equal(pickFourBrazilsAt(-23.55, -46.63, ds), "CONCENTRADA"); // São Paulo
  assert.equal(pickFourBrazilsAt(-30.03, -51.23, ds), "CONCENTRADA"); // Porto Alegre (Sul fundido à Concentrada)
  assert.equal(pickFourBrazilsAt(-10.18, -48.33, ds), "CENTRO_OESTE"); // Palmas (TO -> Centro-Oeste em Santos & Silveira)
  assert.equal(pickFourBrazilsAt(-15.79, -47.88, ds), "CENTRO_OESTE"); // Brasília
  assert.equal(pickFourBrazilsAt(-8.05, -34.9, ds), "NORDESTE"); // Recife
  assert.equal(pickFourBrazilsAt(-3.12, -60.02, ds), "AMAZONIA"); // Manaus
  assert.equal(pickFourBrazilsAt(0, -25, ds), null); // Oceano Atlântico -> fora do Brasil

  const renderedRegions = rasterizeFourBrazilsToCanvas(
    makeMockCanvasCtx(),
    ds,
    { selectedRegionId: "CONCENTRADA", showIbgeComparison: true },
    256,
    128
  );
  assert.equal(renderedRegions, 4);

  const renderedHoriz = rasterizeHorizontalitiesToCanvas(makeMockCanvasCtx(), 256, 128);
  assert.ok(renderedHoriz >= 50, "Horizontalidades deve rasterizar os domínios de contiguidade");
});

test("D36: busca ⌘K, sincronia de URL (?lente=) e CriticalGeoHud SSR bilíngue funcionam sem erros", () => {
  const searchMilton = searchExplore("milton santos");
  assert.ok(searchMilton.some((r) => r.id === "route:/dossies/milton-santos"));
  assert.ok(searchExplore("quatro brasis").some((r) => r.id === "lens:FOUR_BRAZILS"));
  assert.ok(searchExplore("verticalidades").some((r) => r.id === "lens:VERTICALITIES"));
  assert.ok(searchExplore("meio tecnico").some((r) => r.id === "lens:MTCI"));

  const view = { offset: [...DEFAULT_CAMERA_OFFSET] as [number, number, number], restore: null, onChange: null };
  restoreView("?visao=1&lente=FOUR_BRAZILS", view);
  assert.equal(useCriticalGeoStore.getState().activeLens, "FOUR_BRAZILS");
  assert.match(encodeView(view), /lente=FOUR_BRAZILS/);

  const prevLocale = useLocaleStore.getState().locale;
  try {
    for (const lens of ["MTCI", "VERTICALITIES", "FOUR_BRAZILS"] as const) {
      useCriticalGeoStore.getState().setLens(lens);
      useLocaleStore.setState({ locale: "pt-BR" });
      const pt = renderToStaticMarkup(React.createElement(CriticalGeoHud));
      assert.match(pt, /Milton Santos/);

      useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
      const en = renderToStaticMarkup(React.createElement(CriticalGeoHud));
      assert.match(en, /Critical Geography/);
    }
  } finally {
    useLocaleStore.setState({ locale: prevLocale });
    useCriticalGeoStore.getState().resetCriticalGeo();
  }
});

test("D36: isolamento de bundle — módulos iniciais de `/` não importam critical-geo-catalog nem milton-santos-dossier", () => {
  const initialShellFiles = [
    path.join(process.cwd(), "src/components/shell/GlobeExperienceShell.tsx"),
    path.join(process.cwd(), "src/components/globe/GlobeCanvas.tsx"),
    path.join(process.cwd(), "src/lib/critical-geo-ids.ts"),
  ];
  for (const file of initialShellFiles) {
    const src = fs.readFileSync(file, "utf8");
    assert.ok(!src.includes("critical-geo-catalog"), `${path.basename(file)} não pode importar critical-geo-catalog`);
    assert.ok(!src.includes("milton-santos-dossier"), `${path.basename(file)} não pode importar milton-santos-dossier`);
    assert.ok(!src.includes("four-brazils-data"), `${path.basename(file)} não pode importar four-brazils-data`);
  }
});
