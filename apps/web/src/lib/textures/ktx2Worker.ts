/**
 * Worker do transcoder KTX2 servido como arquivo (T30). O KTX2Loader do three monta o código do
 * worker num Blob; um worker de Blob herda a CSP da página, e o `basis_transcoder.js` (Emscripten,
 * embind) chama `new Function` — então a página precisaria de `'unsafe-eval'`. Servido como arquivo,
 * o worker recebe a CSP da própria resposta (`next.config.mjs` libera eval só nele).
 *
 * O arquivo é gerado por `scripts/textures/build-ktx2-worker.ts`; um teste garante que ele bate com
 * o three e o transcoder instalados.
 */
export const KTX2_WORKER_URL = "/basis/ktx2-worker.js";
