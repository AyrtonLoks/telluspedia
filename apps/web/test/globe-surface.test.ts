import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pickEarthTextureSet, DEFAULT_PALEO_TEXTURE } from "../src/components/globe/EarthSphere";
import { CLOUD_RADIUS, cloudOpacityTarget } from "../src/components/globe/CloudLayer";
import { textureSource } from "../src/lib/textures/globeTextures";
import { PALEO_ERAS } from "../src/lib/paleo-data";
import { EarthShader } from "../src/components/globe/EarthShaderMaterial";
import { ATMOSPHERE_RADIUS } from "../src/components/globe/Atmosphere";

const root = path.resolve(__dirname, "..");
const read = (f: string) => fs.readFileSync(path.join(root, f), "utf-8");

/** Decodificador mínimo de PNG (8 bits, RGB/RGBA/cinza, sem entrelaçamento) — só para os testes. */
function decodePng(file: string) {
  const buf = fs.readFileSync(file);
  let p = 8;
  let width = 0, height = 0, colorType = 0;
  const idat: Buffer[] = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      assert.equal(data[8], 8, "8 bits por canal");
      assert.equal(data[12], 0, "sem entrelaçamento");
    } else if (type === "IDAT") idat.push(data);
    p += 12 + len;
  }
  const channels = colorType === 2 ? 3 : colorType === 6 ? 4 : colorType === 0 ? 1 : 0;
  assert.ok(channels > 0, `tipo de cor ${colorType} não suportado`);
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)];
    const row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[y * stride + x - channels] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0;
      let v = row[x];
      if (f === 1) v += a;
      else if (f === 2) v += b;
      else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      out[y * stride + x] = v & 255;
    }
  }
  const at = (lat: number, lng: number) => {
    const x = Math.min(width - 1, Math.floor(((lng + 180) / 360) * width));
    const y = Math.min(height - 1, Math.floor(((90 - lat) / 180) * height));
    return Array.from(out.subarray((y * width + x) * channels, (y * width + x) * channels + channels));
  };
  return { width, height, channels, data: out, at };
}

/** Cabeçalho KTX2 (Khronos): identificador, dimensões, níveis de mipmap, supercompressão e DFD. */
function readKtx2(file: string) {
  const buf = fs.readFileSync(file);
  const id = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
  assert.deepEqual(Array.from(buf.subarray(0, 12)), id, `${file} é KTX2`);
  const u32 = (o: number) => buf.readUInt32LE(o);
  const dfdOffset = u32(48);
  return {
    vkFormat: u32(12),
    width: u32(20),
    height: u32(24),
    levels: u32(40),
    supercompression: u32(44),
    /** KHR_DF_TRANSFER: 1 = linear, 2 = sRGB. */
    transfer: buf[dfdOffset + 4 + 8 + 2],
    /** KHR_DF_MODEL: 163 = ETC1S, 166 = UASTC. */
    colorModel: buf[dfdOffset + 4 + 8],
  };
}

