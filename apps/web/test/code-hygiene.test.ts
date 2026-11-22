/**
 * T36 — higiene do código: arquivos grandes divididos, nenhum `any` explícito e nenhuma dependência
 * @radix-ui declarada sem uso.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const webRoot = path.resolve(__dirname, "..");
const srcFiles: string[] = [];
const walk = (dir: string) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(f)) srcFiles.push(p);
  }
};
walk(path.join(webRoot, "src"));
const rel = (p: string) => path.relative(webRoot, p);

describe("T36 · higiene do código", () => {
  test("nenhum arquivo .ts/.tsx em src/ passa de 600 linhas (dados grandes vão para JSON ou módulos)", () => {
    const big = srcFiles
      .map((p) => [rel(p), fs.readFileSync(p, "utf-8").split("\n").length] as const)
      .filter(([, n]) => n > 600);
    assert.deepEqual(big, []);
  });

  test("nenhum `any` explícito em src/", () => {
    const hits = srcFiles.flatMap((p) =>
      fs.readFileSync(p, "utf-8").split("\n").flatMap((line, i) => (/:\s*any\b|\bas\s+any\b|<any>/.test(line) ? [`${rel(p)}:${i + 1}`] : []))
    );
    assert.deepEqual(hits, []);
  });

  test("toda dependência @radix-ui declarada é importada em algum lugar", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(webRoot, "package.json"), "utf-8")) as { dependencies: Record<string, string> };
    const all = srcFiles.map((p) => fs.readFileSync(p, "utf-8")).join("\n");
    const unused = Object.keys(pkg.dependencies).filter((d) => d.startsWith("@radix-ui/") && !all.includes(`"${d}"`));
    assert.deepEqual(unused, []);
  });
});
