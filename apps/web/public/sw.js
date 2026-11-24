/* TellusPedia Service Worker (T46) — cache versionado offline-first para casca e catálogo enciclopédico. */
const SW_CACHE_VERSION = "v1";
const SW_CACHE_PREFIX = "telluspedia-";
const STATIC_CACHE = `${SW_CACHE_PREFIX}static-${SW_CACHE_VERSION}`;
const PAGE_CACHE = `${SW_CACHE_PREFIX}pages-${SW_CACHE_VERSION}`;
const ACTIVE_CACHES = new Set([STATIC_CACHE, PAGE_CACHE]);

const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/data/countries-ne-110m.json",
  "/data/countries-worldbank-indicators.json",
  "/data/worldbank-timeseries.json",
];

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>TellusPedia — Modo offline / Offline mode</title>
  <style>
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#05070b;color:#f4f7fb;font-family:system-ui,-apple-system,sans-serif;padding:24px}
    main{max-width:460px;border:1px solid rgba(255,255,255,.14);border-radius:14px;background:#0b111b;padding:24px;line-height:1.5}
    h1{margin:0 0 8px;font-size:18px}
    p{margin:0 0 12px;font-size:14px;color:#b8c4d6}
    a{color:#38bdf8;text-decoration:none;font-size:14px}
    a:hover{text-decoration:underline}
  </style>
</head>
<body>
  <main>
    <h1>TellusPedia · Modo offline / Offline mode</h1>
    <p>Sem conexão no momento. As páginas já visitadas e o catálogo enciclopédico em cache continuam disponíveis.</p>
    <p>No network connection right now. Previously visited pages and the cached encyclopedic catalog remain available.</p>
    <a href="/">← Tentar novamente / Retry</a>
  </main>
</body>
</html>`;

function isCacheableTexture(pathname) {
  if (!pathname.startsWith("/textures/")) return false;
  // Mantém texturas 2K, 1K, paleomapas e Lua em cache; evita inflar cota com 4K pesados.
  return !/_4k\./i.test(pathname);
}

function isCacheFirstAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    (pathname.startsWith("/data/") && pathname.endsWith(".json")) ||
    pathname.startsWith("/flags/") ||
    pathname.startsWith("/observatory/gibs/") ||
    isCacheableTexture(pathname) ||
    pathname === "/icon.svg" ||
    pathname === "/manifest.webmanifest"
  );
}

function isNonCacheablePage(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/dev/") ||
    pathname === "/studies" ||
    pathname.startsWith("/study/")
  );
}

function shouldBypassRequest(request, url) {
  if (request.method !== "GET") return true;
  if (url.origin !== self.location.origin) return true;
  const { pathname } = url;
  // Nunca intercepta o worker/WASM do KTX2 (CSP dedicada T30), APIs vivas/mutáveis nem o próprio SW.
  if (pathname === "/sw.js") return true;
  if (pathname.startsWith("/basis/")) return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/dev/")) return true;
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((assetUrl) =>
            fetch(assetUrl, { cache: "no-cache" }).then((response) => {
              if (response.ok && response.type === "basic") {
                return cache.put(assetUrl, response);
              }
              return undefined;
            })
          )
        )
      ),
      caches.open(PAGE_CACHE).then((cache) =>
        fetch("/", { cache: "no-cache" })
          .then((response) => {
            const contentType = response.headers.get("content-type") || "";
            if (response.ok && response.type === "basic" && contentType.includes("text/html")) {
              return cache.put("/", response);
            }
            return undefined;
          })
          .catch(() => undefined)
      ),
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(SW_CACHE_PREFIX) && !ACTIVE_CACHES.has(key))
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function handleCacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

async function handleNetworkFirstNavigation(request, pathname) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    const contentType = response.headers.get("content-type") || "";
    if (
      response.ok &&
      response.type === "basic" &&
      contentType.includes("text/html") &&
      !isNonCacheablePage(pathname)
    ) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const exactMatch = await cache.match(request);
    if (exactMatch) return exactMatch;
    const homeMatch = await cache.match("/");
    if (homeMatch) return homeMatch;
    return new Response(OFFLINE_FALLBACK_HTML, {
      status: 503,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (shouldBypassRequest(request, url)) return;

  if (isCacheFirstAsset(url.pathname)) {
    event.respondWith(handleCacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNetworkFirstNavigation(request, url.pathname));
  }
});
