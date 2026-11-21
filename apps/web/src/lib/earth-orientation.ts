import * as THREE from "three";
import { eclipticToScene, poleEcliptic } from "@/lib/planet-orientation";

/**
 * Orientação da Terra no Cosmos (D21).
 *
 * O globo é desenhado no referencial fixo da Terra: +Y é o polo norte e a direção do Sol vem do
 * ponto subsolar (`useSunDirection`). No modo Terra isso basta. No Cosmos, a cena está na
 * eclíptica com o Sol na origem; sem girar o globo, o lado iluminado não aponta para o Sol da cena
 * e o eixo fica sem os 23,4° de inclinação.
 *
 * `earthCosmicOrientation` dá a rotação do referencial da Terra para a cena: leva +Y exatamente ao
 * polo norte celeste na cena e gira em torno dele até a projeção do Sol subsolar coincidir com a
 * do Sol da cena. (Se a data do ponto subsolar e a da posição orbital forem a mesma, as duas
 * direções coincidem de fato; quando diferem — posição por ano, Sol pelo relógio —, o eixo fica
 * certo e só a estação aparece levemente defasada.)
 *
 * Iluminação: no Cosmos, a luz da Terra aponta exatamente para o Sol da cena (como nos demais
 * planetas), e a estação passa a ser a da posição orbital. A posição vem do ano da linha do tempo
 * e o ponto subsolar do relógio (ou de 21 de junho); usar o subsolar girado poria a luz até ~47°
 * fora do Sol. No modo Terra, vale o ponto subsolar de sempre.
 *
 * `earthOrientation` é a rotação aplicada neste quadro (identidade no modo Terra) e
 * `earthCosmicLight` o peso (0 → 1) da luz voltada ao Sol da cena; ambos são lidos pelos shaders da
 * Terra, que comparam normais em mundo (AGENTS.md) com `uSunDirection`.
 */
export const earthOrientation = new THREE.Quaternion();
export const earthCosmicLight = { weight: 0, toSun: new THREE.Vector3(1, 0, 0) };

const UP = new THREE.Vector3(0, 1, 0);
const EARTH_POLE_SCENE = eclipticToScene(poleEcliptic("EARTH")).normalize();

/** Projeta `v` no plano perpendicular a `axis` (unitário) e normaliza; devolve null se degenerado. */
function onPlane(v: THREE.Vector3, axis: THREE.Vector3): THREE.Vector3 | null {
  const p = v.clone().addScaledVector(axis, -v.dot(axis));
  return p.lengthSq() < 1e-12 ? null : p.normalize();
}

export function earthCosmicOrientation(sunDirectionBody: THREE.Vector3, earthScenePosition: THREE.Vector3): THREE.Quaternion {
  const tilt = new THREE.Quaternion().setFromUnitVectors(UP, EARTH_POLE_SCENE);
  const toSun = earthScenePosition.clone().negate();
  if (toSun.lengthSq() < 1e-12) return tilt;
  const from = onPlane(sunDirectionBody.clone().normalize().applyQuaternion(tilt), EARTH_POLE_SCENE);
  const to = onPlane(toSun.normalize(), EARTH_POLE_SCENE);
  if (!from || !to) return tilt;
  const angle = Math.atan2(new THREE.Vector3().crossVectors(from, to).dot(EARTH_POLE_SCENE), from.dot(to));
  return new THREE.Quaternion().setFromAxisAngle(EARTH_POLE_SCENE, angle).multiply(tilt);
}

/** Direção do Sol em mundo para os shaders da Terra (`out` recebe o resultado). */
export function worldSunDirection(sunDirectionBody: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  out.copy(sunDirectionBody).applyQuaternion(earthOrientation).normalize();
  const w = earthCosmicLight.weight;
  if (w <= 0) return out;
  if (w >= 1) return out.copy(earthCosmicLight.toSun);
  return out.lerp(earthCosmicLight.toSun, w).normalize();
}

/**
 * Avança `current` em direção a `target` (amortecido, ~1,5 s para assentar), para o globo não
 * girar de uma vez ao entrar ou sair do Cosmos. Com movimento reduzido, salta direto.
 */
export function stepEarthOrientation(
  current: THREE.Quaternion,
  target: THREE.Quaternion,
  delta: number,
  reducedMotion: boolean,
  light?: { cosmic: boolean; toSun: THREE.Vector3 | null }
): THREE.Quaternion {
  const k = reducedMotion ? 1 : 1 - Math.exp(-Math.min(Math.max(delta, 0), 0.1) * 3);
  if (light) {
    if (light.toSun) earthCosmicLight.toSun.copy(light.toSun);
    const goal = light.cosmic ? 1 : 0;
    earthCosmicLight.weight += (goal - earthCosmicLight.weight) * k;
    if (Math.abs(goal - earthCosmicLight.weight) < 1e-4) earthCosmicLight.weight = goal;
  }
  return reducedMotion ? current.copy(target) : current.slerp(target, k);
}

/** Direção da Terra ao Sol na cena (o Sol está na origem). */
export function sceneDirectionToSun(earthScenePosition: THREE.Vector3): THREE.Vector3 | null {
  return earthScenePosition.lengthSq() < 1e-12 ? null : earthScenePosition.clone().negate().normalize();
}