describe("D02: assets do globo", () => {
  test("conjunto de texturas por capacidade da GPU (4k com maxTextureSize ≥ 8192), KTX2 + fallback", () => {
    assert.equal(pickEarthTextureSet(16384).quality, "4k");
    assert.deepEqual(pickEarthTextureSet(8192).day, { ktx2: "/textures/earth_day_4k.ktx2", fallback: "/textures/earth_day_4k.jpg" });
    assert.equal(pickEarthTextureSet(4096).quality, "2k");
    for (const q of [16384, 4096]) {
      const set = pickEarthTextureSet(q);
      for (const src of [set.day, set.night, set.surface, set.clouds]) {
        assert.ok(fs.existsSync(path.join(root, "public", src.ktx2)), `${src.ktx2} existe`);
        assert.ok(fs.existsSync(path.join(root, "public", src.fallback)), `${src.fallback} existe`);
      }
    }
    assert.deepEqual(textureSource("/a/b.png"), { ktx2: "/a/b.ktx2", fallback: "/a/b.png" });
    assert.ok(!fs.existsSync(path.join(root, "public/textures/earth_day.jpg")), "textura antiga removida");
  });

  test("KTX2: Basis com mipmaps, potência de 2 e espaço de cor correto (cor em sRGB, dados lineares)", () => {
    const tex = (f: string) => readKtx2(path.join(root, "public/textures", f));
    const color = ["earth_day_4k.ktx2", "earth_day_2k.ktx2", "earth_night_4k.ktx2", "earth_night_2k.ktx2", "earth_clouds_2k.ktx2"];
    const paleo = [...new Set(Object.values(PALEO_ERAS))].map((e) => e.textureUrl.replace("/textures/", "").replace(/\.png$/, ".ktx2"));
    for (const f of [...color, ...paleo, "earth_surface_2k.ktx2"]) {
      const k = tex(f);
      assert.equal(k.vkFormat, 0, `${f}: formato Basis (transcodificado na GPU)`);
      assert.equal(k.width, k.height * 2, `${f}: equiretangular 2:1`);
      assert.equal(k.width & (k.width - 1), 0, `${f}: largura potência de 2`);
      assert.equal(k.levels, Math.log2(k.width) + 1, `${f}: cadeia completa de mipmaps`);
      assert.ok([163, 166].includes(k.colorModel), `${f}: ETC1S ou UASTC`);
      assert.equal(k.transfer, f === "earth_surface_2k.ktx2" ? 1 : 2, `${f}: função de transferência`);
    }
    assert.equal(tex("earth_day_4k.ktx2").width, 4096);
    assert.equal(tex("earth_day_4k.ktx2").colorModel, 166, "diurna em UASTC (qualidade)");
    assert.ok(fs.existsSync(path.join(root, "public/basis/basis_transcoder.wasm")), "transcoder Basis servido em /basis/");
    assert.ok(fs.existsSync(path.join(root, "public/basis/basis_transcoder.js")));
  });

  test("carregador: KTX2 com fallback para JPG/PNG e caminho do transcoder", () => {
    const loader = read("src/lib/textures/globeTextures.ts");
    // T30: subclasse do KTX2Loader cujos workers vêm de /basis/ktx2-worker.js (CSP própria).
    assert.match(loader, /class FileWorkerKTX2Loader extends KTX2Loader/);
    assert.match(loader, /new FileWorkerKTX2Loader\(\)\.setTranscoderPath\(BASIS_TRANSCODER_PATH\)\.detectSupport\(gl\)/);
    assert.match(loader, /BASIS_TRANSCODER_PATH = "\/basis\/"/);
    assert.match(loader, /catch \(error\)[\s\S]*TextureLoader\(\)\.loadAsync\(source\.fallback\)/);
    const pipeline = read("scripts/textures/build-earth-textures.mjs");
    assert.match(pipeline, /isYFlip: true/, "KTX2 gravado invertido: o KTX2Loader usa flipY = false");
  });

  test("máscara de água (G): oceano = água, continentes e lagos coerentes", () => {
    const s = decodePng(path.join(root, "public/textures/earth_surface_2k.png"));
    assert.deepEqual([s.width, s.height], [2048, 1024]);
    for (const [name, lat, lng] of [["Pacífico", 0, -150], ["Atlântico Sul", -30, -20], ["Índico", -20, 80]] as const) {
      assert.ok(s.at(lat, lng)[1] > 200, `${name} deveria ser água`);
    }
    for (const [name, lat, lng] of [["Amazônia", -5, -60], ["Saara", 23, 10], ["Sibéria", 62, 100], ["Austrália", -25, 133]] as const) {
      assert.ok(s.at(lat, lng)[1] < 50, `${name} deveria ser terra`);
    }
    assert.ok(s.at(42, 51)[1] > 150, "Mar Cáspio é água");
  });

  test("profundidade (B): fossa das Marianas > Pacífico central > plataforma do Mar do Norte; zero em terra", () => {
    const s = decodePng(path.join(root, "public/textures/earth_surface_2k.png"));
    const mariana = s.at(11.3, 142.2)[2];
    const pacific = s.at(0, -150)[2];
    const northSea = s.at(56, 3)[2];
    assert.ok(mariana > pacific && pacific > northSea + 60, `Marianas ${mariana} × Pacífico ${pacific} × Mar do Norte ${northSea}`);
    assert.equal(s.at(-5, -60)[2], 0, "Amazônia sem profundidade");
  });

  test("nuvens: textura real da NASA, camada abaixo da atmosfera, some no modo geológico", () => {
    assert.ok(fs.statSync(path.join(root, "public/textures/earth_clouds_2k.jpg")).size > 200_000, "foto de nuvens (não procedural)");
    assert.ok(CLOUD_RADIUS > 1 && CLOUD_RADIUS < ATMOSPHERE_RADIUS);
    assert.equal(cloudOpacityTarget(true, false, false), 0.92);
    assert.equal(cloudOpacityTarget(true, true, false), 0, "sem nuvens de 2001 sobre a Pangeia");
    assert.equal(cloudOpacityTarget(false, false, false), 0);
    assert.ok(cloudOpacityTarget(true, false, true) < 0.5, "discretas na iluminação de estudo");
    const layer = read("src/components/globe/CloudLayer.tsx");
    assert.match(layer, /vNormal = normalize\(\(modelMatrix \* vec4\(normal, 0\.0\)\)\.xyz\)/);
    assert.doesNotMatch(layer, /normalMatrix/);
    assert.match(layer, /useSunDirection\(\)/);
    assert.match(layer, /raycast=\{\(\) => null\}/, "não intercepta cliques no globo");
    const canvas = read("src/components/globe/GlobeCanvas.tsx");
    assert.match(canvas, /<CloudLayer enabled=\{showClouds\} geological=\{isGeological\} studyLighting=\{studyLighting\} \/>/);
    assert.match(canvas, /aria-pressed=\{showClouds\}/);
    assert.match(canvas, /"Nuvens"|>\s*Nuvens\s*</);
  });

  test("elevação (R): Himalaia e Andes acima da Amazônia e do oceano", () => {
    const s = decodePng(path.join(root, "public/textures/earth_surface_2k.png"));
    const himalaya = s.at(32, 87)[0];
    const andes = s.at(-16, -69)[0];
    const amazon = s.at(-4, -62)[0];
    const ocean = s.at(0, -150)[0];
    assert.ok(himalaya > amazon + 60, `Tibete ${himalaya} × Amazônia ${amazon}`);
    assert.ok(andes > amazon + 40, `Altiplano ${andes} × Amazônia ${amazon}`);
    assert.ok(ocean <= amazon, "oceano não tem elevação acima da planície");
  });

  test("fontes e licenças documentadas", () => {
    const doc = read("../../docs/DATA_SOURCES.md");
    for (const f of ["earth_day_4k.jpg", "earth_night_4k.jpg", "earth_surface_2k.png", "earth_clouds_2k.jpg", "paleo_250ma.png"]) assert.match(doc, new RegExp(f.replace(".", "\\.")));
    assert.match(doc, /Domínio público \(NASA\)/);
    assert.match(doc, /CC BY 4\.0/);
    assert.match(doc, /Scotese/);
  });
});

