#!/usr/bin/env node
/**
 * Pipeline de texturas do globo (D02/D09).
 *
 * Entrada: arquivos originais em <repo>/assets-src/raw (ver assets-src/README.md para as URLs).
 * Saída:   apps/web/public/textures/** em JPG/PNG (fallback) e KTX2 (Basis Universal), e o
 *          transcoder Basis em apps/web/public/basis/.
 *
 * Convenções:
 *  - Equiretangular, longitude −180° à esquerda, norte em cima (padrão NASA).
 *  - KTX2 é gravado com o eixo Y invertido (isYFlip), porque o KTX2Loader usa flipY = false;
 *    assim a orientação no globo é a mesma do JPG/PNG carregado pelo TextureLoader.
 *  - Cor (dia, noite, nuvens, paleomapas) em sRGB; superfície (elevação, água, profundidade)
 *    é dado linear.
 *
 * Uso: pnpm --filter web textures:build
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import h5wasm from "h5wasm/node";
import { encodeToKTX2 } from "ktx2-encoder";

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, "../..");
const RAW = path.resolve(WEB, "../../assets-src/raw");
const OUT = path.join(WEB, "public/textures");
const only = process.argv.slice(2);

const SRC = {
  day: "nasa_world.topo.bathy.200407.3x5400x2700.jpg",
  bath: "nasa_gebco_08_rev_bath_5400x2700.jpg",
  elev: "nasa_gebco_08_rev_elev_5400x2700.jpg",
  clouds: "nasa_cloud_combined_2048.jpg",
  paleoZip: "Scotese_Wright_2018_Maps_1-88_1degX1deg_PaleoDEMS_nc.zip",
};

/** Mapas PALEOMAP usados pelas eras geológicas do app (paleo-data.ts). */
export const PALEO_MAPS = [
  { ma: 250, file: "Map49_PALEOMAP_1deg_Permo-Triassic Boundary_250Ma.nc", climate: "arid" },
  { ma: 200, file: "Map43_PALEOMAP_1deg_Late_Triassic_200Ma.nc", climate: "arid" },
  { ma: 150, file: "Map33_PALEOMAP_1deg_Late_Jurassic_150Ma.nc", climate: "warm" },
  { ma: 66, file: "Map16_PALEOMAP_1deg_KT_Boundary_65Ma.nc", climate: "warm" },
];

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
  /** Foto colorida em alta qualidade: UASTC + RDO + Zstandard. */
  color: { isUASTC: true, isSetKTX2SRGBTransferFunc: true, isPerceptual: true, generateMipmap: true, isYFlip: true, enableRDO: true, rdoQualityLevel: 1.5, needSupercompression: true, uastcLDRQualityLevel: 2 },
  /** Cor de baixa frequência (noite, nuvens): ETC1S, bem menor. */
  compact: { isUASTC: false, isSetKTX2SRGBTransferFunc: true, isPerceptual: true, generateMipmap: true, isYFlip: true, qualityLevel: 230, compressionLevel: 4 },
  /** Dados lineares (elevação/água/profundidade): UASTC sem RDO. */
  data: { isUASTC: true, isSetKTX2SRGBTransferFunc: false, isPerceptual: false, generateMipmap: true, isYFlip: true, needSupercompression: true, uastcLDRQualityLevel: 3 },
};

async function writeKtx2(pngOrJpgBuffer, outPath, profile) {
  const bytes = await encodeToKTX2(new Uint8Array(pngOrJpgBuffer), { ...KTX[profile], enableDebug: false, imageDecoder: decodeRGBA });
  fs.writeFileSync(outPath, bytes);
  return bytes.byteLength;
}

