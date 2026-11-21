/**
 * Política única de escala do modo Cosmos (D11). Documentada em docs/ARCHITECTURE.md §2.4.1.
 *
 * - Distâncias: sempre comprimidas pela lei de potência `mapDistanceToSceneRadius`
 *   (R = 28 · r_UA^0,55). Distâncias lineares não cabem numa cena navegável: com Netuno a ~180
 *   unidades, a Terra (1 UA) ficaria a 6 unidades e o Sol engoliria as órbitas internas.
 * - Raios: uma única regra por modo, a partir do raio equatorial real (km), com a Terra de
 *   referência:
 *     • "visual"  → r = (R / R_Terra)^0,43 — exagero com fator único; a Terra fica com 1
 *       (o `EarthSphere` mantém raio 1) e o Sol com 7,5.
 *     • "real"    → r = 0,11 · (R / R_Terra) — proporção verdadeira entre os corpos; o fator
 *       0,11 é o maior que mantém o Sol (e a coroa) dentro do periélio de Mercúrio na
 *       distância comprimida.
 * - Cometa, cinturão de asteroides e chuvas de meteoros ficam fora: partículas representativas,
 *   sem corpo sólido em escala.
 */

export type CosmicScaleMode = "visual" | "real";

/** Raio equatorial da Terra (km), referência da escala. */
export const EARTH_RADIUS_KM = 6378.1;
/** Expoente do exagero de raios no modo visual. */
export const VISUAL_RADIUS_EXPONENT = 0.43;
/** Unidades de cena por raio terrestre no modo de escala real. */
export const REAL_SCALE_FACTOR = 0.11;
/** Raio da geometria do Sol em `SunCore` (unidades de cena) e razão da coroa. */
export const SUN_GEOMETRY_RADIUS = 7.5;
export const SUN_CORONA_RATIO = 8.6 / 7.5;

/** Raio de cena de um corpo a partir do raio real (km). */
export function bodySceneRadius(radiusKm: number, mode: CosmicScaleMode): number {
  const rel = radiusKm / EARTH_RADIUS_KM;
  return mode === "real" ? REAL_SCALE_FACTOR * rel : Math.pow(rel, VISUAL_RADIUS_EXPONENT);
}

/**
 * Escala do grupo Terra + Lua no modo Cosmos. O `EarthSphere` tem raio 1, então no modo real o
 * grupo inteiro é reduzido pelo fator único (a Lua, com raio real relativo 0,27, acompanha).
 */
export function earthSystemScale(mode: CosmicScaleMode): number {
  return bodySceneRadius(EARTH_RADIUS_KM, mode);
}

/** Anéis em múltiplos do raio do planeta (Saturno: anel C ao A; Urano: sistema ε). */
export const RING_RATIOS = {
  SATURN: [1.22, 2.3],
  URANUS: [1.22, 1.78],
} as const;

/** Rótulo: prioridade para a anticolisão (maior vence). Foco > hover > tamanho real. */
export function celestialLabelPriority(radiusKm: number, state: { focused?: boolean; hovered?: boolean } = {}): number {
  return (state.focused ? 2e7 : 0) + (state.hovered ? 1e7 : 0) + radiusKm;
}

/**
 * Distância da câmera ao focar um corpo: a do modo visual multiplicada pela razão entre os raios
 * dos dois modos, com os mínimos do AGENTS.md (Terra ≥ 1,5; Lua ≥ 0,4) e nunca dentro do corpo.
 */
export function scaledViewDistance(visualDistance: number, visualRadius: number, modeRadius: number, minimum: number): number {
  const ratio = visualRadius > 0 ? modeRadius / visualRadius : 1;
  return Math.max(minimum, modeRadius * 2.2, visualDistance * ratio);
}
