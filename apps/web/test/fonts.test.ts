import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

// Regressão T01: variáveis CSS de fonte usadas pelo Tailwind/CSS mas nunca definidas
// invalidam a declaração `font-family` inteira e o navegador cai na serifa padrão.
const root = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf-8");

function fontVarsUsedIn(source: string): Set<string> {
  return new Set([...source.matchAll(/var\((--font-[\w-]+)\)/g)].map((m) => m[1]));
}

describe("T01: fontes definidas via next/font", () => {
  const layout = read("src/app/layout.tsx");
  const declared = new Set(
    [...layout.matchAll(/variable:\s*["'](--font-[\w-]+)["']/g)].map((m) => m[1])
  );

  it("layout.tsx carrega as fontes com next/font", () => {
    assert.match(layout, /from\s+["']next\/font\/(google|local)["']/);
  });

  for (const file of ["tailwind.config.ts", "src/styles/globals.css"]) {
    it(`toda variável --font-* usada em ${file} é declarada no layout`, () => {
      for (const v of fontVarsUsedIn(read(file))) {
        assert.ok(declared.has(v), `${v} é usada em ${file} mas não é declarada em layout.tsx`);
      }
    });
  }

  it("as variáveis das fontes são aplicadas ao <html>", () => {
    for (const name of ["geistSans", "geistMono", "merriweather"]) {
      assert.match(layout, new RegExp(`\\$\\{${name}\\.variable\\}`));
    }
  });
});
