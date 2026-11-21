/**
 * D17 — Movimento e transições: tokens, animações de painel, transição orbital Terra ↔ Cosmos
 * (sem NaN, sem cortar planetas) e skeletons de carregamento.
 */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import * as THREE from "three";
import { renderToStaticMarkup } from "react-dom/server";
import {
  easeInOutCubic,
  interpolateOrbit,
  orbitTransitionDuration,
  reanchorOrbit,
  prefersReducedMotion,
  type OrbitState,
} from "../src/lib/camera-transition";
import { MOTION_MS } from "../src/components/ui/motion";
import { Skeleton, PanelSkeleton, ModalSkeleton } from "../src/components/ui/Skeleton";
import tailwindConfig from "../tailwind.config";

const root = path.join(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf-8");
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

describe("D17: tokens de movimento", () => {
  test("durações em TS, CSS e Tailwind são as mesmas", () => {
    const css = read("src/styles/globals.css");
    for (const [k, ms] of Object.entries(MOTION_MS)) {
      assert.match(css, new RegExp(`--duration-${k}: ${ms}ms;`), `--duration-${k}`);
    }
    const extend = (tailwindConfig as { theme: { extend: Record<string, Record<string, string>> } }).theme.extend;
    assert.deepEqual(extend.transitionDuration, { fast: "120ms", base: "200ms", slow: "320ms" });
    for (const name of ["fade", "panel", "sheet", "pop", "rise"]) {
      assert.ok(extend.keyframes[`${name}-in`] && extend.keyframes[`${name}-out`], name);
      assert.match(extend.animation[`${name}-in`], /var\(--duration-(base|slow)\) var\(--ease-out\)/);
      assert.match(extend.animation[`${name}-out`], /var\(--duration-fast\) var\(--ease-in-out\)/);
    }
  });

  test("nenhum componente usa classes de animação que não existem no projeto (animate-in, slide-in-from…)", () => {
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".tsx") ? [path.join(dir, e.name)] : []
      );
    for (const f of walk(path.join(root, "src/components"))) {
      assert.doesNotMatch(fs.readFileSync(f, "utf-8"), /\banimate-in\b|\banimate-out\b|slide-in-from-|zoom-in-\d/, path.relative(root, f));
    }
  });

  test("movimento reduzido: CSS zera animações e transições; JS desliga as esperas", () => {
    assert.match(read("src/styles/globals.css"), /prefers-reduced-motion: reduce[\s\S]*animation-duration: 0\.01ms[\s\S]*transition-duration: 0\.01ms/);
    assert.equal(prefersReducedMotion(), false, "no servidor não há preferência");
    assert.match(read("src/components/ui/motion.ts"), /prefersReducedMotion\(\)[\s\S]*setMounted\(false\)/);
    assert.doesNotMatch(read("src/components/ui/motion.ts") + read("src/lib/reduced-motion.ts"), /from "three"|camera-transition/, "o shell não puxa three.js");
    assert.match(read("src/components/globe/CosmicCameraController.tsx"), /prefersReducedMotion\(\) \? 0/);
    assert.match(read("src/components/globe/CameraFlyToController.tsx"), /prefersReducedMotion\(\)/);
  });
});

describe("D17: painéis abrem e fecham animados", () => {
  test("dock, player de cenas e modais ficam montados durante a saída", () => {
    const shell = read("src/components/shell/GlobeExperienceShell.tsx");
    for (const p of ["dockPresence", "scenePresence", "readerPresence", "comparatorPresence", "sharePresence", "citationPresence"]) {
      assert.match(shell, new RegExp(`${p}\\.mounted &&`), p);
    }
    assert.match(read("src/components/layout/dockFrame.ts"), /animate-sheet-out lg:animate-panel-out" : "animate-sheet-in lg:animate-panel-in/);
    assert.match(read("src/components/ui/Dialog.tsx"), /data-\[state=closed\]:animate-pop-out/);
    assert.match(read("src/components/scenes/ScenePlayerOverlay.tsx"), /closing \? "animate-rise-out" : "animate-rise-in"/);
  });
});

