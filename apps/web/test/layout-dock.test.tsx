import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { panelButtonAction, resolveRightDock } from "../src/components/layout/useRightDock";
import { RightDock } from "../src/components/layout/RightDock";
import { TimelineBar } from "../src/components/timeline/TimelineBar";
import { TopNavBar } from "../src/components/nav/TopNavBar";
import { CosmicInspectorHUD } from "../src/components/hud/CosmicInspectorHUD";
import { useGlobeStore } from "../src/stores/globeStore";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { useCosmicStore } from "../src/stores/cosmicStore";
import { useLayoutStore } from "../src/stores/layoutStore";

function resetStores() {
  useGlobeStore.setState({ selectedIso: null, isReaderOpen: false });
  useObservatoryStore.setState({ isPanelOpen: false, activeLayers: [] });
  useCosmicStore.getState().resetCosmicState();
  useLayoutStore.setState({ activeRightPanel: null });
}

describe("D15: resolveRightDock (função pura)", () => {
  const base = { countryOpen: false, observatoryOpen: false, cosmosOpen: false, preferred: null };

  test("nada aberto → dock invisível", () => {
    assert.deepEqual(resolveRightDock(base), { open: [], active: null, visible: false });
  });

  test("um painel → ele é o ativo", () => {
    assert.equal(resolveRightDock({ ...base, observatoryOpen: true }).active, "observatory");
  });

  test("vários abertos: ordem fixa das abas e preferência respeitada", () => {
    const r = resolveRightDock({ ...base, countryOpen: true, observatoryOpen: true, cosmosOpen: true, preferred: "cosmos" });
    assert.deepEqual(r.open, ["country", "observatory", "cosmos"]);
    assert.equal(r.active, "cosmos");
  });

  test("preferência por painel fechado cai no primeiro aberto (nunca dock vazio com painel aberto)", () => {
    assert.equal(resolveRightDock({ ...base, countryOpen: true, preferred: "observatory" }).active, "country");
  });
});

