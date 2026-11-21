/**
 * T30 — Cabeçalhos HTTP de segurança (CSP, HSTS, Referrer, Permissions) e `Cache-Control` nas APIs.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { contentSecurityPolicy, securityHeaders, ktx2WorkerHeaders, KTX2_WORKER_PATH } from "../security-headers.mjs";
import nextConfigFactory from "../next.config.mjs";
import { CACHE_POLICY, withCachePolicy } from "../src/lib/http-cache";
import { BASIS_TRANSCODER_PATH } from "../src/lib/textures/globeTextures";
import { GET as astronomyGET } from "../src/app/api/astronomy/route";

const root = path.join(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf-8");
const header = (list: { key: string; value: string }[], key: string) => list.find((h) => h.key === key)?.value;
const directive = (csp: string, name: string) => csp.split("; ").find((d) => d === name || d.startsWith(`${name} `));

describe("T30: cabeçalhos de segurança", () => {
  test("produção: CSP estreita, nosniff, referrer, frame, permissions, COOP e HSTS", () => {
    const h = securityHeaders({ dev: false });
    const csp = header(h, "Content-Security-Policy")!;
    assert.equal(directive(csp, "default-src"), "default-src 'self'");
    assert.equal(directive(csp, "object-src"), "object-src 'none'");
    assert.equal(directive(csp, "frame-ancestors"), "frame-ancestors 'self'");
    assert.equal(directive(csp, "base-uri"), "base-uri 'self'");
    assert.equal(directive(csp, "connect-src"), "connect-src 'self'", "o navegador só fala com /api/*");
    assert.ok(directive(csp, "upgrade-insecure-requests"));
    assert.doesNotMatch(directive(csp, "script-src")!, /'unsafe-eval'/, "sem eval em produção");
    assert.equal(header(h, "X-Content-Type-Options"), "nosniff");
    assert.equal(header(h, "Referrer-Policy"), "strict-origin-when-cross-origin");
    assert.equal(header(h, "X-Frame-Options"), "SAMEORIGIN");
    assert.match(header(h, "Permissions-Policy")!, /camera=\(\).*microphone=\(\).*geolocation=\(\)/);
    assert.equal(header(h, "Cross-Origin-Opener-Policy"), "same-origin");
    assert.equal(header(h, "Strict-Transport-Security"), "max-age=63072000; includeSubDomains");
  });

  test("CSP não quebra KTX2/WASM, workers, bandeiras nem fontes locais", () => {
    const csp = contentSecurityPolicy({ dev: false });
    assert.match(directive(csp, "script-src")!, /'wasm-unsafe-eval'/, "transcoder Basis compila WebAssembly");
    assert.match(directive(csp, "worker-src")!, /blob:/, "KTX2Loader cria workers a partir de Blob");
    assert.ok(BASIS_TRANSCODER_PATH.startsWith("/"), "transcoder servido pela própria origem");
    assert.match(directive(csp, "img-src")!, /https:\/\/flagcdn\.com/);
    assert.match(directive(csp, "img-src")!, /data:.*blob:/, "texturas carregadas via blob/data");
    assert.equal(directive(csp, "font-src"), "font-src 'self' data:");
    assert.match(read("src/app/layout.tsx"), /next\/font\/local/, "fontes auto-hospedadas");
    // Toda imagem externa do cliente é bandeira do flagcdn (as demais URLs são links de fonte).
    for (const f of ["src/components/hud/CountryHeader.tsx", "src/components/nav/TopNavBar.tsx", "src/components/comparator/ComparisonGrid.tsx"]) {
      assert.doesNotMatch(read(f), /<img[^>]+src="https?:\/\/(?!flagcdn\.com)/, f);
    }
  });

  test("eval liberado só no worker do KTX2, que é carregado de arquivo (não de Blob)", () => {
    const worker = ktx2WorkerHeaders().find((h) => h.key === "Content-Security-Policy")!.value;
    assert.equal(worker, "default-src 'none'; script-src 'self' 'unsafe-eval' 'wasm-unsafe-eval'");
    const loader = read("src/lib/textures/globeTextures.ts");
    assert.match(loader, /new FileWorkerKTX2Loader\(\)/);
    assert.match(loader, /new Worker\(KTX2_WORKER_URL\)/);
    assert.doesNotMatch(loader, /createObjectURL/);
  });

  test("dev: eval (React Refresh) e WebSocket do HMR liberados; sem HSTS nem upgrade", () => {
    const h = securityHeaders({ dev: true });
    const csp = header(h, "Content-Security-Policy")!;
    assert.match(directive(csp, "script-src")!, /'unsafe-eval'/);
    assert.match(directive(csp, "connect-src")!, /ws:/);
    assert.equal(directive(csp, "upgrade-insecure-requests"), undefined);
    assert.equal(header(h, "Strict-Transport-Security"), undefined);
  });

  test("next.config aplica os cabeçalhos a todas as rotas e esconde X-Powered-By", async () => {
    for (const phase of ["phase-production-build", "phase-development-server"]) {
      const cfg = (nextConfigFactory as (p: string) => { poweredByHeader: boolean; headers: () => Promise<{ source: string; headers: { key: string }[] }[]> })(phase);
      assert.equal(cfg.poweredByHeader, false);
      const rules = await cfg.headers();
      assert.equal(rules[0].source, "/:path*");
      assert.ok(rules[0].headers.some((x) => x.key === "Content-Security-Policy"));
      assert.equal(rules[0].headers.some((x) => x.key === "Strict-Transport-Security"), phase === "phase-production-build");
      // A regra do worker do KTX2 vem depois (no mesmo cabeçalho, a última vale).
      assert.equal(rules[1].source, KTX2_WORKER_PATH);
    }
  });
});

describe("T30: Cache-Control nas APIs", () => {
  test("withCachePolicy: 2xx recebe a política, erro fica sem cache, cabeçalho do handler é mantido", async () => {
    const ok = await withCachePolicy(() => Response.json({}), CACHE_POLICY.staticData)();
    assert.equal(ok.headers.get("Cache-Control"), CACHE_POLICY.staticData);
    const notFound = await withCachePolicy(() => Response.json({}, { status: 404 }), CACHE_POLICY.staticData)();
    assert.equal(notFound.headers.get("Cache-Control"), "no-store");
    const temp = await withCachePolicy(() => Response.json({}, { headers: { "Cache-Control": "no-store" } }), CACHE_POLICY.study)();
    assert.equal(temp.headers.get("Cache-Control"), "no-store", "estudo temporário (memória) não vai para cache");
  });

  test("astronomia: instante dado é imutável; 'agora' tem cache curto", async () => {
    const at = await astronomyGET(new NextRequest("http://localhost/api/astronomy?dt=1969-07-20T20:17:40Z"));
    assert.equal(at.headers.get("Cache-Control"), CACHE_POLICY.astronomyAt);
    const now = await astronomyGET(new NextRequest("http://localhost/api/astronomy"));
    assert.equal(now.headers.get("Cache-Control"), CACHE_POLICY.astronomyNow);
  });

  test("cada rota de leitura e de escrita declara sua política", () => {
    const expected: Record<string, RegExp> = {
      "src/app/api/studies/[slug]/route.ts": /export const GET = withCachePolicy\(getHandler, CACHE_POLICY\.study\)/,
      "src/app/api/countries/route.ts": /export const GET = withCachePolicy\(getHandler, CACHE_POLICY\.staticData\)/,
      "src/app/api/countries/[iso]/route.ts": /export const GET = withCachePolicy\(getHandler, CACHE_POLICY\.staticData\)/,
      "src/app/api/timeline/route.ts": /export const GET = withCachePolicy\(getHandler, CACHE_POLICY\.staticData\)/,
      "src/app/api/weather/route.ts": /export const GET = withCachePolicy\(getHandler, CACHE_POLICY\.weather\)/,
      "src/app/api/astronomy/route.ts": /export const GET = withCachePolicy\(getHandler,/,
      "src/app/api/studies/route.ts": /export const POST = withCachePolicy\(postHandler, CACHE_POLICY\.noStore\)/,
      "src/app/api/studies/[slug]/fork/route.ts": /export const POST = withCachePolicy\(postHandler, CACHE_POLICY\.noStore\)/,
    };
    for (const [f, re] of Object.entries(expected)) assert.match(read(f), re, f);
    // As 7 rotas do Observatório já usam o TTL de cada fonte.
    for (const r of ["ais", "eonet", "firms", "iss", "satellites", "traffic"]) {
      assert.match(read(`src/app/api/observatory/${r}/route.ts`), /observatoryHeaders\(/, r);
    }
    assert.match(read("src/app/api/observatory/cosmos/route.ts"), /Cache-Control/);
    // Nenhuma rota fica sem política.
    const routes = (dir: string): string[] =>
      fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? routes(`${dir}/${e.name}`) : e.name === "route.ts" ? [`${dir}/${e.name}`] : []
      );
    for (const f of routes("src/app/api")) {
      assert.match(read(f), /withCachePolicy|observatoryHeaders|Cache-Control/, `${f} sem Cache-Control`);
    }
  });
});