describe("Paleogeografia (PALEOMAP PaleoDEM)", () => {
  // PALEO_ERAS tem apelidos (várias chaves para a mesma era); aqui interessam as definições.
  const eras = [...new Set(Object.values(PALEO_ERAS))];

  test("cada era geológica tem seu próprio paleomapa (PNG + KTX2), sem duplicatas antigas", () => {
    assert.equal(eras.length, 4);
    const urls = eras.map((e) => e.textureUrl);
    assert.equal(new Set(urls).size, urls.length, "eras diferentes, mapas diferentes");
    assert.equal(DEFAULT_PALEO_TEXTURE, PALEO_ERAS["pangea-250ma"].textureUrl);
    for (const u of urls) {
      assert.match(u, /^\/textures\/paleo\/paleo_\d+ma\.png$/);
      assert.ok(fs.existsSync(path.join(root, "public", u)), `${u} existe`);
      assert.ok(fs.existsSync(path.join(root, "public", u.replace(".png", ".ktx2"))), `${u} tem KTX2`);
    }
    for (const old of ["paleo_pangea.png", "paleo_gondwana.png", "pangea_250ma.png", "gondwana_150ma.png", "paleo/pangea_250ma.png", "paleo/pangea_250ma.jpg", "paleo/gondwana_150ma.png"]) {
      assert.ok(!fs.existsSync(path.join(root, "public/textures", old)), `${old} removido (T21)`);
    }
  });

  test("alfa = água: Panthalassa é oceano, interior do supercontinente é terra; fração de terra plausível", () => {
    for (const era of eras) {
      const s = decodePng(path.join(root, "public", era.textureUrl));
      assert.deepEqual([s.width, s.height, s.channels], [2048, 1024, 4]);
      assert.ok(s.at(0, -150)[3] > 200, `${era.eraId}: Pacífico/Panthalassa é água`);
      assert.ok(s.at(0, 10)[3] < 50, `${era.eraId}: África equatorial é terra`);
      let land = 0;
      for (let i = 3; i < s.data.length; i += 4 * 97) land += s.data[i] < 128 ? 1 : 0;
      const frac = land / Math.ceil(s.data.length / (4 * 97));
      assert.ok(frac > 0.2 && frac < 0.5, `${era.eraId}: fração de terra ${frac.toFixed(2)}`);
    }
  });
});

