/**
 * T41 — o botão Observatório (e o mapa temático) da barra superior sai do servidor com o mesmo
 * estado que a hidratação vê: o estudo da rota já aplicado aos stores.
 */
import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TopNavBar } from "../src/components/nav/TopNavBar";
import { applyInitialGlobeState } from "../src/components/shell/GlobeExperienceShell";
import { useObservatoryStore } from "../src/stores/observatoryStore";
import { useChoroplethStore } from "../src/stores/choroplethStore";
import { useStoreSnapshot } from "../src/lib/use-hydrated";
import { sanitizeStudy } from "../src/lib/study-schema";
import type { StudyRecord } from "../src/lib/studies-store";

const button = (html: string, testid: string) => html.match(new RegExp(`<button[^>]*data-testid="${testid}"[^>]*>`))?.[0] ?? "";

describe("T41 · estado do estudo no HTML do servidor", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    useObservatoryStore.getState().resetObservatory();
    useChoroplethStore.getState().resetChoropleth();
  });

  test("useStoreSnapshot lê o estado atual no servidor (o hook do Zustand daria o inicial)", () => {
    useObservatoryStore.setState({ activeLayers: ["NASA_FIRMS"] });
    const Probe = () => {
      const snap = useStoreSnapshot(useObservatoryStore, (s) => s.activeLayers.length);
      const hook = useObservatoryStore((s) => s.activeLayers.length);
      return React.createElement("i", null, `${snap}/${hook}`);
    };
    assert.equal(renderToStaticMarkup(React.createElement(Probe)), "<i>1/0</i>");
  });

  test("estudo com camada do Observatório e mapa temático: botões já destacados no SSR", () => {
    globalThis.fetch = (async () => new Response("x", { status: 503 })) as typeof fetch;
    const record: StudyRecord = {
      ...sanitizeStudy({ title: "Queimadas", activeObservatoryLayers: ["NASA_FIRMS"], choroplethIndicator: "SP.DYN.LE00.IN" }),
      id: "estudo-t41",
      createdAt: "2026-11-21T00:00:00.000Z",
    };
    const plain = renderToStaticMarkup(React.createElement(TopNavBar));
    assert.doesNotMatch(button(plain, "top-nav-observatory-button"), /bg-accent\/15/);

    applyInitialGlobeState({ kind: "study", study: record });
    const html = renderToStaticMarkup(React.createElement(TopNavBar));
    assert.match(button(html, "top-nav-observatory-button"), /bg-accent\/15/, "Observatório destacado");
    assert.match(button(html, "top-nav-choropleth-button"), /aria-pressed="true"/, "Mapa temático ativo");
  });

  test("o shell aplica o estado da rota no render também na hidratação inicial do cliente", () => {
    const shell = fs.readFileSync(path.join(__dirname, "../src/components/shell/GlobeExperienceShell.tsx"), "utf-8");
    assert.match(shell, /typeof window === "undefined" \|\| !clientHydrated/);
    const nav = fs.readFileSync(path.join(__dirname, "../src/components/nav/TopNavBar.tsx"), "utf-8");
    assert.doesNotMatch(nav, /typeof window === "undefined"/, "a barra não usa mais o ramo servidor/cliente");
  });
});