describe("D15: RightDock, timeline e navbar", () => {
  beforeEach(resetStores);
  afterEach(resetStores);

  test("um painel aberto: sem abas, só o painel", () => {
    useObservatoryStore.setState({ isPanelOpen: true });
    const html = renderToStaticMarkup(<RightDock />);
    assert.match(html, /data-right-dock="true"/);
    assert.match(html, /data-active-panel="observatory"/);
    assert.doesNotMatch(html, /role="tablist"/);
    assert.match(html, /data-testid="observatory-panel"/);
  });

  test("país + observatório: abas, um painel por vez (nunca sobrepostos)", () => {
    useGlobeStore.setState({ selectedIso: "BRA" });
    useObservatoryStore.setState({ isPanelOpen: true });
    useLayoutStore.setState({ activeRightPanel: "observatory" });
    const html = renderToStaticMarkup(<RightDock />);
    assert.match(html, /role="tablist"/);
    assert.match(html, /data-testid="dock-tab-country"[^>]*>|aria-selected="false"[^>]*data-testid="dock-tab-country"/);
    assert.match(html, />Brasil</);
    assert.match(html, /data-testid="observatory-panel"/);
    assert.doesNotMatch(html, /data-inspector-hud="true"/, "o Inspector não é renderizado ao mesmo tempo");
    useLayoutStore.setState({ activeRightPanel: "country" });
    const html2 = renderToStaticMarkup(<RightDock />);
    assert.match(html2, /data-inspector-hud="true"/);
    assert.doesNotMatch(html2, /data-testid="observatory-panel"/);
  });

  test("dock: coluna direita em lg+, bottom sheet em telas estreitas", () => {
    useObservatoryStore.setState({ isPanelOpen: true });
    const html = renderToStaticMarkup(<RightDock />);
    assert.match(html, /inset-x-2 bottom-2/);
    assert.match(html, /lg:right-5 lg:top-\[4\.75rem\]/);
    assert.match(html, /lg:w-96/);
  });

  test("timeline desvia do dock em lg+ e some em telas estreitas (nunca fica sob um painel)", () => {
    let html = renderToStaticMarkup(<TimelineBar />);
    assert.match(html, /data-side-panel-open="false"/);
    assert.doesNotMatch(html.match(/<footer[^>]+>/)?.[0] ?? "", /max-lg:hidden/);
    useGlobeStore.setState({ selectedIso: "BRA" });
    html = renderToStaticMarkup(<TimelineBar />);
    assert.match(html, /data-side-panel-open="true"/);
    assert.match(html, /lg:right-\[26\.5rem\]/);
    assert.match(html, /max-lg:hidden/);
  });

  test("navbar: Observatório aberto atrás de outra aba vem para frente; ativo → fecha; fechado → abre", () => {
    const dockCountry = resolveRightDock({ countryOpen: true, observatoryOpen: true, cosmosOpen: false, preferred: "country" });
    assert.equal(panelButtonAction("observatory", true, dockCountry), "focus");
    const dockObs = resolveRightDock({ countryOpen: true, observatoryOpen: true, cosmosOpen: false, preferred: "observatory" });
    assert.equal(panelButtonAction("observatory", true, dockObs), "toggle");
    const dockClosed = resolveRightDock({ countryOpen: true, observatoryOpen: false, cosmosOpen: false, preferred: null });
    assert.equal(panelButtonAction("observatory", false, dockClosed), "toggle");
    assert.match(renderToStaticMarkup(<TopNavBar />), /data-testid="top-nav-observatory-button"/);
  });

  test("botão flutuante de camadas cósmicas desvia do dock", () => {
    useCosmicStore.setState({ isCosmicMode: true, focusedBodyId: null, isInspectorOpen: false });
    let html = renderToStaticMarkup(<CosmicInspectorHUD placement="floating" />);
    assert.match(html, /data-testid="cosmic-layers-toggle"/);
    assert.doesNotMatch(html, /lg:right-\[26\.5rem\]/);
    useObservatoryStore.setState({ isPanelOpen: true });
    html = renderToStaticMarkup(<CosmicInspectorHUD placement="floating" />);
    assert.match(html, /lg:right-\[26\.5rem\]/);
    assert.equal(renderToStaticMarkup(<CosmicInspectorHUD placement="dock" />), "", "sem corpo focado, nada no dock");
  });

  test("Inspector cósmico com corpo focado aparece no dock e não flutua", () => {
    useCosmicStore.setState({ isCosmicMode: true, focusedBodyId: "MARS", isInspectorOpen: true });
    assert.match(renderToStaticMarkup(<RightDock />), /data-testid="cosmic-inspector-hud"/);
    const floating = renderToStaticMarkup(<CosmicInspectorHUD placement="floating" />);
    assert.match(floating, /data-testid="cosmic-layers-toggle"/, "o botão de camadas segue disponível");
    assert.doesNotMatch(floating, /data-testid="cosmic-inspector-hud"/, "o painel do corpo fica só no dock");
  });
});

describe("D15: invariantes de layout no código", () => {
  const root = path.resolve(__dirname, "..");
  const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf-8");

  test("painéis laterais não se posicionam sozinhos (quem posiciona é o RightDock)", () => {
    for (const f of ["src/components/hud/InspectorHUD.tsx", "src/components/observatory/ObservatoryPanel.tsx"]) {
      assert.doesNotMatch(read(f), /\bfixed\b/, `${f} não deve usar position: fixed`);
    }
    const cosmic = read("src/components/hud/CosmicInspectorHUD.tsx");
    const drawer = cosmic.slice(cosmic.indexOf('data-testid="cosmic-inspector-hud"'));
    assert.doesNotMatch(drawer.slice(0, 400), /\bfixed\b/, "o painel do corpo focado não usa fixed");
  });

  test("a página não renderiza painéis laterais fora do dock", () => {
    const shell = read("src/components/shell/GlobeExperienceShell.tsx");
    assert.match(shell, /<RightDock closing=\{dockPresence.closing\} \/>/);
    assert.doesNotMatch(shell, /<InspectorHUD\b/);
    assert.doesNotMatch(shell, /<ObservatoryPanel\b/);
    assert.match(shell, /<CosmicInspectorHUD placement="floating" \/>/);
  });

  test("overlays da esquerda ficam abaixo do botão 'Iluminação de estudo' e acima da timeline", () => {
    for (const f of [
      "src/components/scenes/ScenePlayerOverlay.tsx",
      "src/components/tellus-bridge/EntityLaunch.tsx",
    ]) {
      assert.match(read(f), /top-\[var\(--map-overlay-top\)\]/, f);
    }
    for (const f of ["src/components/scenes/ScenePlayerOverlay.tsx"]) {
      assert.match(read(f), /max-h-\[var\(--map-overlay-height\)\]/, f);
    }
  });
});
