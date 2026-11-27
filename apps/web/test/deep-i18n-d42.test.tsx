import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { loadEnMessages, useLocaleStore } from "../src/stores/localeStore";
import { useSceneStore } from "../src/stores/sceneStore";
import { getScene, loadScene } from "../src/lib/scenes/catalog";
import { ScenePlayerOverlay, fmtPartialDate } from "../src/components/scenes/ScenePlayerOverlay";
import { EN_SCENES_PACK, localizeScene } from "../src/lib/i18n/en-scenes";
import { EN_HISTORICAL_ENTITIES, localizeHistoricalCountry } from "../src/lib/i18n/en-historical";
import { EN_PILOT_DOSSIERS, localizePilotDossierSections } from "../src/lib/i18n/en-pilots";
import { HISTORICAL_ENTITIES, PILOT_COUNTRIES, getCountryData } from "../src/lib/country-data";
import { InspectorHUD } from "../src/components/hud/InspectorHUD";
import { ReaderContent } from "../src/components/reader/ReaderContent";
import { HoverCardPreview } from "../src/components/reader/HoverCardPreview";
import { HoverCitationCard } from "../src/components/reader/HoverCitationCard";
import { searchExplore } from "../src/lib/explore/search";

const PLAYABLE_SCENE_IDS = [
  "polo-1271",
  "gama-1497",
  "magellan-1519",
  "glo-1914",
  "glo-1939",
  "glo-1969",
  "glo-1989",
] as const;

function hasDivInsideParagraph(html: string): boolean {
  for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) {
    if (/<div\b/i.test(match[1])) {
      return true;
    }
  }
  return false;
}

