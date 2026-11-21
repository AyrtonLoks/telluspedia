#!/usr/bin/env node
/**
 * Pipeline de texturas dos planetas (D21).
 *
 * Entrada: originais em <repo>/assets-src/raw/planets (URLs e licenças em assets-src/README.md).
 * Saída:   apps/web/public/textures/planets/<corpo>_{1k,2k}.{jpg,ktx2} e saturn_ring.{png,ktx2}.
 *
 * Convenções (as mesmas de build-earth-textures.mjs):
 *  - Equiretangular 2:1, longitude 0 no centro da imagem, norte em cima.
 *  - KTX2 gravado com o eixo Y invertido (isYFlip), porque o KTX2Loader usa flipY = false.
 *  - Cor em sRGB. Planetas em ETC1S (baixa frequência, arquivo pequeno); o anel em UASTC, que
 *    preserva o alfa sem misturar canais.
 *  - O anel de Saturno é uma faixa radial: u = 0 na borda interna, u = 1 na externa. É reduzido
 *    para 1024×64 porque o Basis exige blocos de 4×4 (o original tem 125 px de altura).
 *
 * Uso: pnpm --filter web textures:planets            (todos)
 *      pnpm --filter web textures:planets mars ring   (só alguns)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { encodeToKTX2 } from "ktx2-encoder";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, "../..");
const RAW = path.resolve(WEB, "../../assets-src/raw/planets");
const OUT = path.join(WEB, "public/textures/planets");
const only = process.argv.slice(2);

/** Corpo → arquivo original e resoluções geradas (Plutão só tem mosaico de 1024 px). */
export const PLANETS = [
  { id: "mercury", src: "2k_mercury.jpg", sizes: [1024, 2048] },
  { id: "venus", src: "2k_venus_atmosphere.jpg", sizes: [1024, 2048] },
  { id: "mars", src: "2k_mars.jpg", sizes: [1024, 2048] },
  { id: "jupiter", src: "2k_jupiter.jpg", sizes: [1024, 2048] },
  { id: "saturn", src: "2k_saturn.jpg", sizes: [1024, 2048] },
  { id: "uranus", src: "2k_uranus.jpg", sizes: [1024, 2048] },
  { id: "neptune", src: "2k_neptune.jpg", sizes: [1024, 2048] },
  { id: "pluto", src: "pluto_usgs_1024.jpg", sizes: [1024] },
];
const RING = { src: "2k_saturn_ring_alpha.png", width: 1024, height: 64 };

const raw = (f) => {
  const p = path.join(RAW, f);
  if (!fs.existsSync(p)) throw new Error(`Falta ${p}. Veja assets-src/README.md.`);
  return p;
};
const want = (k) => only.length === 0 || only.includes(k);
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function decodeRGBA(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
}

const KTX = {
  planet: { isUASTC: false, isSetKTX2SRGBTransferFunc: true, isPerceptual: true, generateMipmap: true, isYFlip: true, qualityLevel: 230, compressionLevel: 4 },
  ring: { isUASTC: true, isSetKTX2SRGBTransferFunc: true, isPerceptual: true, generateMipmap: true, isYFlip: true, needSupercompression: true, uastcLDRQualityLevel: 2 },
};

async function writeKtx2(buffer, outPath, profile) {
  const bytes = await encodeToKTX2(new Uint8Array(buffer), { ...KTX[profile], enableDebug: false, imageDecoder: decodeRGBA });
  fs.writeFileSync(outPath, bytes);
  return bytes.byteLength;
}

async function buildPlanet({ id, src, sizes }) {
  for (const w of sizes) {
    const name = `${id}_${w === 2048 ? "2k" : "1k"}`;
    const jpg = await sharp(raw(src))
      .toColourspace("srgb") // Plutão é monocromático: grava em RGB para o shader tratar todos iguais
      .resize(w, w / 2, { kernel: "lanczos3" })
      .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer();
    fs.writeFileSync(path.join(OUT, `${name}.jpg`), jpg);
    const ktxSize = await writeKtx2(jpg, path.join(OUT, `${name}.ktx2`), "planet");
    console.log(`  ${name}: jpg ${kb(jpg.length)} · ktx2 ${kb(ktxSize)}`);
  }
}

async function buildRing() {
  const png = await sharp(raw(RING.src))
    .ensureAlpha()
    .resize(RING.width, RING.height, { kernel: "lanczos3", fit: "fill" })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(path.join(OUT, "saturn_ring.png"), png);
  const ktxSize = await writeKtx2(png, path.join(OUT, "saturn_ring.ktx2"), "ring");
  console.log(`  saturn_ring: png ${kb(png.length)} · ktx2 ${kb(ktxSize)}`);
}

fs.mkdirSync(OUT, { recursive: true });
console.log("Planetas (Solar System Scope, CC BY 4.0; Plutão: NASA/JHUAPL/SwRI/LPI via USGS, domínio público)");
for (const planet of PLANETS) if (want(planet.id)) await buildPlanet(planet);
if (want("ring")) await buildRing();
