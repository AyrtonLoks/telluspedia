/**
 * Gera `src/components/ui/tw-merge-table.ts` (T35): a tabela de grupos e conflitos do
 * tailwind-merge só para as classes que o código usa. O `cn` faz o merge com ela, sem levar os
 * ~6,6 kB gzip do tailwind-merge (config padrão inteira) para o carregamento inicial.
 *
 * Rode depois de usar classes novas do Tailwind (o teste `tw-merge-table.test.ts` acusa):
 *   npx tsx scripts/build-tw-merge-table.ts
 */
import fs from "node:fs";
import path from "node:path";
import { extendTailwindMerge } from "tailwind-merge";
import { TW_MERGE_EXTENSION } from "../src/components/ui/tw-merge-extension";

const SRC = path.resolve(__dirname, "../src");
const OUT = path.join(SRC, "components/ui/tw-merge-table.ts");

/** Classes "base" (sem variantes `hover:` etc. e sem `!`) encontradas em strings do código-fonte. */
export function collectSourceClasses(dir: string = SRC): string[] {
  const tokens = new Set<string>();
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.tsx?$/.test(f) && p !== OUT) {
        const s = fs.readFileSync(p, "utf-8");
        for (const m of s.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)) {
          const str = (m[1] ?? m[2] ?? m[3] ?? "").replace(/\$\{[^}]*\}/g, " ");
          for (const raw of str.split(/\s+/)) {
            if (!raw) continue;
            const base = raw.split(/:(?![^[]*\])/).pop()!.replace(/^!/, "");
            if (/^-?[a-z][a-z0-9.-]*(\/[0-9a-z.]+)?$|^-?[a-z][a-z0-9-]*-\[[^\]\s]+\](\/[0-9]+)?$/.test(base)) tokens.add(base);
          }
        }
      }
    }
  };
  walk(dir);
  return [...tokens].sort();
}

export function buildTable(tokens: string[]) {
  const twMerge = extendTailwindMerge(TW_MERGE_EXTENSION);
  // Classes que o tailwind-merge reconhece: a repetida some.
  const known = tokens.filter((t) => twMerge(`${t} ${t}`) === t);
  // Mesmo grupo = uma remove a outra nos dois sentidos.
  const groupOf = new Map<string, number>();
  const groups: string[][] = [];
  for (const t of known) {
    let g = -1;
    for (let i = 0; i < groups.length && g < 0; i++) {
      const r = groups[i][0];
      if (twMerge(`${r} ${t}`) === t && twMerge(`${t} ${r}`) === r) g = i;
    }
    if (g < 0) groups.push([t]), (g = groups.length - 1);
    else groups[g].push(t);
    groupOf.set(t, g);
  }
  // Conflito: a classe posterior remove a anterior de outro grupo (ex.: `p-2` remove `px-4`).
  const conflicts: number[][] = groups.map(() => []);
  for (let a = 0; a < groups.length; a++) {
    for (let b = 0; b < groups.length; b++) {
      if (a !== b && twMerge(`${groups[b][0]} ${groups[a][0]}`) === groups[a][0]) conflicts[a].push(b);
    }
  }
  return { groupOf, groups, conflicts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const { groupOf, conflicts } = buildTable(collectSourceClasses());
  const entries = [...groupOf].map(([t, g]) => `${JSON.stringify(t)}:${g}`).join(",");
  const body = `/* Gerado por scripts/build-tw-merge-table.ts — não editar à mão (T35). */
/** Classe base → grupo do tailwind-merge (só as classes usadas no código). */
export const TW_GROUP: Record<string, number> = {${entries}};
/** Grupo → grupos que ele remove quando aparece depois (ex.: \`p-*\` remove \`px-*\`). */
export const TW_CONFLICTS: number[][] = ${JSON.stringify(conflicts)};
`;
  fs.writeFileSync(OUT, body);
  console.log(`tw-merge: ${groupOf.size} classes, ${conflicts.length} grupos → ${path.relative(process.cwd(), OUT)}`);
}