async function emit(name, pipeline, { format, profile }) {
  const buf = format === "jpg"
    ? await pipeline.clone().jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer()
    : format === "webp"
    ? await pipeline.clone().webp({ quality: 88, alphaQuality: 95, effort: 6 }).toBuffer()
    : await pipeline.clone().png({ compressionLevel: 9 }).toBuffer();
  const fallback = path.join(OUT, `${name}.${format}`);
  fs.mkdirSync(path.dirname(fallback), { recursive: true });
  fs.writeFileSync(fallback, buf);
  const ktxSize = await writeKtx2(buf, path.join(OUT, `${name}.ktx2`), profile);
  console.log(`  ${name}: ${format} ${kb(buf.length)} · ktx2 ${kb(ktxSize)} (${profile})`);
}

async function buildDay() {
  console.log("Dia (Blue Marble Next Generation, julho de 2004, com relevo e batimetria)");
  for (const [q, w] of [["4k", 4096], ["2k", 2048]]) {
    if (!want("day") && !want(`day${q}`)) continue;
    await emit(`earth_day_${q}`, sharp(raw(SRC.day)).resize(w, w / 2, { kernel: "lanczos3" }), { format: "jpg", profile: "color" });
  }
}

async function buildNight() {
  console.log("Noite (Earth at Night / Black Marble, NASA) — reaproveita os JPG atuais");
  for (const q of ["4k", "2k"]) {
    const jpg = fs.readFileSync(path.join(OUT, `earth_night_${q}.jpg`));
    const size = q === "4k" ? 4096 : 2048;
    const meta = await sharp(jpg).metadata();
    // Basis exige blocos 4×4 e o app espera 2:1; reamostra só se precisar.
    const src = meta.width === size ? jpg : await sharp(jpg).resize(size, size / 2, { kernel: "lanczos3" }).jpeg({ quality: 90 }).toBuffer();
    const ktxSize = await writeKtx2(src, path.join(OUT, `earth_night_${q}.ktx2`), "compact");
    console.log(`  earth_night_${q}: ktx2 ${kb(ktxSize)} (compact)`);
  }
}

/**
 * Superfície 2048×1024 (linear): R = elevação em terra (GEBCO 08, 0 = nível do mar),
 * G = água (GEBCO batimetria < 0 m, inclui mares interiores e grandes lagos),
 * B = profundidade do oceano (0 = raso, 255 = fossa).
 */
async function buildSurface() {
  console.log("Superfície (GEBCO 08: elevação, máscara de água e profundidade)");
  const W = 2048, H = 1024;
  // extractChannel(0) garante 1 canal: o sharp devolve RGB ao reamostrar um raster de 1 canal.
  const single = async (pipeline) => {
    const { data, info } = await pipeline.extractChannel(0).raw().toBuffer({ resolveWithObject: true });
    if (info.channels !== 1 || info.width !== W || info.height !== H) throw new Error(`raster inesperado ${JSON.stringify(info)}`);
    return data;
  };
  const gray = (f) => single(sharp(raw(f)).resize(W, H, { kernel: "lanczos3" }));
  // A máscara é calculada na resolução original e depois reduzida: borda suave, sem serrilhado.
  const bathFull = await sharp(raw(SRC.bath)).greyscale().raw().toBuffer({ resolveWithObject: true });
  const maskFull = Buffer.alloc(bathFull.data.length);
  for (let i = 0; i < maskFull.length; i++) maskFull[i] = bathFull.data[i] < 254 ? 255 : 0;
  const water = await single(
    sharp(maskFull, { raw: { width: bathFull.info.width, height: bathFull.info.height, channels: 1 } }).resize(W, H, { kernel: "cubic" })
  );
  const [elev, bath] = await Promise.all([gray(SRC.elev), gray(SRC.bath)]);
  const rgb = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    rgb[i * 3] = water[i] > 127 ? 0 : elev[i];
    rgb[i * 3 + 1] = water[i];
    rgb[i * 3 + 2] = water[i] > 0 ? 255 - bath[i] : 0;
  }
  await emit("earth_surface_2k", sharp(rgb, { raw: { width: W, height: H, channels: 3 } }), { format: "png", profile: "data" });
}

