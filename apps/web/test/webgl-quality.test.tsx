import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ADAPTIVE_DPR_MIN_SCALE,
  computeEffectiveDpr,
  createAdaptiveFpsState,
  getQualityProfile,
  GRAPHICS_QUALITY_PRESETS,
  GRAPHICS_QUALITY_STORAGE_KEY,
  readStoredQualityPreset,
  stepAdaptiveFps,
  writeStoredQualityPreset,
} from "../src/lib/webgl-quality";
import { pickEarthTextureSet } from "../src/components/globe/EarthSphere";
import { GraphicsQualityPanelView } from "../src/components/globe/GraphicsQualityPanel";
import { useGraphicsQualityStore } from "../src/stores/graphicsQualityStore";

const webRoot = path.resolve(__dirname, "..");

function withMockLocalStorage(fn: (store: Map<string, string>) => void) {
  const store = new Map<string, string>();
  const prevWindow = globalThis.window;
  const mockWindow = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  };
  Object.defineProperty(globalThis, "window", {
    value: mockWindow,
    configurable: true,
    writable: true,
  });
  try {
    fn(store);
  } finally {
    Object.defineProperty(globalThis, "window", {
      value: prevWindow,
      configurable: true,
      writable: true,
    });
  }
}

describe("T39 · Qualidade gráfica adaptativa no WebGL", () => {
  test("1. Presets Auto/Alto/Médio/Baixo definem DPR, texturas 2K/4K, nuvens e densidades", () => {
    assert.deepEqual([...GRAPHICS_QUALITY_PRESETS], ["auto", "high", "medium", "low"]);

    const low = getQualityProfile("low");
    const medium = getQualityProfile("medium");
    const high = getQualityProfile("high");
    const auto = getQualityProfile("auto");

    assert.equal(low.textureTier, "2k");
    assert.equal(low.cloudsEnabled, false);
    assert.equal(low.maxDpr, 1.0);
    assert.ok(low.starDensity < medium.starDensity && medium.starDensity < high.starDensity);

    assert.equal(medium.textureTier, "2k");
    assert.equal(medium.cloudsEnabled, true);
    assert.equal(medium.maxDpr, 1.5);

    assert.equal(high.textureTier, "4k");
    assert.equal(high.cloudsEnabled, true);
    assert.equal(high.maxDpr, 2.0);

    assert.equal(auto.textureTier, "4k");
    assert.equal(auto.minDpr, 0.75);
  });

  test("2. computeEffectiveDpr aplica teto por preset e escala adaptativa sem NaN", () => {
    assert.equal(computeEffectiveDpr(2, "low", 1), 1.0);
    assert.equal(computeEffectiveDpr(2, "medium", 1), 1.5);
    assert.equal(computeEffectiveDpr(3, "high", 1), 2.0);
    assert.equal(computeEffectiveDpr(1, "high", 1), 1.0);

    // Modo Auto reduz DPR proporcionalmente e respeita piso 0.75
    assert.equal(computeEffectiveDpr(2, "auto", 0.7), 1.4);
    assert.equal(computeEffectiveDpr(1, "auto", 0.55), 0.75);
    assert.equal(computeEffectiveDpr(Number.NaN, "auto", Number.NaN), 1.0);
  });

  test("3. Controlador adaptativo rebaixa DPR após janelas sustentadas < 30 fps e recupera com histerese", () => {
    let state = createAdaptiveFpsState();

    // Um único pico baixo (< 30 fps) não rebaixa imediatamente
    state = stepAdaptiveFps(state, 22);
    assert.equal(state.scale, 1.0);
    assert.equal(state.lowStreak, 1);

    // Segunda janela consecutiva < 30 fps dispara o primeiro degrau (-0.15)
    state = stepAdaptiveFps(state, 24);
    assert.equal(state.scale, 0.85);
    assert.equal(state.lowStreak, 0);

    // Quedas sustentadas seguem até o piso ADAPTIVE_DPR_MIN_SCALE sem cair abaixo
    for (let i = 0; i < 10; i++) {
      state = stepAdaptiveFps(state, 18);
    }
    assert.equal(state.scale, ADAPTIVE_DPR_MIN_SCALE);

    // Recuperação exige 4 janelas consecutivas >= 50 fps
    state = stepAdaptiveFps(state, 58);
    state = stepAdaptiveFps(state, 59);
    state = stepAdaptiveFps(state, 60);
    assert.equal(state.scale, ADAPTIVE_DPR_MIN_SCALE);
    state = stepAdaptiveFps(state, 60);
    assert.equal(state.scale, 0.7);
  });

  test("4. pickEarthTextureSet respeita preset 2K/4K e limite de textura da GPU", () => {
    assert.equal(pickEarthTextureSet(8192, "4k").quality, "4k");
    assert.equal(pickEarthTextureSet(8192, "2k").quality, "2k");
    assert.equal(pickEarthTextureSet(4096, "4k").quality, "2k");
    assert.match(pickEarthTextureSet(8192, "2k").day.fallback, /earth_day_2k\.jpg$/);
    assert.match(pickEarthTextureSet(8192, "4k").day.fallback, /earth_day_4k\.jpg$/);
  });

  test("5. Persistência em localStorage salva e hidrata o preset de forma segura", () => {
    withMockLocalStorage((store) => {
      useGraphicsQualityStore.getState().resetQualityState();
      useGraphicsQualityStore.getState().setTelemetry({ adaptiveDprScale: 0.7 });
      useGraphicsQualityStore.getState().setPreset("medium");

      assert.equal(store.get(GRAPHICS_QUALITY_STORAGE_KEY), "medium");
      assert.equal(readStoredQualityPreset(), "medium");
      assert.equal(useGraphicsQualityStore.getState().adaptiveDprScale, 1.0);

      // Valor corrompido cai para "auto"
      store.set(GRAPHICS_QUALITY_STORAGE_KEY, "ultra-999");
      assert.equal(readStoredQualityPreset(), "auto");

      writeStoredQualityPreset("low");
      useGraphicsQualityStore.getState().resetQualityState();
      useGraphicsQualityStore.getState().hydrateFromStorage();
      assert.equal(useGraphicsQualityStore.getState().preset, "low");
      useGraphicsQualityStore.getState().resetQualityState();
    });
  });

  test("6. Painel D14 renderiza presets, telemetria e badge adaptado sem recriar contexto WebGL", () => {
    const html = renderToStaticMarkup(
      <GraphicsQualityPanelView
        preset="auto"
        effectiveDpr={1.4}
        currentFps={27}
        adaptiveDprScale={0.7}
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    assert.match(html, /Qualidade gráfica/);
    assert.match(html, /DPR 1\.40× · 27 fps/);
    assert.match(html, /DPR adaptado/);
    assert.match(html, /graphics-quality-option-auto/);
    assert.match(html, /graphics-quality-option-high/);
    assert.match(html, /graphics-quality-option-medium/);
    assert.match(html, /graphics-quality-option-low/);
    assert.match(html, /aria-checked="true"/);

    // Verifica que o controlador aplica setDpr dinamicamente sem recriar o contexto WebGL
    const controller = fs.readFileSync(
      path.join(webRoot, "src/components/globe/WebGLQualityController.tsx"),
      "utf-8"
    );
    assert.match(controller, /state\.setDpr/);
    assert.doesNotMatch(controller, /setCanvasKey|forceContextLoss/);
  });
});
