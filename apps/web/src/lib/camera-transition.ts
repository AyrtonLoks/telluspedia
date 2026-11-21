/**
 * Transições de câmera orbital (D17) — funções puras, testáveis sem WebGL.
 *
 * Uma transição vai de um estado `{ target, camera }` a outro. A câmera fica sempre a uma distância
 * do alvo que varia em escala logarítmica (afastar e aproximar parecem igualmente suaves, de 2,5 a
 * 200 unidades), numa direção interpolada por SLERP. O alvo acompanha a distância: ao se afastar ele
 * demora a sair do corpo de partida; ao se aproximar, chega cedo ao de destino — assim a câmera não
 * fica perto de um corpo sem estar olhando para ele. Como rede de segurança, corpos passados como
 * obstáculos empurram a câmera para fora da esfera deles. O `lerp` direto da posição da câmera, que o
 * AGENTS.md proíbe, poderia atravessar um planeta.
 */
import * as THREE from "three";
import { slerpVectors } from "./geo-spatial";

export interface OrbitState {
  target: THREE.Vector3;
  camera: THREE.Vector3;
}

/** ease-in-out cúbico (mesma curva do voo de câmera da Terra). */
export function easeInOutCubic(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

const MIN_OFFSET = 1e-4;

function offsetOf(s: OrbitState): { dir: THREE.Vector3; dist: number } {
  const offset = s.camera.clone().sub(s.target);
  const dist = offset.length();
  if (!Number.isFinite(dist) || dist < MIN_OFFSET) return { dir: new THREE.Vector3(0, 0, 1), dist: MIN_OFFSET };
  return { dir: offset.divideScalar(dist), dist };
}

export interface OrbitObstacle {
  center: THREE.Vector3;
  radius: number;
}

/**
 * Estado no instante `t` (0–1, já com easing) entre `from` e `to`. Nunca devolve NaN, e a câmera
 * nunca fica dentro de um `obstacle`.
 */
export function interpolateOrbit(
  from: OrbitState,
  to: OrbitState,
  t: number,
  opts: { obstacles?: OrbitObstacle[] } = {}
): OrbitState {
  const k = Math.max(0, Math.min(1, t));
  if (k === 0) return { target: from.target.clone(), camera: from.camera.clone() };
  if (k === 1) return { target: to.target.clone(), camera: to.camera.clone() };
  const a = offsetOf(from);
  const b = offsetOf(to);
  const dir = slerpVectors(a.dir, b.dir, k);
  const dist = Math.exp(THREE.MathUtils.lerp(Math.log(a.dist), Math.log(b.dist), k));
  // Afastando: o alvo atrasa (fica no corpo de partida enquanto a câmera está perto dele).
  // Aproximando: o alvo adianta (já está no destino quando a câmera chega perto).
  const w = b.dist >= a.dist ? Math.pow(k, 4) : 1 - Math.pow(1 - k, 4);
  const target = from.target.clone().lerp(to.target, w);
  const camera = target.clone().add(dir.multiplyScalar(dist));
  for (const o of opts.obstacles ?? []) {
    const away = camera.clone().sub(o.center);
    const len = away.length();
    if (len < o.radius) {
      if (len < MIN_OFFSET) away.copy(dir).normalize();
      else away.divideScalar(len);
      camera.copy(o.center).add(away.multiplyScalar(o.radius));
    }
  }
  return { target, camera };
}

/**
 * Duração (s) proporcional ao "tamanho" da viagem: razão entre as distâncias da câmera ao alvo
 * (em oitavas), ângulo entre as direções e deslocamento do alvo relativo à distância maior.
 */
export function orbitTransitionDuration(from: OrbitState, to: OrbitState): number {
  const a = offsetOf(from);
  const b = offsetOf(to);
  const octaves = Math.abs(Math.log2(b.dist / a.dist));
  const angle = Math.acos(Math.max(-1, Math.min(1, a.dir.dot(b.dir))));
  const travel = from.target.distanceTo(to.target) / Math.max(a.dist, b.dist);
  return Math.max(0.8, Math.min(2.8, 0.8 + 0.18 * octaves + 0.35 * (angle / Math.PI) + 0.3 * Math.min(travel, 2)));
}

/**
 * Reancoragem na troca de cena (Terra ↔ Cosmos): o grupo da Terra muda de centro e de escala no
 * mesmo quadro; a câmera e o alvo são levados junto para que a Terra continue igual na tela.
 */
export function reanchorOrbit(state: OrbitState, from: { center: THREE.Vector3; scale: number }, to: { center: THREE.Vector3; scale: number }): OrbitState {
  const k = to.scale / from.scale;
  const map = (p: THREE.Vector3) => p.clone().sub(from.center).multiplyScalar(k).add(to.center);
  return { target: map(state.target), camera: map(state.camera) };
}

export { prefersReducedMotion } from "./reduced-motion";

/**
 * Há uma transição orbital em curso (Terra ↔ Cosmos, foco de corpo). O voo de câmera da Terra
 * espera por ela para não disputar a câmera no quadro em que volta a ser montado.
 */
export const orbitTransition = { active: false, progress: 0 };

/**
 * Opacidade do sistema solar na descida de volta à Terra, pelo progresso do voo: inteiro no começo,
 * some entre 15 % e 80 % (antes de a câmera chegar à vista da Terra) — sem estalo ao desmontar.
 */
export function solarSystemExitOpacity(progress: number): number {
  const x = Math.max(0, Math.min(1, (progress - 0.15) / 0.65));
  return 1 - x * x * (3 - 2 * x);
}
