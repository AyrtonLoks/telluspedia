/**
 * T45 — Orçamento automatizado de texturas estáticas (`public/textures/`) e folga preventiva
 * abaixo do teto de 600 linhas do T36 em `apps/web/src/`.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { PALEO_ERAS } from "../src/lib/paleo-eras";
import { pickEarthTextureSet, DEFAULT_PALEO_TEXTURE } from "../src/lib/textures/earthTextureSet";
import { textureSource } from "../src/lib/textures/globeTextures";
import {
  PLANET_TEXTURE_QUALITIES,
  SATURN_RING_TEXTURE,
  planetTexturePath,
} from "../src/lib/textures/planetTextures";
import type { PlanetId } from "../src/lib/planet-orientation";

const webRoot = path.resolve(__dirname, "..");
const texturesRoot = path.join(webRoot, "public/textures");

const MAX_TOTAL_TEXTURES_BYTES = 24 * 1024 * 1024; // 24 MiB (reduzido de 28 MiB na T45)
const MAX_4K_KTX2_BYTES = 6.5 * 1024 * 1024;
const MAX_STANDARD_TEXTURE_BYTES = 2.2 * 1024 * 1024;
const MAX_PALEO_FALLBACK_BYTES = 300 * 1024; // WebP RGBA <= 300 KiB cada
const ALLOWED_PNG_ASSETS = new Set([
  "earth_surface_2k.png", // canais lineares R=elevação, G=água, B=batimetria (lossless obrigatório)
  "planets/saturn_ring.png", // faixa 1D com transparência (~9 KiB)
]);

function walkFiles(dir: string, baseDir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, baseDir));
    else out.push(path.relative(baseDir, full).replaceAll(path.sep, "/"));
  }
  return out.sort();
}

function collectExpectedTextureAssets(): Set<string> {
  const expected = new Set<string>();
  const addPublicPath = (publicUrl: string) => {
    assert.ok(publicUrl.startsWith("/textures/"), `Caminho fora de /textures/: ${publicUrl}`);
    expected.add(publicUrl.slice("/textures/".length));
  };

  // Terra 4K e 2K (KTX2 + fallback)
  for (const maxSize of [16384, 4096]) {
    const set = pickEarthTextureSet(maxSize);
    for (const src of [set.day, set.night, set.surface, set.clouds]) {
      addPublicPath(src.ktx2);
      addPublicPath(src.fallback);
    }
  }

  // Lua
  addPublicPath("/textures/moon.jpg");

  // Paleogeografia (KTX2 + WebP RGBA fallback)
  const paleoUrls = new Set<string>([
    DEFAULT_PALEO_TEXTURE,
    ...Object.values(PALEO_ERAS).map((era) => era.textureUrl),
  ]);
  for (const url of paleoUrls) {
    const src = textureSource(url);
    addPublicPath(src.ktx2);
    addPublicPath(src.fallback);
  }

  // Planetas + anéis de Saturno (KTX2 + fallback)
  for (const [id, qualities] of Object.entries(PLANET_TEXTURE_QUALITIES) as Array<
    [PlanetId, readonly ("1k" | "2k")[]]
  >) {
    for (const q of qualities) {
      const src = textureSource(planetTexturePath(id, q));
      addPublicPath(src.ktx2);
      addPublicPath(src.fallback);
    }
  }
  const ring = textureSource(SATURN_RING_TEXTURE);
  addPublicPath(ring.ktx2);
  addPublicPath(ring.fallback);

  return expected;
}

describe("T45 · orçamento de texturas estáticas e modularização preventiva", () => {
  test("public/textures/ não possui arquivos órfãos nem faltantes em relação ao catálogo ativo", () => {
    const actual = new Set(walkFiles(texturesRoot, texturesRoot));
    const expected = collectExpectedTextureAssets();

    const orphans = [...actual].filter((f) => !expected.has(f));
    const missing = [...expected].filter((f) => !actual.has(f));

    assert.deepEqual(orphans, [], `Arquivos órfãos em public/textures/: ${orphans.join(", ")}`);
    assert.deepEqual(missing, [], `Texturas declaradas ausentes em public/textures/: ${missing.join(", ")}`);
  });

  test("public/textures/ respeita teto total (<= 24 MiB), limites individuais e restrição de PNGs pesados", () => {
    const files = walkFiles(texturesRoot, texturesRoot);
    let totalBytes = 0;

    for (const rel of files) {
      const size = fs.statSync(path.join(texturesRoot, rel)).size;
      totalBytes += size;

      const maxForFile = rel === "earth_day_4k.ktx2" ? MAX_4K_KTX2_BYTES : MAX_STANDARD_TEXTURE_BYTES;
      assert.ok(
        size <= maxForFile,
        `${rel} (${(size / 1024).toFixed(0)} KiB) excede o teto de ${(maxForFile / 1024).toFixed(0)} KiB`
      );

      if (rel.startsWith("paleo/") && rel.endsWith(".webp")) {
        assert.ok(
          size <= MAX_PALEO_FALLBACK_BYTES,
          `${rel} (${(size / 1024).toFixed(0)} KiB) excede o teto de 300 KiB para fallback paleo`
        );
      }

      if (rel.endsWith(".png")) {
        assert.ok(
          ALLOWED_PNG_ASSETS.has(rel),
          `PNG não autorizado em public/textures/: ${rel} (prefira WebP/JPG + KTX2)`
        );
      }
    }

    assert.ok(
      totalBytes <= MAX_TOTAL_TEXTURES_BYTES,
      `Total de public/textures/ (${(totalBytes / (1024 * 1024)).toFixed(2)} MiB) excede o orçamento de 24 MiB`
    );
  });

  test("nenhum arquivo .ts/.tsx em apps/web/src/ ultrapassa 520 linhas (folga segura abaixo do teto T36)", () => {
    const srcDir = path.join(webRoot, "src");
    const files = walkFiles(srcDir, srcDir).filter((f) => /\.(ts|tsx)$/.test(f));
    const oversized = files
      .map((rel) => {
        const lines = fs.readFileSync(path.join(srcDir, rel), "utf-8").split("\n").length;
        return [rel, lines] as const;
      })
      .filter(([, lines]) => lines > 520);

    assert.deepEqual(oversized, []);
  });
});
