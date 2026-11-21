#!/usr/bin/env -S npx tsx
/**
 * Gera `public/basis/ktx2-worker.js` (T30): o worker do KTX2Loader como arquivo, para receber a
 * CSP da própria resposta. Rode depois de atualizar o three ou o transcoder Basis:
 *   pnpm --filter web textures:ktx2-worker
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildKtx2WorkerSource } from "./ktx2-worker-source";

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public/basis");
const source = buildKtx2WorkerSource(readFileSync(path.join(dir, "basis_transcoder.js"), "utf-8"));
writeFileSync(path.join(dir, "ktx2-worker.js"), source + "\n");
console.log(`ktx2-worker.js: ${(source.length / 1024).toFixed(1)} KiB`);
