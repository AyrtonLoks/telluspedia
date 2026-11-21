/**
 * T31 — Resiliência de runtime: Error Boundaries (error.tsx/global-error.tsx/loading.tsx),
 * WebGLErrorBoundary com fallback navegável sem GPU e listeners webglcontextlost/restored.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, test } from "node:test";
import RouteError from "../src/app/error";
import RootLoading from "../src/app/loading";
import { GlobalErrorView } from "../src/components/shell/GlobalErrorView";
import {
  WebGLErrorBoundary,
  WebGLFallbackPanel,
} from "../src/components/globe/WebGLErrorBoundary";
import {
  attachWebGLContextListeners,
  detectWebGLSupport,
  type CanvasCreator,
} from "../src/lib/webgl-support";

const webRoot = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(webRoot, rel), "utf-8");

describe("T31 · Detecção de suporte WebGL e ciclo de vida do contexto", () => {
  test("detectWebGLSupport identifica webgl2, webgl1, libera contexto de sondagem e trata falhas", () => {
    let lostCount = 0;
    const fakeDocWebGL2: CanvasCreator = {
      createElement: () => ({
        getContext: (id) =>
          id === "webgl2"
            ? {
                getExtension: (name) =>
                  name === "WEBGL_lose_context"
                    ? { loseContext: () => { lostCount += 1; } }
                    : null,
              }
            : null,
      }),
    };
    assert.deepEqual(detectWebGLSupport(fakeDocWebGL2), {
      supported: true,
      version: "webgl2",
      reason: "ok",
    });
    assert.equal(lostCount, 1, "contexto de sondagem deve ser liberado após teste");

    const fakeDocWebGL1: CanvasCreator = {
      createElement: () => ({
        getContext: (id) => (id === "webgl" ? {} : null),
      }),
    };
    assert.deepEqual(detectWebGLSupport(fakeDocWebGL1), {
      supported: true,
      version: "webgl",
      reason: "ok",
    });

    const fakeDocNoContext: CanvasCreator = {
      createElement: () => ({
        getContext: () => null,
      }),
    };
    assert.deepEqual(detectWebGLSupport(fakeDocNoContext), {
      supported: false,
      version: null,
      reason: "no-context",
    });

    const fakeDocThrows: CanvasCreator = {
      createElement: () => ({
        getContext: () => {
          throw new Error("GPU driver crash");
        },
      }),
    };
    assert.deepEqual(detectWebGLSupport(fakeDocThrows), {
      supported: false,
      version: null,
      reason: "exception",
    });

    assert.deepEqual(detectWebGLSupport(null), {
      supported: false,
      version: null,
      reason: "no-canvas",
    });
  });

  test("attachWebGLContextListeners chama preventDefault em webglcontextlost, sinaliza restauração e limpa listeners", () => {
    const target = new EventTarget();
    let lostCalls = 0;
    let restoredCalls = 0;

    const detach = attachWebGLContextListeners(target, {
      onLost: () => {
        lostCalls += 1;
      },
      onRestored: () => {
        restoredCalls += 1;
      },
    });

    const lostEvent = new Event("webglcontextlost", { cancelable: true });
    target.dispatchEvent(lostEvent);
    assert.equal(lostEvent.defaultPrevented, true, "preventDefault obrigatório para permitir restauração");
    assert.equal(lostCalls, 1);

    target.dispatchEvent(new Event("webglcontextrestored"));
    assert.equal(restoredCalls, 1);

    detach();
    target.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
    target.dispatchEvent(new Event("webglcontextrestored"));
    assert.equal(lostCalls, 1);
    assert.equal(restoredCalls, 1);
  });
});

describe("T31 · Error Boundaries do App Router e Loading D14", () => {
  test("error.tsx renderiza alerta D14 com recuperação e sem expor detalhes internos da exceção", () => {
    const err = Object.assign(new Error("SENSITIVE_INTERNAL_STACK_DETAIL"), {
      digest: "DIGEST-9981",
    });
    const html = renderToStaticMarkup(<RouteError error={err} reset={() => {}} />);

    assert.match(html, /data-testid="route-error-boundary"/);
    assert.match(html, /role="alert"/);
    assert.match(html, /Tentar novamente/);
    assert.match(html, /Voltar ao globo/);
    assert.match(html, /href="\/compare"/);
    assert.match(html, /href="\/telluslab"/);
    assert.match(html, /DIGEST-9981/);
    assert.doesNotMatch(html, /SENSITIVE_INTERNAL_STACK_DETAIL/);
  });

  test("global-error.tsx importa globals.css e renderiza documento raiz com tokens D14 e recuperação", () => {
    const src = read("src/app/global-error.tsx");
    assert.match(src, /import\s+["']@\/styles\/globals\.css["']/);
    assert.match(src, /GlobalErrorView/);

    const err = Object.assign(new Error("ROOT_SECRET_TRACE"), { digest: "GLOBAL-42" });
    const html = renderToStaticMarkup(<GlobalErrorView error={err} reset={() => {}} />);

    assert.match(html, /<html[^>]+lang="pt-BR"/);
    assert.match(html, /data-testid="global-error-boundary"/);
    assert.match(html, /role="alert"/);
    assert.match(html, /Tentar novamente/);
    assert.match(html, /GLOBAL-42/);
    assert.doesNotMatch(html, /ROOT_SECRET_TRACE/);
  });

  test("loading.tsx renderiza status acessível com tokens D14", () => {
    const html = renderToStaticMarkup(<RootLoading />);
    assert.match(html, /data-testid="app-loading"/);
    assert.match(html, /role="status"/);
    assert.match(html, /Carregando TellusPedia/);
  });
});

describe("T31 · WebGLErrorBoundary e integração com GlobeCanvas / GlobeExperienceShell", () => {
  test("WebGLErrorBoundary renderiza filhos quando suportado e fallback navegável quando sem GPU", () => {
    const supportedHtml = renderToStaticMarkup(
      <WebGLErrorBoundary probeWebGL={() => ({ supported: true, version: "webgl2", reason: "ok" })}>
        <div data-testid="fake-globe">Globo ativo</div>
      </WebGLErrorBoundary>
    );
    assert.match(supportedHtml, /data-testid="fake-globe"/);
    assert.doesNotMatch(supportedHtml, /data-testid="webgl-fallback"/);

    const unsupportedHtml = renderToStaticMarkup(
      <WebGLErrorBoundary probeWebGL={() => ({ supported: false, version: null, reason: "no-context" })}>
        <div data-testid="fake-globe">Globo ativo</div>
      </WebGLErrorBoundary>
    );
    assert.match(unsupportedHtml, /data-testid="webgl-fallback"/);
    assert.match(unsupportedHtml, /data-fallback-reason="unsupported"/);
    assert.match(unsupportedHtml, /Recarregar contexto 3D/);
    assert.match(unsupportedHtml, /Busca universal/);
    assert.match(unsupportedHtml, /Comparador/);
    assert.match(unsupportedHtml, /href="\/telluslab"/);
    assert.match(unsupportedHtml, /Brasil/);
    assert.doesNotMatch(unsupportedHtml, /data-testid="fake-globe"/);

    const renderErrHtml = renderToStaticMarkup(
      <WebGLFallbackPanel reason="render-error" onRetry={() => {}} />
    );
    assert.match(renderErrHtml, /data-fallback-reason="render-error"/);
    assert.match(renderErrHtml, /Contexto 3D interrompido/);
  });

  test("GlobeExperienceShell envolve GlobeCanvas em WebGLErrorBoundary e GlobeCanvas trata webglcontextlost/restored", () => {
    const shell = read("src/components/shell/GlobeExperienceShell.tsx");
    assert.match(shell, /<WebGLErrorBoundary>[\s\S]*?<GlobeCanvas\b[\s\S]*?<\/WebGLErrorBoundary>/);

    const canvas = read("src/components/globe/GlobeCanvas.tsx");
    assert.match(canvas, /attachWebGLContextListeners/);
    assert.match(canvas, /<WebGLContextMonitor\b/);
    assert.match(canvas, /data-testid="webgl-context-lost-banner"/);
    assert.match(canvas, /data-testid="webgl-context-restored-banner"/);
  });
});