describe("D42 · i18n Profundo (Fase 3): Cenas Históricas, Entidades Extintas e Países-Piloto", () => {
  test("1. Todas as 7 cenas publicadas possuem tradução completa de pontos/fases, participantes, crônica e HUD em en-scenes.ts", async () => {
    for (const id of PLAYABLE_SCENE_IDS) {
      await loadScene(id);
      const ptScene = getScene(id);
      assert.ok(ptScene, `Cena ${id} deve existir no catálogo`);
      assert.ok(EN_SCENES_PACK[id], `Cena ${id} deve existir em EN_SCENES_PACK`);

      const enScene = localizeScene(ptScene, "en", EN_SCENES_PACK);
      assert.notEqual(enScene.title, ptScene.title, `${id}: título em inglês deve diferir do português`);
      assert.notEqual(enScene.summary, ptScene.summary, `${id}: resumo em inglês deve diferir do português`);
      assert.ok(enScene.hud, `${id}: hud obrigatório`);
      assert.notEqual(enScene.hud!.progressLabel, ptScene.hud!.progressLabel, `${id}: progressLabel deve estar traduzido`);

      // Participantes e crônica 100% cobertos
      assert.equal(enScene.participants.length, ptScene.participants.length);
      for (let i = 0; i < ptScene.participants.length; i++) {
        assert.notEqual(
          enScene.participants[i].role,
          ptScene.participants[i].role,
          `${id}: role do participante #${i} (${ptScene.participants[i].name}) deve estar em inglês`
        );
      }

      assert.equal(enScene.chronicle.length, ptScene.chronicle.length);
      for (let i = 0; i < ptScene.chronicle.length; i++) {
        assert.notEqual(
          enScene.chronicle[i].text,
          ptScene.chronicle[i].text,
          `${id}: texto da crônica #${i} (${ptScene.chronicle[i].date}) deve estar em inglês`
        );
      }

      // Todos os pontos da superfície ou fases cislunares traduzidos
      const ptTraj = ptScene.trajectories[0];
      const enTraj = enScene.trajectories[0];
      if (ptTraj.kind === "surface" && enTraj.kind === "surface") {
        assert.equal(enTraj.points.length, ptTraj.points.length);
        for (let i = 0; i < ptTraj.points.length; i++) {
          assert.ok(
            enTraj.points[i].description && enTraj.points[i].description !== ptTraj.points[i].description,
            `${id}: descrição do ponto ${ptTraj.points[i].id} deve estar traduzida`
          );
        }
      } else if (ptTraj.kind === "cislunar" && enTraj.kind === "cislunar") {
        assert.notEqual(enTraj.launchSite.name, ptTraj.launchSite.name);
        for (let i = 0; i < ptTraj.phases.length; i++) {
          assert.notEqual(enTraj.phases[i].label, ptTraj.phases[i].label);
          assert.notEqual(enTraj.phases[i].description, ptTraj.phases[i].description);
        }
      }
    }

    assert.equal(fmtPartialDate("1969-07-20", "pt-BR"), "20/07/1969");
    assert.equal(fmtPartialDate("1969-07-20", "en"), "Jul 20, 1969");
    assert.equal(fmtPartialDate("1969-07", "en"), "Jul 1969");
    assert.equal(fmtPartialDate("1271", "en"), "1271");
  });

  test("2. ScenePlayerOverlay renderiza 100% da UI, estatísticas, citações, participantes e crônica em inglês quando locale === 'en'", async () => {
    const dict = await loadEnMessages();
    try {
      useLocaleStore.setState({ locale: "en", enMessages: dict });

      for (const id of PLAYABLE_SCENE_IDS) {
        await loadScene(id);
        useSceneStore.getState().openScene(id);
        useSceneStore.getState().seek(0.5);
        const html = renderToStaticMarkup(<ScenePlayerOverlay sceneId={id} />);

        assert.ok(html.length > 200, `${id}: overlay deve renderizar conteúdo`);
        // Zero rótulos de UI em português remanescentes
        for (const ptLeak of [
          "Minimizar HUD",
          "Fechar cena",
          "Passo anterior",
          "Próximo passo",
          "Reiniciar cena",
          "Reproduzir",
          "Pausar cena",
          "Participantes",
          "Crônica",
          "Distância da Terra",
          "Tempo de missão (GET)",
          "Fases da missão",
          "Fonte:",
        ]) {
          assert.ok(!html.includes(ptLeak), `${id}: vazamento de string PT "${ptLeak}" em locale=en`);
        }
        assert.match(html, /Source:/, `${id}: rodapé deve exibir Source:`);
        assert.match(html, /Participants/, `${id}: resumo de participantes em inglês`);
        assert.match(html, /Chronicle/, `${id}: resumo de crônica em inglês`);
      }

      // Verifica destaques específicos de Magalhães e Apollo 11 em EN
      useSceneStore.getState().openScene("magellan-1519");
      useSceneStore.getState().jumpToStep(6);
      const magEn = renderToStaticMarkup(<ScenePlayerOverlay sceneId="magellan-1519" />);
      assert.match(magEn, /CIRCUMNAVIGATION/);
      assert.match(magEn, /Leagues sailed/);
      assert.match(magEn, /Strait of All Saints/);
      assert.match(magEn, /Ferdinand Magellan/);

      useSceneStore.getState().openScene("glo-1969");
      useSceneStore.getState().seek(0.97);
      const apoEn = renderToStaticMarkup(<ScenePlayerOverlay sceneId="glo-1969" />);
      assert.match(apoEn, /NASA Spaceflight Telemetry/);
      assert.match(apoEn, /Distance from Earth/);
      assert.match(apoEn, /Mission elapsed time \(GET\)/);
      assert.match(apoEn, /Wide view/);
      assert.match(apoEn, /Moon/);
    } finally {
      useSceneStore.getState().closeScene({ restore: false });
      useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
    }
  });

  test("3. Todas as 8 entidades históricas traduzem nomes, regimes, governantes, indicadores e dossiês em InspectorHUD, ReaderContent e Busca", async () => {
    const dict = await loadEnMessages();
    const entityIds = Object.keys(HISTORICAL_ENTITIES);
    assert.equal(entityIds.length, 8);

    try {
      useLocaleStore.setState({ locale: "en", enMessages: dict });

      for (const id of entityIds) {
        assert.ok(EN_HISTORICAL_ENTITIES[id], `Entidade histórica ${id} ausente em EN_HISTORICAL_ENTITIES`);
        const raw = getCountryData(id);
        assert.ok(raw, `getCountryData(${id}) deve resolver`);

        const localized = localizeHistoricalCountry(raw, "en", EN_HISTORICAL_ENTITIES);
        assert.notEqual(localized.nameCommon, raw.nameCommon, `${id}: nameCommon deve estar em inglês`);
        assert.notEqual(localized.governmentType, raw.governmentType, `${id}: governmentType deve estar em inglês`);
        assert.notEqual(localized.leaderTitle, raw.leaderTitle, `${id}: leaderTitle deve estar em inglês`);
        assert.notEqual(localized.summary, raw.summary, `${id}: summary deve estar em inglês`);

        const decodeHtml = (s: string) =>
          s.replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&quot;", '"');
        const inspectorHtml = renderToStaticMarkup(
          <InspectorHUD selectedIso={id} selectedYear={raw.startYear} />
        );
        assert.ok(
          decodeHtml(inspectorHtml).includes(localized.nameCommon),
          `${id}: InspectorHUD deve exibir ${localized.nameCommon}`
        );
        assert.ok(inspectorHtml.includes("Historical Entity"), `${id}: InspectorHUD deve exibir Historical Entity`);
        assert.ok(!inspectorHtml.includes("Entidade Histórica"), `${id}: sem vazamento PT no InspectorHUD`);
        assert.ok(!inspectorHtml.includes("História Geopolítica"), `${id}: região histórica traduzida`);

        for (const sec of raw.dossierSections) {
          const readerHtml = renderToStaticMarkup(
            <ReaderContent country={raw} dimension={sec.dimension} />
          );
          const expectedTitle = EN_HISTORICAL_ENTITIES[id].dossierSections[sec.dimension]?.title;
          assert.ok(expectedTitle, `${id}/${sec.dimension} deve ter título traduzido`);
          assert.ok(
            decodeHtml(readerHtml).includes(expectedTitle),
            `${id}/${sec.dimension}: ReaderContent deve renderizar "${expectedTitle}"`
          );
          assert.equal(hasDivInsideParagraph(readerHtml), false, `${id}/${sec.dimension}: zero <div> dentro de <p>`);
        }
      }

      // Busca ⌘K encontra termos em inglês das entidades históricas
      assert.ok(searchExplore("Kingdom of Prussia").some((r) => r.id === "historical:PRU"));
      assert.ok(searchExplore("Ottoman Empire").some((r) => r.id === "historical:TUR_HIST"));
      assert.ok(searchExplore("Soviet Union").some((r) => r.id === "historical:SUN"));
    } finally {
      useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
    }
  });

  test("4. Os 6 países-piloto (country-pilots.ts) renderizam 100% em inglês no ReaderContent sem <div> dentro de <p>", async () => {
    const dict = await loadEnMessages();
    const pilotIsos = Object.keys(PILOT_COUNTRIES);
    assert.deepEqual(pilotIsos.sort(), ["BRA", "DEU", "EGY", "JPN", "USA", "ZAF"]);

    try {
      useLocaleStore.setState({ locale: "en", enMessages: dict });

      for (const iso of pilotIsos) {
        const raw = getCountryData(iso)!;
        assert.ok(EN_PILOT_DOSSIERS[iso], `Piloto ${iso} deve existir em EN_PILOT_DOSSIERS`);

        const localizedSections = localizePilotDossierSections(iso, raw.dossierSections, "en");
        assert.equal(localizedSections.length, raw.dossierSections.length);

        for (let i = 0; i < raw.dossierSections.length; i++) {
          const ptSec = raw.dossierSections[i];
          const enSec = localizedSections[i];
          assert.notEqual(enSec.title, ptSec.title, `${iso}/${ptSec.dimension}: título deve estar em inglês`);
          assert.notEqual(enSec.contentMarkdown, ptSec.contentMarkdown, `${iso}/${ptSec.dimension}: prosa deve estar em inglês`);
          assert.match(enSec.contentMarkdown, /\[\d+\]/, `${iso}/${ptSec.dimension}: deve preservar notas [1]/[2]`);

          const html = renderToStaticMarkup(
            <ReaderContent country={raw} dimension={ptSec.dimension} />
          );
          assert.ok(html.includes(enSec.title), `${iso}/${ptSec.dimension}: ReaderContent deve exibir título EN`);
          assert.ok(!html.includes(ptSec.title), `${iso}/${ptSec.dimension}: não deve exibir título PT`);
          assert.equal(hasDivInsideParagraph(html), false, `${iso}/${ptSec.dimension}: zero <div> dentro de <p>`);
        }
      }

      // Popovers de fraseamento do Reader (HoverCardPreview e HoverCitationCard) em EN sem <div>
      const previewEn = renderToStaticMarkup(
        <p>
          <HoverCardPreview isoCode="BRA" defaultOpen>
            Brazil
          </HoverCardPreview>
        </p>
      );
      assert.match(previewEn, /Focus on Globe/);
      assert.match(previewEn, /Compare/);
      assert.ok(!previewEn.includes("<div"));

      const citationEn = renderToStaticMarkup(
        <p>
          <HoverCitationCard number={1} source="World Bank" detail="Audited WDI" defaultOpen />
        </p>
      );
      assert.match(citationEn, /Footnote \[1\]/);
      assert.match(citationEn, /Generate Citation/);
      assert.match(citationEn, /Copy ABNT/);
      assert.ok(!citationEn.includes("<div"));
    } finally {
      useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
    }
  });

  test("5. Isolamento de bundle — casca inicial e country-data não importam estaticamente en-scenes, en-historical ou en-pilots", () => {
    for (const rel of [
      "src/components/shell/GlobeExperienceShell.tsx",
      "src/components/nav/TopNavBar.tsx",
      "src/lib/country-data.ts",
    ]) {
      const src = fs.readFileSync(path.resolve(__dirname, "..", rel), "utf-8");
      assert.doesNotMatch(
        src,
        /en-scenes|en-historical|en-pilots/,
        `${rel} não pode importar estaticamente módulos sob demanda de i18n profundo`
      );
    }
  });
});
