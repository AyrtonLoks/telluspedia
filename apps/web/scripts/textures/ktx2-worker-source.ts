/**
 * Monta o código do worker do KTX2 igual ao que `KTX2Loader.init()` põe no Blob (T30).
 *
 * O corpo do `BasisWorker` é lido do ARQUIVO-FONTE do three, e não por `Function.toString()`: sob o
 * tsx (esbuild com keepNames) o toString viria com chamadas `__name(...)`, que não existem no worker.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

const Loader = KTX2Loader as unknown as { EngineFormat: unknown; EngineType: unknown; TranscoderFormat: unknown; BasisFormat: unknown };

/** Corpo (entre as chaves) de `KTX2Loader.BasisWorker = function () { … }` no arquivo do three. */
export function basisWorkerBodyFromThreeSource(source: string): string {
  const marker = "KTX2Loader.BasisWorker = function () {";
  const start = source.indexOf(marker);
  if (start < 0) throw new Error("BasisWorker não encontrado no KTX2Loader do three");
  let depth = 0;
  for (let i = start + marker.length - 1; i < source.length; i++) {
    const c = source[i];
    if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return source.slice(start + marker.length, i);
  }
  throw new Error("BasisWorker sem fechamento no KTX2Loader do three");
}

export function threeKtx2LoaderSource(): string {
  const require = createRequire(import.meta.url);
  return readFileSync(require.resolve("three/examples/jsm/loaders/KTX2Loader.js"), "utf-8");
}

export function buildKtx2WorkerSource(transcoderJs: string, threeSource: string = threeKtx2LoaderSource()): string {
  return [
    "/* Gerado por scripts/textures/build-ktx2-worker.ts — não editar à mão (T30). */",
    "/* constants */",
    "let _EngineFormat = " + JSON.stringify(Loader.EngineFormat),
    "let _EngineType = " + JSON.stringify(Loader.EngineType),
    "let _TranscoderFormat = " + JSON.stringify(Loader.TranscoderFormat),
    "let _BasisFormat = " + JSON.stringify(Loader.BasisFormat),
    "/* basis_transcoder.js */",
    transcoderJs,
    "/* worker */",
    basisWorkerBodyFromThreeSource(threeSource),
  ].join("\n");
}
