/**
 * Contrato e políticas do Service Worker do TellusPedia (T46).
 * Espelha as constantes e regras de `public/sw.js` para testes unitários determinísticos
 * e registro seguro em produção no cliente.
 */

export const SW_PATH = "/sw.js";
export const SW_CACHE_VERSION = "v1";
export const SW_CACHE_PREFIX = "telluspedia-";
export const SW_STATIC_CACHE = `${SW_CACHE_PREFIX}static-${SW_CACHE_VERSION}`;
export const SW_PAGE_CACHE = `${SW_CACHE_PREFIX}pages-${SW_CACHE_VERSION}`;

export const SW_PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/data/countries-ne-110m.json",
  "/data/countries-worldbank-indicators.json",
  "/data/worldbank-timeseries.json",
] as const;

export type SwStrategy = "bypass" | "cache-first" | "network-first";

export function classifySwRequest(
  pathname: string,
  options: { method?: string; sameOrigin?: boolean; mode?: string } = {}
): SwStrategy {
  const method = (options.method ?? "GET").toUpperCase();
  const sameOrigin = options.sameOrigin ?? true;
  if (method !== "GET" || !sameOrigin) return "bypass";

  if (
    pathname === SW_PATH ||
    pathname.startsWith("/basis/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/dev/")
  ) {
    return "bypass";
  }

  const isCacheableTexture = pathname.startsWith("/textures/") && !/_4k\./i.test(pathname);
  if (
    pathname.startsWith("/_next/static/") ||
    (pathname.startsWith("/data/") && pathname.endsWith(".json")) ||
    pathname.startsWith("/flags/") ||
    pathname.startsWith("/observatory/gibs/") ||
    isCacheableTexture ||
    pathname === "/icon.svg" ||
    pathname === "/manifest.webmanifest"
  ) {
    return "cache-first";
  }

  if (options.mode === "navigate") {
    return "network-first";
  }

  return "bypass";
}

/** Retorna nomes de caches antigos do TellusPedia que devem ser removidos na ativação de uma nova versão. */
export function cachesToPrune(
  existingCacheNames: readonly string[],
  activeCaches: readonly string[] = [SW_STATIC_CACHE, SW_PAGE_CACHE]
): string[] {
  const keep = new Set(activeCaches);
  return existingCacheNames.filter(
    (name) => name.startsWith(SW_CACHE_PREFIX) && !keep.has(name)
  );
}

export function shouldRegisterServiceWorker(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  if (process.env.NODE_ENV !== "production") return false;
  if (!("serviceWorker" in navigator)) return false;
  return window.isSecureContext === true;
}

/** Registra `/sw.js` em produção após o carregamento inicial para não competir com o WebGL. */
export function registerServiceWorker(): void {
  if (!shouldRegisterServiceWorker()) return;

  const doRegister = () => {
    navigator.serviceWorker.register(SW_PATH, { scope: "/" }).catch((error) => {
      console.warn("[pwa] Service worker registration skipped", {
        reason: error instanceof Error ? error.name : "UnknownError",
      });
    });
  };

  if (document.readyState === "complete") {
    doRegister();
  } else {
    window.addEventListener("load", doRegister, { once: true });
  }
}
