import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { ASTROPHYSICAL_CATALOG, KEPLERIAN_DATA } from "../src/lib/astronomy-planets";
import {
  POSITIVE_POLE_J2000,
  SPIN_BASE_RAD_S,
  SPIN_MAX_RAD_S,
  eclipticToScene,
  planetOrientation,
  planetSpinRate,
  poleEcliptic,
  type PlanetId,
} from "../src/lib/planet-orientation";
import {
  PLANET_TEXTURE_QUALITIES,
  SATURN_RING_TEXTURE,
  acquirePlanetTexture,
  livePlanetTextureCount,
  planetTexturePath,
} from "../src/lib/textures/planetTextures";
import { textureSource } from "../src/lib/textures/globeTextures";
import { applyRingShadow, createRadialRingGeometry, createRingShadowUniforms } from "../src/components/globe/planetShading";

const root = path.resolve(__dirname, "..");
const PLANETS = Object.keys(PLANET_TEXTURE_QUALITIES) as PlanetId[];
const DEG = Math.PI / 180;

describe("D21 — eixo de rotação real", () => {
  test("o polo positivo forma com a normal da órbita a obliquidade do catálogo (±1°)", () => {
    for (const id of [...PLANETS, "EARTH" as const]) {
      const k = KEPLERIAN_DATA[id];
      const I = k.I0 * DEG;
      const O = k.Omega0 * DEG;
      const orbitNormal = new THREE.Vector3(Math.sin(I) * Math.sin(O), -Math.sin(I) * Math.cos(O), Math.cos(I));
      const angle = poleEcliptic(id).angleTo(orbitNormal) / DEG;
      assert.ok(
        Math.abs(angle - ASTROPHYSICAL_CATALOG[id].axialTiltDeg) < 1,
        `${id}: ${angle.toFixed(2)}° vs ${ASTROPHYSICAL_CATALOG[id].axialTiltDeg}°`
      );
    }
  });

  test("a Terra aponta para o polo norte celeste e os retrógrados ficam de cabeça para baixo", () => {
    const earth = eclipticToScene(poleEcliptic("EARTH"));
    assert.ok(Math.abs(earth.angleTo(new THREE.Vector3(0, 1, 0)) / DEG - 23.44) < 0.01);
    for (const id of ["VENUS", "URANUS", "PLUTO"] as const) {
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(planetOrientation(id));
      assert.ok(up.y < 0.1, `${id} deve ter o polo positivo abaixo ou rente à eclíptica (y=${up.y.toFixed(2)})`);
    }
    for (const id of ["MERCURY", "MARS", "JUPITER", "SATURN", "NEPTUNE"] as const) {
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(planetOrientation(id));
      assert.ok(up.y > 0.85, `${id} gira no sentido direto (y=${up.y.toFixed(2)})`);
    }
  });

  test("todo polo é um vetor unitário e há um para cada planeta", () => {
    for (const id of PLANETS) {
      assert.ok(POSITIVE_POLE_J2000[id], id);
      assert.ok(Math.abs(poleEcliptic(id).length() - 1) < 1e-9);
    }
  });
});

describe("D21 — rotação sideral comprimida", () => {
  const still = { isPlaying: false, playbackSpeed: 30 };
  const rate = (id: PlanetId, o = still) => planetSpinRate(ASTROPHYSICAL_CATALOG[id].rotationPeriodHours, o);

  test("mantém a ordem real das velocidades (Júpiter mais rápido, Vênus mais lento)", () => {
    const order = [...PLANETS].sort((a, b) => rate(b) - rate(a));
    assert.equal(order[0], "JUPITER");
    assert.equal(order[order.length - 1], "VENUS");
    assert.ok(rate("SATURN") > rate("MARS") && rate("MARS") > rate("MERCURY"));
    assert.ok(Math.abs(planetSpinRate(24, still) - SPIN_BASE_RAD_S) < 1e-12, "dia de 24 h = velocidade de referência");
  });

  test("a reprodução acelera, com teto contra o efeito estroboscópico", () => {
    for (const id of PLANETS) {
      const s1 = rate(id, { isPlaying: true, playbackSpeed: 1 });
      const s30 = rate(id, { isPlaying: true, playbackSpeed: 30 });
      const s365 = rate(id, { isPlaying: true, playbackSpeed: 365 });
      assert.ok(s1 <= s30 && s30 <= s365, id);
      assert.ok(s365 <= SPIN_MAX_RAD_S, id);
      assert.ok(rate(id) > 0, id);
    }
  });

  test("movimento reduzido para a rotação; período inválido não gira", () => {
    assert.equal(planetSpinRate(10, { ...still, reducedMotion: true }), 0);
    assert.equal(planetSpinRate(0, still), 0);
    assert.equal(planetSpinRate(Number.NaN, still), 0);
  });
});

