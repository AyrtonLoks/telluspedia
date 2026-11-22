#!/usr/bin/env node
/**
 * Roda os testes unitários (`node --test` + tsx) em qualquer sistema. O curinga
 * `test/*.test.ts` do script antigo dependia do shell expandi-lo, o que o PowerShell e o cmd
 * não fazem (T35). Sem argumentos roda `test/*.test.ts` e `test/*.test.tsx`; com argumentos,
 * só os arquivos indicados (ex.: `pnpm test test/gibs.test.tsx`).
 */
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("-"));
const named = args.filter((a) => !a.startsWith("-"));
const files = named.length
  ? named
  : readdirSync(path.join(webRoot, "test"))
      .filter((f) => /\.test\.tsx?$/.test(f))
      .sort()
      .map((f) => path.join("test", f));

const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...flags, ...files], {
  cwd: webRoot,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