describe("D17: transição orbital Terra ↔ Cosmos", () => {
  const earthHome = { center: v(0, 0, 0), scale: 1 };
  const earthOrbit = { center: v(-120, 0, 40), scale: 0.3 };
  const homeView: OrbitState = { target: v(0, 0, 0), camera: v(0.4, 0.8, 2.3) };
  const overview: OrbitState = { target: v(0, 0, 0), camera: v(0, 90, 160) };

  test("reancoragem mantém a Terra igual na tela (mesma direção, distância na escala da Terra)", () => {
    const anchored = reanchorOrbit(homeView, earthHome, earthOrbit);
    const off = anchored.camera.clone().sub(anchored.target);
    assert.ok(anchored.target.distanceTo(earthOrbit.center) < 1e-9);
    assert.ok(Math.abs(off.length() - homeView.camera.length() * 0.3) < 1e-9);
    assert.ok(off.normalize().distanceTo(homeView.camera.clone().normalize()) < 1e-9);
    const back = reanchorOrbit(anchored, earthOrbit, earthHome);
    assert.ok(back.camera.distanceTo(homeView.camera) < 1e-9, "ida e volta voltam ao mesmo ponto");
  });

  test("entrar no Cosmos: sem NaN, afastamento contínuo e nunca dentro de um corpo", () => {
    const from = reanchorOrbit(homeView, earthHome, earthOrbit);
    let last = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const s = interpolateOrbit(from, overview, easeInOutCubic(i / 200), earthOrbit.center);
      for (const c of [...s.camera.toArray(), ...s.target.toArray()]) assert.ok(Number.isFinite(c), `NaN em ${i}`);
      const dist = s.camera.distanceTo(earthOrbit.center);
      assert.ok(dist >= last - 1e-9, `afastamento monótono da Terra (${i})`);
      last = dist;
      assert.ok(s.camera.distanceTo(earthOrbit.center) > earthOrbit.scale * 0.999, "fora da Terra");
      assert.ok(s.camera.length() > 5, "longe do Sol");
    }
    assert.ok(interpolateOrbit(from, overview, 1, earthOrbit.center).camera.distanceTo(overview.camera) < 1e-9);
  });

  test("voltar à Terra a partir da vista geral: distância ≥ 1,5 até o fim e chegada exata", () => {
    const from = reanchorOrbit(overview, earthOrbit, earthHome);
    const home: OrbitState = { target: v(0, 0, 0), camera: v(0, 0, 2.5) };
    let last = Infinity;
    for (let i = 0; i <= 200; i++) {
      const s = interpolateOrbit(from, home, easeInOutCubic(i / 200));
      assert.ok(s.camera.length() >= 2.5 - 1e-9, `câmera ≥ 2,5 da Terra (${i})`);
      assert.ok(s.camera.length() <= last + 1e-9, `aproximação monótona (${i})`);
      last = s.camera.length();
    }
    assert.ok(interpolateOrbit(from, home, 1).camera.distanceTo(home.camera) < 1e-9);
  });

  test("casos-limite: direções opostas e câmera sobre o alvo não geram NaN", () => {
    const a: OrbitState = { target: v(0, 0, 0), camera: v(0, 0, 3) };
    const b: OrbitState = { target: v(0, 0, 0), camera: v(0, 0, -3) };
    const mid = interpolateOrbit(a, b, 0.5);
    assert.ok(mid.camera.toArray().every(Number.isFinite));
    assert.ok(Math.abs(mid.camera.length() - 3) < 1e-6, "contorna o alvo em vez de atravessá-lo");
    const degenerate = interpolateOrbit({ target: v(1, 1, 1), camera: v(1, 1, 1) }, a, 0.5);
    assert.ok(degenerate.camera.toArray().every(Number.isFinite));
  });

  test("duração proporcional à viagem, entre 0,8 e 2,8 s", () => {
    const small = orbitTransitionDuration(homeView, { target: v(0, 0, 0), camera: v(0.5, 0.8, 2.2) });
    const big = orbitTransitionDuration(reanchorOrbit(homeView, earthHome, earthOrbit), overview);
    assert.ok(small >= 0.8 && small < big && big <= 2.8, `${small} < ${big}`);
  });

  test("o controlador usa a transição orbital (sem lerp direto da câmera) e reancora antes do quadro", () => {
    const src = read("src/components/globe/CosmicCameraController.tsx");
    assert.doesNotMatch(src, /camera\.position\.lerpVectors/);
    assert.match(src, /useLayoutEffect/);
    assert.match(src, /reanchorOrbit\(/);
    assert.match(src, /pivot = isCosmicMode \? orbit\.center : home\.center/, "orbita a Terra na troca de cena");
    assert.match(src, /maxDistance = Infinity/, "limites abertos durante o voo");
  });
});

describe("D17: skeletons", () => {
  test("skeleton é decorativo e a região anuncia o carregamento", () => {
    assert.equal(renderToStaticMarkup(<Skeleton className="h-4" />).includes('aria-hidden="true"'), true);
    const panel = renderToStaticMarkup(<PanelSkeleton label="Carregando painel" />);
    assert.match(panel, /role="status"/);
    assert.match(panel, /aria-busy="true"/);
    assert.match(panel, /aria-label="Carregando painel"/);
    assert.match(renderToStaticMarkup(<ModalSkeleton label="Carregando o dossiê" />), /animate-pop-in/);
  });

  test("dock e modais sob demanda mostram skeleton enquanto o código carrega", () => {
    const shell = read("src/components/shell/GlobeExperienceShell.tsx");
    assert.match(shell, /loading: \(\) => <DockSkeleton \/>/);
    assert.equal((shell.match(/loading: \(\) => <ModalSkeleton/g) ?? []).length, 4);
    assert.match(read("src/components/hud/LiveWeatherWidget.tsx"), /loading \? <Skeleton/);
    assert.match(read("src/components/observatory/ObservatoryPanel.tsx"), /isLoading\[layer\.id\] && !storeState\.hasLoaded\[layer\.id\] \? \(\s*<Skeleton/);
  });
});