describe("D21 — texturas geradas", () => {
  const file = (url: string) => path.join(root, "public", url);
  const KTX2_MAGIC = Buffer.from([0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a]);

  function jpegSize(p: string) {
    const b = fs.readFileSync(p);
    let i = 2;
    while (i < b.length) {
      const marker = b[i + 1];
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xc2) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      i += 2 + len;
    }
    throw new Error(`sem SOF em ${p}`);
  }

  test("cada planeta tem JPG 2:1 e KTX2 em todas as qualidades declaradas", () => {
    for (const id of PLANETS) {
      for (const q of PLANET_TEXTURE_QUALITIES[id]) {
        const src = textureSource(planetTexturePath(id, q));
        const { width, height } = jpegSize(file(src.fallback));
        assert.equal(width, q === "2k" ? 2048 : 1024, `${src.fallback} largura`);
        assert.equal(width, height * 2, `${src.fallback} deve ser equiretangular 2:1`);
        const ktx = fs.readFileSync(file(src.ktx2));
        assert.ok(ktx.subarray(0, 12).equals(KTX2_MAGIC), `${src.ktx2} não é KTX2`);
        assert.equal(ktx.readUInt32LE(20), width, `${src.ktx2} largura`);
        assert.equal(ktx.readUInt32LE(24), height, `${src.ktx2} altura`);
      }
    }
  });

  test("Plutão (só 1K) cai para a maior qualidade disponível", () => {
    assert.equal(planetTexturePath("PLUTO", "2k"), "/textures/planets/pluto_1k.jpg");
    assert.equal(planetTexturePath("MARS", "2k"), "/textures/planets/mars_2k.jpg");
  });

  test("anel de Saturno: PNG com alfa e KTX2 em blocos de 4×4", () => {
    const png = fs.readFileSync(file(SATURN_RING_TEXTURE));
    assert.equal(png.readUInt32BE(16), 1024);
    assert.equal(png.readUInt32BE(20), 64);
    assert.equal(png[25], 6, "RGBA");
    const ktx = fs.readFileSync(file(textureSource(SATURN_RING_TEXTURE).ktx2));
    assert.ok(ktx.subarray(0, 12).equals(KTX2_MAGIC));
  });

  test("créditos e licenças documentados", () => {
    const sources = fs.readFileSync(path.join(root, "../../docs/DATA_SOURCES.md"), "utf-8");
    assert.match(sources, /Solar System Scope/);
    assert.match(sources, /CC BY 4\.0/);
    assert.match(sources, /New Horizons/);
    const readme = fs.readFileSync(path.join(root, "../../assets-src/README.md"), "utf-8");
    for (const f of ["2k_mars.jpg", "2k_saturn_ring_alpha.png", "pluto_usgs_1024.jpg"]) assert.ok(readme.includes(f), f);
  });
});

describe("D21 — ciclo de vida das texturas (zero leak)", () => {
  const gl = {} as THREE.WebGLRenderer;
  function fakeLoader() {
    const made: Array<{ texture: THREE.Texture; disposed: boolean; resolve: () => void }> = [];
    const load = () =>
      new Promise<THREE.Texture>((resolve) => {
        const texture = new THREE.Texture();
        const entry = { texture, disposed: false, resolve: () => resolve(texture) };
        texture.addEventListener("dispose", () => (entry.disposed = true));
        made.push(entry);
      });
    return { made, load };
  }

  test("compartilha entre usuários e descarta quando o último solta", async () => {
    const { made, load } = fakeLoader();
    const a = acquirePlanetTexture(gl, "/t/a.jpg", load);
    const b = acquirePlanetTexture(gl, "/t/a.jpg", load);
    assert.equal(made.length, 1, "uma carga só");
    made[0].resolve();
    await a.promise;
    a.release();
    a.release(); // idempotente
    assert.equal(made[0].disposed, false);
    b.release();
    assert.equal(made[0].disposed, true);
    assert.equal(livePlanetTextureCount(gl), 0);
  });

  test("solta antes de terminar de carregar: descarta ao chegar", async () => {
    const { made, load } = fakeLoader();
    const a = acquirePlanetTexture(gl, "/t/b.jpg", load);
    a.release();
    made[0].resolve();
    await a.promise;
    assert.equal(made[0].disposed, true);
    assert.equal(livePlanetTextureCount(gl), 0);
  });
});

