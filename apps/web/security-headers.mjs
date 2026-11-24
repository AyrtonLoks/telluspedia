/**
 * Cabeçalhos HTTP de segurança (T30), aplicados a todas as respostas por `next.config.mjs`.
 *
 * A CSP é a mais estreita que o app aguenta hoje:
 * - `script-src 'unsafe-inline'`: o App Router injeta scripts inline de hidratação sem nonce;
 *   `'wasm-unsafe-eval'` para o transcoder Basis (KTX2) compilar WebAssembly; `'unsafe-eval'` só no
 *   `next dev` (React Refresh).
 * - `worker-src blob:`: workers de bibliotecas criados a partir de Blob. O do KTX2 é um arquivo
 *   (`/basis/ktx2-worker.js`) com CSP própria — `ktx2WorkerHeaders` — porque o transcoder Basis
 *   (Emscripten/embind) chama `new Function`; assim a página não precisa de `'unsafe-eval'`.
 * - `img-src https://flagcdn.com`: bandeiras dos países; o resto (texturas, estrelas, dados, fontes,
 *   transcoder) é servido pela própria origem.
 * - `connect-src 'self'`: o navegador só fala com as rotas `/api/*`; no dev, também o WebSocket do HMR.
 * - `frame-ancestors 'self'` + `X-Frame-Options`: nada de embutir o site em outra origem.
 */

/** @param {{ dev: boolean }} opts */
export function contentSecurityPolicy({ dev }) {
  const directives = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https://flagcdn.com"],
    "font-src": ["'self'", "data:"],
    "connect-src": ["'self'", ...(dev ? ["ws:", "wss:"] : [])],
    "worker-src": ["'self'", "blob:"],
    "media-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'self'"],
    ...(dev ? {} : { "upgrade-insecure-requests": [] }),
  };
  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

/** @param {{ dev: boolean }} opts @returns {{ key: string, value: string }[]} */
export function securityHeaders({ dev }) {
  const headers = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy({ dev }) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
  // HSTS só em produção: no dev (http://localhost) seria ignorado, e num https local fixaria o host.
  if (!dev) headers.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" });
  return headers;
}

/** Caminho do worker do transcoder KTX2 (ver `src/lib/textures/ktx2Worker.ts`). */
export const KTX2_WORKER_PATH = "/basis/ktx2-worker.js";

/**
 * CSP do worker do KTX2: um worker carregado por URL usa a CSP da própria resposta. Libera eval e
 * WebAssembly só ali; o worker não faz rede (o WASM chega por `postMessage`).
 */
export function ktx2WorkerHeaders() {
  return [
    { key: "Content-Security-Policy", value: "default-src 'none'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'" },
    { key: "Cache-Control", value: "public, max-age=3600, must-revalidate" },
  ];
}

/** Caminho do Service Worker PWA (T46). */
export const SERVICE_WORKER_PATH = "/sw.js";

/**
 * Cabeçalhos do Service Worker: sem cache HTTP para que atualizações de versão sejam detectadas
 * imediatamente e com CSP estrita (`default-src 'self'`, sem `unsafe-eval`).
 */
export function serviceWorkerHeaders() {
  return [
    { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; connect-src 'self'" },
    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
    { key: "Service-Worker-Allowed", value: "/" },
    { key: "X-Content-Type-Options", value: "nosniff" },
  ];
}
