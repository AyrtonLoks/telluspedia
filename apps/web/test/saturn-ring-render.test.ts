import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import type { AddressInfo } from "node:net";
import ts from "typescript";
import { SUN_LIGHT_INTENSITY } from "../src/components/globe/SunCore";

/**
 * Renderização real das sombras de Saturno (D21) no Chrome headless (SwiftShader). Pega os dois
 * defeitos vistos no navegador: luz do Sol que não chegava aos planetas (anéis pretos) e sombras
 * que não apareciam. Sem Chrome no ambiente, pula.
 */
const root = path.join(__dirname, "..");
const CHROME = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => fs.existsSync(p));
type Rows = number[][];
const mean = (rows: Rows, x0: number, y0: number, x1: number, y1: number) => {
  let s = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) (s += rows[y][x]), n++;
  return s / n;
};
const diffCount = (a: Rows, b: Rows, y0 = 0, y1 = a.length) => {
  let n = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < a[y].length; x++) if (Math.abs(a[y][x] - b[y][x]) > 30) n++;
  return n;
};

describe("D21: sombras de Saturno renderizadas", { skip: !CHROME && "sem Chrome no ambiente" }, () => {
  test("anel iluminado e sombras mútuas visíveis", async () => {
    // Sem bundler (só dependências diretas do app): transpila os .ts e resolve `three` por import map.
    const transpile = (rel: string) =>
      ts.transpileModule(fs.readFileSync(path.join(root, rel), "utf-8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
      }).outputText;
    const scene = transpile("test/fixtures/saturn-ring/scene.ts").replace(
      "../../../src/components/globe/planetShading",
      "/planetShading.js"
    );
    assert.match(scene, /from "\/planetShading\.js"/, "import da cena reescrito");
    const html =
      '<!doctype html><body style="margin:0"><script type="importmap">{"imports":{"three":"/three.js"}}</script>' +
      '<script type="module" src="/scene.js"></script>';
    const files: Record<string, [string, Buffer]> = {
      "/": ["text/html", Buffer.from(html)],
      "/scene.js": ["text/javascript", Buffer.from(scene)],
      "/planetShading.js": ["text/javascript", Buffer.from(transpile("src/components/globe/planetShading.ts"))],
      "/three.js": ["text/javascript", fs.readFileSync(path.join(root, "node_modules/three/build/three.module.js"))],
      "/ring.png": ["image/png", fs.readFileSync(path.join(root, "public/textures/planets/saturn_ring.png"))],
    };
    const server = http.createServer((req, res) => {
      const f = files[req.url ?? "/"];
      res.writeHead(f ? 200 : 404, { "content-type": f ? f[0] : "text/plain" });
      res.end(f ? f[1] : "");
    });
    await new Promise<void>((r) => server.listen(0, r));
    const { chromium } = await import("@playwright/test");
    const browser = await chromium.launch({
      executablePath: CHROME,
      args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    });
    try {
      const page = await browser.newPage();
      await page.goto(`http://localhost:${(server.address() as AddressInfo).port}/`);
      await page.waitForFunction(() => typeof window.renderSaturn === "function");
      const render = (o: { shadows: boolean; view: "night" | "day"; decay: number; intensity: number }) =>
        page.evaluate((opts) => window.renderSaturn(opts), o);
      const sun = { decay: 0, intensity: SUN_LIGHT_INTENSITY };

      // Luz: com a atenuação antiga (decay 1, 4,5) o anel lado-dia ficava quase preto.
      const oldLight = await render({ shadows: true, view: "night", decay: 1, intensity: 4.5 });
      const night = await render({ shadows: true, view: "night", ...sun });
      const ringBand = (r: Rows) => mean(r, 12, 95, 45, 105); // anel à esquerda do planeta
      assert.ok(ringBand(night) > 3 * ringBand(oldLight), `anel iluminado: ${ringBand(night)} vs ${ringBand(oldLight)}`);

      // Planeta → anel: atrás do planeta, visto do lado noturno, o anel da frente muda.
      const nightPlain = await render({ shadows: false, view: "night", ...sun });
      assert.ok(diffCount(night, nightPlain) > 300, "sombra do planeta no anel");

      // Anel → planeta: visto do lado do Sol, a sombra cai na metade de baixo (hemisfério sul).
      const day = await render({ shadows: true, view: "day", ...sun });
      const dayPlain = await render({ shadows: false, view: "day", ...sun });
      const south = diffCount(day, dayPlain, 100, 200);
      assert.ok(south > 200, `sombra dos anéis no hemisfério sul (${south} px)`);
    } finally {
      await browser.close();
      server.close();
    }
  });
});