async function buildClouds() {
  console.log("Nuvens (Blue Marble 2002, MODIS/Terra, composição de nuvens)");
  await emit("earth_clouds_2k", sharp(raw(SRC.clouds)).greyscale(), { format: "jpg", profile: "compact" });
}

// ---------------------------------------------------------------------------------------------
// Paleogeografia (PALEOMAP PaleoDEM, Scotese & Wright 2018, CC BY 4.0)

function readPaleoDem(ncPath) {
  const f = new h5wasm.File(ncPath, "r");
  const lon = Array.from(f.get("lon").value);
  const lat = Array.from(f.get("lat").value);
  const z = f.get("z").value; // [lat][lon], lat crescente (−90 → 90)
  f.close();
  return { lon, lat, z, nLon: lon.length, nLat: lat.length };
}

/** Amostragem bicúbica (Catmull-Rom) da grade de 1°, com longitude circular. */
function makeSampler(dem) {
  const { z, nLon, nLat, lon, lat } = dem;
  const lon0 = lon[0], dLon = lon[1] - lon[0], lat0 = lat[0], dLat = lat[1] - lat[0];
  const wrap = nLon - (Math.abs(lon[nLon - 1] - lon[0] - 360) < 1e-6 ? 1 : 0); // ignora a coluna duplicada em 180°
  const get = (j, i) => z[Math.min(nLat - 1, Math.max(0, j)) * nLon + (((i % wrap) + wrap) % wrap)];
  const cr = (p0, p1, p2, p3, t) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  return (la, lo) => {
    const fx = (lo - lon0) / dLon, fy = (la - lat0) / dLat;
    const i = Math.floor(fx), j = Math.floor(fy), tx = fx - i, ty = fy - j;
    const rows = [-1, 0, 1, 2].map((dj) => cr(get(j + dj, i - 1), get(j + dj, i), get(j + dj, i + 1), get(j + dj, i + 2), tx));
    return cr(rows[0], rows[1], rows[2], rows[3], ty);
  };
}

const lerp = (a, b, t) => a + (b - a) * t;
function ramp(stops, v) {
  if (v <= stops[0][0]) return stops[0][1];
  for (let k = 1; k < stops.length; k++) {
    if (v <= stops[k][0]) {
      const t = (v - stops[k - 1][0]) / (stops[k][0] - stops[k - 1][0]);
      return stops[k - 1][1].map((c, n) => lerp(c, stops[k][1][n], t));
    }
  }
  return stops[stops.length - 1][1];
}

// Oceano calibrado pelos tons do Blue Marble com batimetria (mesma linguagem visual do presente).
const OCEAN = [[-6000, [4, 10, 30]], [-4000, [6, 14, 37]], [-2000, [10, 28, 70]], [-200, [22, 62, 118]], [-50, [40, 104, 150]], [0, [62, 132, 160]]];
// Terra: hipsometria; clima árido (Permo-Triássico) puxa para ocre, clima quente e úmido para verde.
const LAND = {
  arid: [[0, [150, 128, 84]], [300, [168, 132, 82]], [1000, [146, 106, 70]], [2500, [118, 92, 72]], [4000, [150, 140, 132]], [6000, [210, 206, 200]]],
  warm: [[0, [70, 98, 50]], [300, [96, 112, 62]], [1000, [132, 120, 80]], [2500, [116, 96, 76]], [4000, [150, 140, 132]], [6000, [210, 206, 200]]],
};

