import { clsx, type ClassValue } from "clsx";
import { TW_CONFLICTS, TW_GROUP } from "./tw-merge-table";

/**
 * `clsx` + merge de classes do Tailwind (a última vence no mesmo grupo, inclusive com os tokens
 * do D14 — `text-caption` é tamanho e `text-fg` é cor). Mesmo algoritmo do tailwind-merge, mas com
 * uma tabela gerada só para as classes do código (`scripts/build-tw-merge-table.ts`), em vez da
 * configuração padrão inteira (T35). Classe fora da tabela é mantida, como no tailwind-merge.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Separa variantes (`md:hover:`) da classe base; `:` dentro de `[...]` não conta. */
function splitModifiers(className: string): { modifiers: string[]; base: string } {
  const modifiers: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < className.length; i++) {
    const c = className[i];
    if (c === "[") depth++;
    else if (c === "]") depth--;
    else if (c === ":" && depth === 0) {
      modifiers.push(className.slice(start, i));
      start = i + 1;
    }
  }
  return { modifiers, base: className.slice(start) };
}

/** Variantes em ordem canônica: as arbitrárias (`[&>*]`) ficam onde estão, as demais em ordem alfabética. */
function sortModifiers(modifiers: string[]): string[] {
  if (modifiers.length <= 1) return modifiers;
  const sorted: string[] = [];
  let run: string[] = [];
  for (const m of modifiers) {
    if (m.startsWith("[")) {
      sorted.push(...run.sort(), m);
      run = [];
    } else run.push(m);
  }
  return sorted.concat(run.sort());
}

export function twMerge(classList: string): string {
  const classes = classList.trim().split(/\s+/);
  const seen = new Set<string>();
  const kept: string[] = [];
  for (let i = classes.length - 1; i >= 0; i--) {
    const cls = classes[i];
    if (!cls) continue;
    const { modifiers, base: rawBase } = splitModifiers(cls);
    const important = rawBase.startsWith("!");
    const group = TW_GROUP[important ? rawBase.slice(1) : rawBase];
    if (group === undefined) {
      kept.push(cls);
      continue;
    }
    const variant = sortModifiers(modifiers).join(":") + (important ? "!" : "");
    const id = `${variant}|${group}`;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const other of TW_CONFLICTS[group]) seen.add(`${variant}|${other}`);
    kept.push(cls);
  }
  return kept.reverse().join(" ");
}
