import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { pickEarthTextureSet } from "../src/components/globe/EarthSphere";
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
  return { width, height, at };
}

describe("D02: assets do globo", () => {
  test("conjunto de texturas por capacidade da GPU (4k com maxTextureSize ≥ 8192)", () => {
    assert.equal(pickEarthTextureSet(16384).quality, "4k");
    assert.equal(pickEarthTextureSet(8192).day, "/textures/earth_day_4k.jpg");
    assert.equal(pickEarthTextureSet(4096).quality, "2k");
    for (const q of [16384, 4096]) {
      const set = pickEarthTextureSet(q);
      for (const f of [set.day, set.night, set.surface]) {
        assert.ok(fs.existsSync(path.join(root, "public", f)), `${f} existe`);
      }
    }
    assert.ok(!fs.existsSync(path.join(root, "public/textures/earth_day.jpg")), "textura antiga removida");
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
    for (const f of ["earth_day_4k.jpg", "earth_night_4k.jpg", "earth_surface_2k.png"]) assert.match(doc, new RegExp(f.replace(".", "\\.")));
    assert.match(doc, /Domínio público \(NASA\)/);
  });
});

describe("D02: shaders", () => {
  test("reflexo especular só na água, só na geografia atual e fora da iluminação de estudo", () => {
    const fs_ = EarthShader.fragmentShader;
    assert.match(fs_, /uniform sampler2D uSurfaceTexture/);
    assert.match(fs_, /specular = vec3\([^)]*\) \* glint \* water \* modern \* uOceanSpecular/);
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
    assert.match(canvas, />\s*Atmosfera\s*</);
  });
});