async function buildPaleo() {
  console.log("Paleogeografia (PALEOMAP PaleoDEM, Scotese & Wright 2018, CC BY 4.0)");
  await h5wasm.ready;
  const { default: AdmZip } = await import("adm-zip").catch(() => ({ default: null }));
  const zipPath = raw(SRC.paleoZip);
  const tmp = fs.mkdtempSync(path.join((await import("node:os")).tmpdir(), "paleodem-"));
  const entries = AdmZip ? new AdmZip(zipPath).getEntries() : null;
  if (!entries) throw new Error("adm-zip é necessário para ler o zip do PaleoDEM");

  const W = 2048, H = 1024;
  for (const map of PALEO_MAPS) {
    const entry = entries.find((e) => e.entryName.endsWith("/" + map.file));
    if (!entry) throw new Error(`${map.file} não está no zip`);
    const nc = path.join(tmp, `${map.ma}.nc`);
    fs.writeFileSync(nc, entry.getData());
    const sample = makeSampler(readPaleoDem(nc));

    // Elevação reamostrada na resolução final (m).
    const elev = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      const la = 90 - ((y + 0.5) / H) * 180;
      for (let x = 0; x < W; x++) elev[y * W + x] = sample(la, ((x + 0.5) / W) * 360 - 180);
    }

    // Sombreamento (luz de noroeste), com o passo em metros corrigido pela latitude.
    const rgba = Buffer.alloc(W * H * 4);
    const cellY = (180 / H) * 111320;
    const land = LAND[map.climate];
    for (let y = 0; y < H; y++) {
      const la = 90 - ((y + 0.5) / H) * 180;
      const cellX = Math.max(1000, (360 / W) * 111320 * Math.cos((la * Math.PI) / 180));
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const e = elev[i];
        const dzdx = (elev[y * W + ((x + 1) % W)] - elev[y * W + ((x - 1 + W) % W)]) / (2 * cellX);
        const dzdy = (elev[Math.max(0, y - 1) * W + x] - elev[Math.min(H - 1, y + 1) * W + x]) / (2 * cellY);
        const exag = e > 0 ? 18 : 6;
        const nx = -dzdx * exag, ny = -dzdy * exag, nz = 1;
        const len = Math.hypot(nx, ny, nz);
        const shade = ((nx * -0.5 + ny * 0.5 + nz * 0.707) / len) / 0.707; // 1 = plano
        // Faixa de transição costeira de ~25 m para a linha de costa não serrilhar.
        const wet = Math.min(1, Math.max(0, (12 - e) / 25));
        const cOcean = ramp(OCEAN, Math.min(e, 0));
        const cLand = ramp(land, Math.max(e, 0));
        const k = e > 0 ? lerp(0.78, 1.18, Math.min(1, Math.max(0, (shade - 0.6) / 0.6))) : lerp(0.9, 1.06, Math.min(1, Math.max(0, (shade - 0.8) / 0.4)));
        for (let n = 0; n < 3; n++) rgba[i * 4 + n] = Math.max(0, Math.min(255, Math.round(lerp(cLand[n], cOcean[n], wet) * k)));
        rgba[i * 4 + 3] = Math.round(wet * 255); // A = água (reflexo do Sol no shader)
      }
    }
    await emit(`paleo/paleo_${map.ma}ma`, sharp(rgba, { raw: { width: W, height: H, channels: 4 } }), { format: "webp", profile: "data_rgba" });
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}
// Paleomapas: cor em sRGB com alfa = água; UASTC preserva o alfa sem misturar canais.
KTX.data_rgba = { isUASTC: true, isSetKTX2SRGBTransferFunc: true, isPerceptual: true, generateMipmap: true, isYFlip: true, enableRDO: true, rdoQualityLevel: 1, needSupercompression: true, uastcLDRQualityLevel: 2 };

function copyBasisTranscoder() {
  const dir = path.join(WEB, "node_modules/three/examples/jsm/libs/basis");
  const dest = path.join(WEB, "public/basis");
  fs.mkdirSync(dest, { recursive: true });
  for (const f of ["basis_transcoder.js", "basis_transcoder.wasm"]) fs.copyFileSync(path.join(dir, f), path.join(dest, f));
  console.log("Transcoder Basis copiado para public/basis/");
}

if (want("day") || want("day4k") || want("day2k")) await buildDay();
if (want("night")) await buildNight();
if (want("surface")) await buildSurface();
if (want("clouds")) await buildClouds();
if (want("paleo")) await buildPaleo();
if (want("basis")) copyBasisTranscoder();