describe("D21 — sombras dos anéis", () => {
  test("os pontos de injeção existem no shader do MeshStandardMaterial", () => {
    const { vertexShader, fragmentShader } = THREE.ShaderLib.standard;
    assert.ok(vertexShader.includes("#include <project_vertex>"));
    assert.ok(vertexShader.includes("#include <common>"));
    assert.ok(fragmentShader.includes("#include <lights_fragment_end>"));
    assert.ok(fragmentShader.includes("#include <common>"));
  });

  test("planeta recebe a sombra do anel; anel recebe a do planeta", () => {
    const uniforms = createRingShadowUniforms();
    const planet = applyRingShadow(new THREE.MeshStandardMaterial(), uniforms, "planet");
    const ring = applyRingShadow(new THREE.MeshStandardMaterial(), uniforms, "ring");
    assert.ok("SHADOW_ON_PLANET" in planet.defines!);
    assert.ok(!("SHADOW_ON_PLANET" in ring.defines!));
    assert.notEqual(planet.customProgramCacheKey(), ring.customProgramCacheKey());
    const shader = {
      uniforms: {},
      vertexShader: THREE.ShaderLib.standard.vertexShader,
      fragmentShader: THREE.ShaderLib.standard.fragmentShader,
    } as unknown as THREE.WebGLProgramParametersWithUniforms;
    planet.onBeforeCompile(shader, {} as THREE.WebGLRenderer);
    assert.match(shader.vertexShader, /vShadowWorld = \(modelMatrix/);
    assert.match(shader.fragmentShader, /reflectedLight\.directDiffuse \*= ringShadow/);
    assert.ok("uRingMap" in shader.uniforms);
  });

  test("anel com UV radial (u = 0 dentro, 1 fora) no plano equatorial", () => {
    const g = createRadialRingGeometry(1.22, 2.3, 16);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      assert.ok(Math.abs(pos.getY(i)) < 1e-9, "no plano XZ");
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      assert.ok(Math.abs(uv.getX(i) - (r - 1.22) / (2.3 - 1.22)) < 1e-6);
    }
    g.dispose();
  });
});

describe("D21 — carregamento sob demanda", () => {
  test("nenhuma textura de planeta é referenciada fora do Cosmos", () => {
    const sys = fs.readFileSync(path.join(root, "src/components/globe/PlanetarySystem.tsx"), "utf-8");
    assert.match(sys, /if \(!isCosmicMode\) return null;/);
    assert.match(sys, /<PlanetBody/);
    const body = fs.readFileSync(path.join(root, "src/components/globe/PlanetBody.tsx"), "utf-8");
    assert.match(body, /usePlanetTexture\(focused \? planetTexturePath\(id, "2k"\) : null\)/, "2K só em foco");
    assert.match(body, /\.dispose\(\)/);
  });
});

describe("D21 — origem do Sol para as sombras", () => {
  test("o Sol é a origem do planetary-system, não o grupo posicionado no planeta", async () => {
    const { solarOrigin } = await import("../src/components/globe/PlanetBody");
    const root = new THREE.Group();
    root.name = "planetary-system";
    root.position.set(5, 0, 0); // como na descida de volta à Terra (D17)
    const planetGroup = new THREE.Group();
    const positioned = new THREE.Group();
    positioned.position.set(100, 0, -40);
    const anchor = new THREE.Group();
    root.add(planetGroup);
    planetGroup.add(positioned);
    positioned.add(anchor);
    root.updateMatrixWorld(true);
    const sun = solarOrigin(anchor).getWorldPosition(new THREE.Vector3());
    assert.deepEqual(sun.toArray(), [5, 0, 0]);
    assert.notDeepEqual(anchor.getWorldPosition(new THREE.Vector3()).toArray(), sun.toArray());
    assert.throws(() => solarOrigin(new THREE.Group()));
  });
});

describe("D21 — halo de seleção", () => {
  test("fica por fora dos anéis de Saturno e Urano", async () => {
    const { focusHaloRatio, RING_RATIOS } = await import("../src/lib/cosmic-scale");
    assert.ok(focusHaloRatio("SATURN") > RING_RATIOS.SATURN[1]);
    assert.ok(focusHaloRatio("URANUS") > RING_RATIOS.URANUS[1]);
    assert.equal(focusHaloRatio("MARS"), 1.35);
  });
});