describe("D02: shaders", () => {
  test("reflexo especular só na água (atual ou do paleomapa) e fora da iluminação de estudo", () => {
    const fs_ = EarthShader.fragmentShader;
    assert.match(fs_, /uniform sampler2D uSurfaceTexture/);
    assert.match(fs_, /specular = vec3\([^)]*\) \* glint \* water \* uOceanSpecular/);
    assert.match(fs_, /float water = mix\(surface\.g, paleoSample\.a, uPaleoFactor\);/, "água do paleomapa no modo geológico");
    assert.match(fs_, /\(1\.0 - uStudyLighting\);\s*dayComposite \+= specular;/);
    assert.match(fs_, /float modern = 1\.0 - uPaleoFactor;/);
  });

  test("relevo só sobre terra e com normal no espaço mundial (invariante AGENTS.md §1)", () => {
    assert.match(EarthShader.fragmentShader, /relief = uReliefStrength \* modern \* \(1\.0 - water\)/);
    assert.match(EarthShader.vertexShader, /vNormal = normalize\(\(modelMatrix \* vec4\(normal, 0\.0\)\)\.xyz\)/);
    assert.doesNotMatch(EarthShader.vertexShader + EarthShader.fragmentShader, /normalMatrix/);
    assert.equal(EarthShader.uniforms.uReliefStrength.value, 1);
    assert.equal(EarthShader.uniforms.uOceanSpecular.value, 1);
  });

  test("atmosfera: casca externa, normal no espaço mundial, ativável", () => {
    assert.ok(ATMOSPHERE_RADIUS > 1 && ATMOSPHERE_RADIUS < 1.05);
    const atm = read("src/components/globe/Atmosphere.tsx");
    assert.match(atm, /vNormal = normalize\(\(modelMatrix \* vec4\(normal, 0\.0\)\)\.xyz\)/);
    assert.doesNotMatch(atm, /normalMatrix/);
    assert.match(atm, /useSunDirection\(\)/, "mesma direção do Sol que o globo (T14)");
    const canvas = read("src/components/globe/GlobeCanvas.tsx");
    assert.match(canvas, /\{showAtmosphere && <Atmosphere \/>\}/);
    assert.match(canvas, /aria-pressed=\{showAtmosphere\}/);
    assert.match(canvas, /"Atmosfera"|>\s*Atmosfera\s*</);
  });
});
