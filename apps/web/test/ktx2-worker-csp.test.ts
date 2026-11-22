/**
 * T30 — O worker do KTX2 funciona sob a CSP de PRODUÇÃO (sem 'unsafe-eval' na página).
 *
 * Uma página servida com a CSP de produção cria o worker do transcoder a partir do arquivo
 * (`/basis/ktx2-worker.js`, com CSP própria) e transcodifica um KTX2 real do projeto. Controle: o
 * mesmo código num worker de Blob — como o KTX2Loader original fazia — herda a CSP da página e falha
 * com EvalError (o defeito que o codex registrou na T30). Precisa de um Chrome; sem ele, pula.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import { contentSecurityPolicy, ktx2WorkerHeaders, KTX2_WORKER_PATH } from "../security-headers.mjs";
import { KTX2_WORKER_URL } from "../src/lib/textures/ktx2Worker";
import { buildKtx2WorkerSource } from "../scripts/textures/ktx2-worker-source";

const root = path.join(__dirname, "..");
const pub = (rel: string) => path.join(root, "public", rel);
const CHROME = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => fs.existsSync(p));

const PAGE = `<!doctype html><meta charset="utf-8"><script>
window.run = async (mode) => {
  const wasm = await (await fetch('/basis/basis_transcoder.wasm')).arrayBuffer();
  let worker;
  if (mode === 'file') worker = new Worker('${KTX2_WORKER_URL}');
  else {
    // Controle: mesmo código num Blob, com um ouvinte que devolve rejeições não tratadas do worker.
    const relay = "self.addEventListener('unhandledrejection', (e) => self.postMessage({ type: 'error', error: String(e.reason) }));\\n";
    worker = new Worker(URL.createObjectURL(new Blob([relay + await (await fetch('${KTX2_WORKER_URL}')).text()])));
  }
  const errors = [];
  worker.onerror = (e) => { errors.push(e.message || 'erro no worker'); e.preventDefault(); };
  const config = { astcSupported: false, astcHDRSupported: false, etc1Supported: false, etc2Supported: false, dxtSupported: false, bptcSupported: false, pvrtcSupported: false };
  worker.postMessage({ type: 'init', config, transcoderBinary: wasm }, [wasm]);
  const buffer = await (await fetch('/tex.ktx2')).arrayBuffer();
  return await new Promise((resolve) => {
    const t = setTimeout(() => resolve({ ok: false, errors, timeout: true }), 15000);
    worker.onmessage = (e) => { clearTimeout(t); resolve({ ok: e.data.type === 'transcode', width: e.data.data && e.data.data.width, error: e.data.error, errors }); };
    worker.postMessage({ type: 'transcode', id: 1, buffer, taskConfig: {} }, [buffer]);
  });
};
</script>`;

describe("T30: worker do KTX2 sob a CSP de produção", () => {
  test("o arquivo do worker está em sincronia com o three e o transcoder instalados", () => {
    // Compara sem diferença de fim de linha: no Windows o git pode trazer os dois arquivos com CRLF.
    const lf = (text: string) => text.replace(/\r\n/g, "\n");
    const expected = lf(buildKtx2WorkerSource(fs.readFileSync(pub("basis/basis_transcoder.js"), "utf-8")) + "\n");
    assert.equal(lf(fs.readFileSync(pub("basis/ktx2-worker.js"), "utf-8")), expected, "rode: pnpm --filter web textures:ktx2-worker");
    assert.equal(KTX2_WORKER_URL, KTX2_WORKER_PATH);
    assert.doesNotMatch(expected, /__name\(/, "sem helpers do esbuild no worker");
  });

  test("worker de arquivo transcodifica; worker de Blob falha (controle)", { skip: !CHROME && "sem Chrome no ambiente" }, async () => {
    // CSP de produção da página, sem o upgrade para https (o teste roda em http://127.0.0.1).
    const pageCsp = contentSecurityPolicy({ dev: false }).replace(/; upgrade-insecure-requests$/, "");
    assert.doesNotMatch(pageCsp, /'unsafe-eval'/);
    const server = http.createServer((req, res) => {
      const url = req.url ?? "/";
      if (url === "/") {
        res.writeHead(200, { "Content-Type": "text/html", "Content-Security-Policy": pageCsp });
        return res.end(PAGE);
      }
      const file = url === "/tex.ktx2" ? pub("textures/earth_clouds_2k.ktx2") : url.startsWith("/basis/") ? pub(url.slice(1)) : null;
      if (!file || !fs.existsSync(file)) return res.writeHead(404).end();
      const headers: Record<string, string> = {
        "Content-Type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".wasm") ? "application/wasm" : "application/octet-stream",
        "Content-Security-Policy": pageCsp,
      };
      if (url === KTX2_WORKER_PATH) for (const h of ktx2WorkerHeaders()) headers[h.key] = h.value;
      res.writeHead(200, headers);
      fs.createReadStream(file).pipe(res);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const { port } = server.address() as AddressInfo;
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
    try {
      const page = await browser.newPage();
      const consoleLog: string[] = [];
      page.on("console", (m) => consoleLog.push(m.text()));
      page.on("worker", (w) => w.on("console", (m) => consoleLog.push(m.text())));
      await page.goto(`http://127.0.0.1:${port}/`);
      const viaFile = (await page.evaluate("run('file')")) as { ok: boolean; width?: number; errors: string[] };
      assert.equal(viaFile.ok, true, `worker de arquivo: ${JSON.stringify(viaFile)}`);
      assert.equal(viaFile.width, 2048, "textura de nuvens 2k transcodificada");
      const viaBlob = (await page.evaluate("run('blob')")) as { ok: boolean; errors: string[]; error?: string };
      assert.equal(viaBlob.ok, false, "worker de Blob herda a CSP da página e não consegue rodar o transcoder");
      const why = JSON.stringify(viaBlob) + consoleLog.join("\n");
      assert.match(why, /EvalError|unsafe-eval|Content Security Policy/, `falha pelo motivo certo: ${why.slice(0, 400)}`);
    } finally {
      await browser.close();
      server.close();
    }
  });
});
