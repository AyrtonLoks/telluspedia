import { afterEach, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { clearCelestialFocus, focusCelestialBody, handleCanvasPointerMissed } from "../src/stores/actions";
import { useCosmicStore } from "../src/stores/cosmicStore";
import { useGlobeStore } from "../src/stores/globeStore";
import { useLayoutStore } from "../src/stores/layoutStore";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { CosmicInspectorHUD } from "../src/components/hud/CosmicInspectorHUD";
import { RightDock } from "../src/components/layout/RightDock";

function reset() {
  useCosmicStore.getState().resetCosmicState();
  useGlobeStore.setState({ selectedIso: null, hoveredIso: null, isReaderOpen: false });
  useObservatoryStore.setState({ isPanelOpen: false });
  useLayoutStore.setState({ activeRightPanel: null });
}

describe("D15 (reabertura): Cosmos no dock", () => {
  beforeEach(reset);
  afterEach(reset);

  test("focar a Lua ou a Terra no Cosmos mantém o país selecionado (aba continua no dock)", () => {
    useGlobeStore.setState({ selectedIso: "BRA" });
    useCosmicStore.setState({ isCosmicMode: true });
    focusCelestialBody("MOON");
    assert.equal(useGlobeStore.getState().selectedIso, "BRA");
    assert.equal(useCosmicStore.getState().focusedBodyId, "MOON");
    focusCelestialBody("EARTH");
    assert.equal(useGlobeStore.getState().selectedIso, "BRA");
    const html = renderToStaticMarkup(<RightDock />);
    assert.match(html, /data-testid="dock-tab-country"/);
    assert.match(html, /data-testid="dock-tab-cosmos"/);
  });

  test("clique no vazio no Cosmos desfaz o foco do corpo e preserva o país", () => {
    useGlobeStore.setState({ selectedIso: "BRA" });
    useCosmicStore.setState({ isCosmicMode: true });
    focusCelestialBody("MERCURY");
    handleCanvasPointerMissed();
    assert.equal(useCosmicStore.getState().focusedBodyId, null);
    assert.equal(useCosmicStore.getState().isInspectorOpen, false);
    assert.equal(useGlobeStore.getState().selectedIso, "BRA");
  });

  test("clique no vazio no modo Terra continua deselecionando o país", () => {
    useGlobeStore.setState({ selectedIso: "BRA" });
    handleCanvasPointerMissed();
    assert.equal(useGlobeStore.getState().selectedIso, null);
  });

  test("fechar o painel cósmico deseleciona o corpo (foco e painel)", () => {
    useCosmicStore.setState({ isCosmicMode: true });
    focusCelestialBody("MERCURY");
    clearCelestialFocus();
    assert.equal(useCosmicStore.getState().focusedBodyId, null);
    assert.equal(useCosmicStore.getState().isInspectorOpen, false);
  });

  test("botão “Camadas Cósmicas” continua disponível com um corpo focado", () => {
    useCosmicStore.setState({ isCosmicMode: true });
    focusCelestialBody("MERCURY");
    const html = renderToStaticMarkup(<CosmicInspectorHUD placement="floating" />);
    assert.match(html, /data-testid="cosmic-layers-toggle"/);
    assert.match(html, /lg:right-\[26\.5rem\]/, "desvia do dock, que está aberto com o corpo focado");
    assert.doesNotMatch(html, /data-testid="cosmic-inspector-hud"/, "o painel do corpo fica no dock, não flutua");
  });

  test("no código: Lua, Terra, canvas e X do painel usam as ações (sem zerar o país)", () => {
    const root = path.resolve(__dirname, "..");
    const read = (f: string) => fs.readFileSync(path.join(root, f), "utf-8");
    const moon = read("src/components/globe/OrbitingMoon.tsx");
    assert.match(moon, /focusCelestialBody\("MOON"\)/);
    assert.doesNotMatch(moon, /setSelectedIso\(null\)/);
    assert.match(read("src/components/globe/GlobeCanvas.tsx"), /handleCanvasPointerMissed/);
    assert.match(read("src/components/hud/CosmicInspectorHUD.tsx"), /onClick=\{clearCelestialFocus\}/);
  });
});
