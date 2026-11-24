/**
 * T46 — PWA Offline-ready: Service Worker versionado (`public/sw.js`), limpeza de caches antigos,
 * estratégias de cache sem interferir em `/basis/ktx2-worker.js` nem em `/api/*`, cabeçalhos CSP
 * e indicador discreto D14 bilíngue de modo offline.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import nextConfigFactory from "../next.config.mjs";
import { SERVICE_WORKER_PATH, serviceWorkerHeaders } from "../security-headers.mjs";
import {
  SW_PAGE_CACHE,
  SW_PATH,
  SW_PRECACHE_URLS,
  SW_STATIC_CACHE,
  cachesToPrune,
  classifySwRequest,
} from "../src/lib/pwa/sw-policy";
import { OfflineIndicator } from "../src/components/pwa/PwaLifecycle";
import { useLocaleStore } from "../src/stores/localeStore";
import { EN_MESSAGES } from "../src/lib/i18n/en";

const webRoot = path.resolve(__dirname, "..");

interface MockResponse {
  ok: boolean;
  status: number;
  type: string;
  headers: Headers;
  bodyText: string;
  clone: () => MockResponse;
}

function mockResponse(
  bodyText: string,
  init: { status?: number; contentType?: string; type?: string } = {}
): MockResponse {
  const status = init.status ?? 200;
  const headers = new Headers(
    init.contentType ? { "content-type": init.contentType } : {}
  );
  const type = init.type ?? "basic";
  const res: MockResponse = {
    ok: status >= 200 && status < 300,
    status,
    type,
    headers,
    bodyText,
    clone: () => mockResponse(bodyText, { status, contentType: init.contentType, type }),
  };
  return res;
}

function loadServiceWorkerRuntime(fetchHandler: (input: string | { url: string }) => Promise<MockResponse>) {
  const swSource = fs.readFileSync(path.join(webRoot, "public/sw.js"), "utf-8");
  const listeners = new Map<string, Array<(event: Record<string, unknown>) => void>>();
  const store = new Map<string, Map<string, MockResponse>>();

  const cachesMock = {
    async open(name: string) {
      let bucket = store.get(name);
      if (!bucket) {
        bucket = new Map();
        store.set(name, bucket);
      }
      return {
        async match(req: string | { url: string }) {
          const key = typeof req === "string" ? req : req.url;
          const pathnameKey = key.startsWith("http") ? new URL(key).pathname : key;
          return bucket!.get(key) ?? bucket!.get(pathnameKey);
        },
        async put(req: string | { url: string }, res: MockResponse) {
          const key = typeof req === "string" ? req : req.url;
          bucket!.set(key, res);
        },
      };
    },
    async keys() {
      return [...store.keys()];
    },
    async delete(name: string) {
      return store.delete(name);
    },
  };

  let skippedWaiting = false;
  let claimedClients = false;

  const sandbox: Record<string, unknown> = {
    URL,
    Headers,
    Response,
    caches: cachesMock,
    fetch: fetchHandler,
    location: new URL("https://telluspedia.example/sw.js"),
    skipWaiting: async () => {
      skippedWaiting = true;
    },
    clients: {
      claim: async () => {
        claimedClients = true;
      },
    },
    addEventListener: (type: string, fn: (event: Record<string, unknown>) => void) => {
      const list = listeners.get(type) ?? [];
      list.push(fn);
      listeners.set(type, list);
    },
  };
  sandbox.self = sandbox;

  vm.runInNewContext(swSource, sandbox, { filename: "public/sw.js" });

  return {
    store,
    get skippedWaiting() {
      return skippedWaiting;
    },
    get claimedClients() {
      return claimedClients;
    },
    async triggerLifecycle(type: "install" | "activate") {
      const waits: Promise<unknown>[] = [];
      for (const fn of listeners.get(type) ?? []) {
        fn({
          waitUntil: (p: Promise<unknown>) => waits.push(p),
        });
      }
      await Promise.all(waits);
    },
    async dispatchFetch(request: { url: string; method?: string; mode?: string }): Promise<unknown> {
      let responded: Promise<unknown> | null = null;
      const req = { method: "GET", mode: "cors", ...request };
      for (const fn of listeners.get("fetch") ?? []) {
        fn({
          request: req,
          respondWith: (p: Promise<unknown>) => {
            responded = p;
          },
        });
      }
      return responded ? await (responded as Promise<unknown>) : null;
    },
  };
}

describe("T46 · Service Worker PWA e política de cache versionado", () => {
  test("política de classificação protege KTX2 worker, APIs e 4K enquanto faz cache-first do núcleo", () => {
    assert.equal(classifySwRequest("/data/countries-ne-110m.json"), "cache-first");
    assert.equal(classifySwRequest("/data/countries-worldbank-indicators.json"), "cache-first");
    assert.equal(classifySwRequest("/data/worldbank-timeseries.json"), "cache-first");
    assert.equal(classifySwRequest("/textures/earth_day_2k.ktx2"), "cache-first");
    assert.equal(classifySwRequest("/textures/paleo/paleo_250ma.webp"), "cache-first");
    assert.equal(classifySwRequest("/_next/static/chunks/main.js"), "cache-first");
    assert.equal(classifySwRequest("/flags/br.svg"), "cache-first");

    // Nunca interceptar worker KTX2, APIs, texturas 4K, POST nem terceiros
    assert.equal(classifySwRequest("/basis/ktx2-worker.js"), "bypass");
    assert.equal(classifySwRequest("/basis/basis_transcoder.wasm"), "bypass");
    assert.equal(classifySwRequest("/api/studies"), "bypass");
    assert.equal(classifySwRequest("/api/observatory/firms"), "bypass");
    assert.equal(classifySwRequest("/api/weather"), "bypass");
    assert.equal(classifySwRequest("/textures/earth_day_4k.ktx2"), "bypass");
    assert.equal(classifySwRequest("/sw.js"), "bypass");
    assert.equal(classifySwRequest("/data/countries-ne-110m.json", { method: "POST" }), "bypass");
    assert.equal(classifySwRequest("/data/countries-ne-110m.json", { sameOrigin: false }), "bypass");

    // Navegações HTML usam network-first
    assert.equal(classifySwRequest("/", { mode: "navigate" }), "network-first");
    assert.equal(classifySwRequest("/telluslab", { mode: "navigate" }), "network-first");

    assert.deepEqual(
      cachesToPrune(["telluspedia-static-v0", "telluspedia-pages-v0", SW_STATIC_CACHE, "other-app-v1"]),
      ["telluspedia-static-v0", "telluspedia-pages-v0"]
    );
  });

  test("public/sw.js faz precache na instalação, limpa caches antigos na ativação e isola /basis e /api", async () => {
    const fetchedUrls: string[] = [];
    let failNetwork = false;

    const sw = loadServiceWorkerRuntime(async (input) => {
      const url = typeof input === "string" ? input : input.url;
      fetchedUrls.push(url);
      if (failNetwork) throw new TypeError("Failed to fetch");
      if (url.endsWith("/")) {
        return mockResponse("<html><body>Home</body></html>", { contentType: "text/html" });
      }
      if (url.endsWith("/studies")) {
        return mockResponse("<html><body>Studies</body></html>", { contentType: "text/html" });
      }
      return mockResponse(`payload:${url}`, { contentType: "application/json" });
    });

    // Pré-popula caches de versão antiga + cache externo não pertencente ao TellusPedia
    sw.store.set("telluspedia-static-v0", new Map([["/old", mockResponse("old")]]));
    sw.store.set("telluspedia-pages-v0", new Map([["/old-page", mockResponse("old")]]));
    sw.store.set("unrelated-cache", new Map([["/keep", mockResponse("keep")]]));

    await sw.triggerLifecycle("install");
    assert.equal(sw.skippedWaiting, true);
    const staticBucket = sw.store.get(SW_STATIC_CACHE);
    assert.ok(staticBucket, "cache estático versionado criado");
    for (const asset of SW_PRECACHE_URLS) {
      assert.ok(staticBucket.has(asset), `precache deve incluir ${asset}`);
    }

    await sw.triggerLifecycle("activate");
    assert.equal(sw.claimedClients, true);
    assert.equal(sw.store.has("telluspedia-static-v0"), false, "cache estático antigo removido");
    assert.equal(sw.store.has("telluspedia-pages-v0"), false, "cache de páginas antigo removido");
    assert.equal(sw.store.has("unrelated-cache"), true, "cache de terceiros preservado");

    // Rotas ignoradas retornam null (SW não chama respondWith)
    for (const bypassedUrl of [
      "https://telluspedia.example/basis/ktx2-worker.js",
      "https://telluspedia.example/api/studies",
      "https://telluspedia.example/api/observatory/firms",
      "https://telluspedia.example/textures/earth_day_4k.ktx2",
      "https://flagcdn.com/w40/br.png",
    ]) {
      assert.equal(await sw.dispatchFetch({ url: bypassedUrl }), null, `${bypassedUrl} não deve ser interceptado`);
    }

    // Cache-first: segunda leitura vem do cache mesmo offline
    const callsBefore = fetchedUrls.length;
    const cachedData = (await sw.dispatchFetch({
      url: "https://telluspedia.example/data/countries-ne-110m.json",
    })) as MockResponse;
    assert.equal(cachedData.bodyText, "payload:/data/countries-ne-110m.json");
    assert.equal(fetchedUrls.length, callsBefore, "hit de cache-first sem ir à rede");

    // Network-first: visita `/` online grava no PAGE_CACHE; `/studies` não é cacheada
    await sw.dispatchFetch({ url: "https://telluspedia.example/", mode: "navigate" });
    await sw.dispatchFetch({ url: "https://telluspedia.example/studies", mode: "navigate" });
    const pageBucket = sw.store.get(SW_PAGE_CACHE);
    assert.ok(pageBucket?.has("https://telluspedia.example/"));
    assert.equal(pageBucket?.has("https://telluspedia.example/studies"), false);

    // Offline: navegação devolve `/` em cache
    failNetwork = true;
    const offlineHome = (await sw.dispatchFetch({
      url: "https://telluspedia.example/",
      mode: "navigate",
    })) as MockResponse;
    assert.equal(offlineHome.bodyText, "<html><body>Home</body></html>");

    // Offline sem `/` em cache: devolve fallback HTML bilíngue 503
    pageBucket?.clear();
    const fallbackRes = (await sw.dispatchFetch({
      url: "https://telluspedia.example/dossies/astronomia-optica",
      mode: "navigate",
    })) as Response;
    assert.equal(fallbackRes.status, 503);
    assert.match(await fallbackRes.text(), /Modo offline \/ Offline mode/);
  });

  test("next.config.mjs serve /sw.js sem cache HTTP e com CSP estrita sem afetar KTX2", async () => {
    assert.equal(SERVICE_WORKER_PATH, SW_PATH);
    const swHeaders = serviceWorkerHeaders();
    const csp = swHeaders.find((h) => h.key === "Content-Security-Policy")?.value ?? "";
    assert.doesNotMatch(csp, /unsafe-eval/);
    assert.match(csp, /script-src 'self'/);
    assert.match(swHeaders.find((h) => h.key === "Cache-Control")?.value ?? "", /no-cache/);
    assert.equal(swHeaders.find((h) => h.key === "Service-Worker-Allowed")?.value, "/");

    const cfg = (
      nextConfigFactory as (p: string) => {
        headers: () => Promise<{ source: string; headers: { key: string; value: string }[] }[]>;
      }
    )("phase-production-build");
    const rules = await cfg.headers();
    assert.equal(rules[2]?.source, "/sw.js");
  });

  test("OfflineIndicator usa tokens D14 e traduz corretamente em pt-BR e en (vazio quando online)", () => {
    const prev = useLocaleStore.getState();
    try {
      useLocaleStore.setState({ locale: "pt-BR", enMessages: null });
      assert.equal(renderToStaticMarkup(React.createElement(OfflineIndicator, { offline: false })), "");

      const ptHtml = renderToStaticMarkup(React.createElement(OfflineIndicator, { offline: true }));
      assert.match(ptHtml, /data-testid="offline-indicator"/);
      assert.match(ptHtml, /Modo offline/);
      assert.match(ptHtml, /catálogo enciclopédico continua acessível/);

      useLocaleStore.setState({ locale: "en", enMessages: EN_MESSAGES });
      const enHtml = renderToStaticMarkup(React.createElement(OfflineIndicator, { offline: true }));
      assert.match(enHtml, /Offline mode/);
      assert.match(enHtml, /encyclopedic catalog remains available/);
    } finally {
      useLocaleStore.setState({ locale: prev.locale, enMessages: prev.enMessages });
    }
  });
});
