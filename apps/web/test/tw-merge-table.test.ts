/**
 * T35 — o `cn` faz o merge com uma tabela gerada (sem o tailwind-merge no bundle). Estes testes
 * garantem que ele dá o mesmo resultado do tailwind-merge com os tokens do D14 e que a tabela
 * acompanha as classes usadas no código.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { extendTailwindMerge } from "tailwind-merge";
import { twMerge } from "../src/components/ui/cn";
import { TW_GROUP } from "../src/components/ui/tw-merge-table";
import { TW_MERGE_EXTENSION } from "../src/components/ui/tw-merge-extension";
import { buildTable, collectSourceClasses } from "../scripts/build-tw-merge-table";

const reference = extendTailwindMerge(TW_MERGE_EXTENSION);
const TABLE = Object.keys(TW_GROUP);

describe("T35 · cn sem tailwind-merge no bundle", () => {
  test("a tabela cobre exatamente as classes do código (rode scripts/build-tw-merge-table.ts)", () => {
    const { groupOf } = buildTable(collectSourceClasses());
    assert.deepEqual([...groupOf.keys()].sort(), [...TABLE].sort());
  });

  test("todos os pares de classes da tabela dão o mesmo merge do tailwind-merge", () => {
    let diffs = 0;
    const sample: string[] = [];
    for (const a of TABLE) {
      for (const b of TABLE) {
        const input = `${a} ${b}`;
        if (twMerge(input) !== reference(input)) {
          diffs++;
          if (sample.length < 10) sample.push(`${input} → ${twMerge(input)} ≠ ${reference(input)}`);
        }
      }
    }
    assert.equal(diffs, 0, sample.join("\n"));
  });

  test("variantes, !important, classes desconhecidas e arbitrárias", () => {
    const cases = [
      "px-2 py-1 p-3",
      "p-3 px-2",
      "hover:bg-surface bg-surface-raised hover:bg-surface-hover",
      "md:hover:text-fg hover:md:text-fg-muted",
      "text-caption text-fg text-label",
      "rounded-control rounded-card",
      "duration-fast duration-base ease-out",
      "!h-7 h-9 !h-8",
      "group-hover:opacity-100 opacity-0 group-hover:opacity-60",
      "qualquer-coisa h-7 qualquer-coisa h-9",
      "[&>svg]:h-4 [&>svg]:h-5 h-3",
      "shadow-e1 shadow-e2 border border-line border-line-strong",
      "",
      "  h-7   w-7  ",
    ];
    for (const c of cases) assert.equal(twMerge(c), reference(c), c);
  });

  test("strings de classes reais do código dão o mesmo merge", () => {
    const root = path.join(__dirname, "../src");
    const strings: string[] = [];
    const walk = (d: string) => {
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (/\.tsx$/.test(f)) {
          for (const m of fs.readFileSync(p, "utf-8").matchAll(/"([a-z!\[][^"\n]*\s[^"\n]*)"/g)) strings.push(m[1]);
        }
      }
    };
    walk(root);
    assert.ok(strings.length > 200);
    for (let i = 0; i < strings.length; i++) {
      const s = `${strings[i]} ${strings[(i * 7 + 3) % strings.length]}`; // combina duas strings reais
      assert.equal(twMerge(strings[i]), reference(strings[i]), strings[i]);
      assert.equal(twMerge(s), reference(s), s);
    }
  });

  test("o cn não importa o tailwind-merge (fica só no gerador e nos testes)", () => {
    const cn = fs.readFileSync(path.join(__dirname, "../src/components/ui/cn.ts"), "utf-8");
    assert.doesNotMatch(cn, /from\s+["']tailwind-merge["']/);
  });
});
