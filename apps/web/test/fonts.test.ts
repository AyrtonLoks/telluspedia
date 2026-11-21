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

describe("T27: fontes locais determinísticas sem next/font/google", () => {
  const layout = read("src/app/layout.tsx");

  it("não depende de next/font/google em build time", () => {
    assert.doesNotMatch(layout, /from\s+["']next\/font\/google["']/);
    assert.match(layout, /from\s+["']next\/font\/local["']/);
  });

  it("todos os arquivos .woff2 referenciados em layout.tsx existem e são WOFF2 válidos", () => {
    const refs = [...layout.matchAll(/["'](\.\/fonts\/[^"']+\.woff2)["']/g)].map((m) => m[1]);
    assert.ok(refs.length >= 6, `esperava ao menos 6 arquivos .woff2 em layout.tsx, encontrei ${refs.length}`);

    for (const relRef of refs) {
      const fullPath = path.join(root, "src/app", relRef);
      assert.ok(fs.existsSync(fullPath), `arquivo de fonte ausente: ${fullPath}`);
      const header = fs.readFileSync(fullPath).subarray(0, 4).toString("ascii");
      assert.equal(header, "wOF2", `${relRef} não possui assinatura mágica WOFF2 válida`);
    }
  });

  it("merriweather mantém pesos 400/700 normal e itálico com preload desativado", () => {
    for (const file of [
      "Merriweather-Regular.woff2",
      "Merriweather-Italic.woff2",
      "Merriweather-Bold.woff2",
      "Merriweather-BoldItalic.woff2",
    ]) {
      assert.ok(layout.includes(file), `layout.tsx deveria referenciar ${file}`);
    }
    assert.match(layout, /preload:\s*false/);
  });
});
