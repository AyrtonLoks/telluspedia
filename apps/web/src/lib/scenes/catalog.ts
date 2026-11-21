import milestonesJson from "../../data/scenes/milestones.json";
import magellanJson from "../../data/scenes/magellan-1519.json";
import apolloJson from "../../data/scenes/glo-1969.json";
import type { Scene } from "./schema";
import { sceneStartYear } from "./catalog-utils";

/**
 * Catálogo de cenas (D12b): carrega e valida os JSON de `src/data/scenes/`. Para adicionar um
 * evento simples basta acrescentá-lo a `milestones.json`; cenas grandes ganham arquivo próprio,
 * listado em `SCENE_FILES`.
 */
const SCENE_FILES: Array<[string, unknown[]]> = [
  ["milestones.json", milestonesJson as unknown[]],
  ["magellan-1519.json", [magellanJson]],
  ["glo-1969.json", [apolloJson]],
];

export { sceneStartYear };

/**
 * Aplica os mesmos padrões do schema sem carregar o zod no bundle do cliente. A validação
 * completa roda nos testes (`test/scenes.test.ts` valida cada arquivo com `SceneSchema`).
 */
export function normalizeScene(raw: unknown): Scene {
  const s = raw as Partial<Scene> & Pick<Scene, "id">;
  return {
    ...s,
    countries: s.countries ?? [],
    timelineScope: s.timelineScope ?? "global",
    layers: s.layers ?? [],
    trajectories: s.trajectories ?? [],
    pointsOfInterest: s.pointsOfInterest ?? [],
    media: s.media ?? [],
    participants: s.participants ?? [],
    chronicle: s.chronicle ?? [],
    published: s.published ?? true,
  } as Scene;
}

/** Arquivos de cena (para a validação nos testes). */
export const SCENE_SOURCES: ReadonlyArray<readonly [string, unknown[]]> = SCENE_FILES;

export const ALL_SCENES: Scene[] = (() => {
  const all = SCENE_FILES.flatMap(([, items]) => items.map(normalizeScene));
  const seen = new Set<string>();
  for (const s of all) {
    if (seen.has(s.id)) throw new Error(`cenas: id duplicado entre arquivos (${s.id})`);
    seen.add(s.id);
  }
  return all;
})();

/** Só as cenas publicadas (rascunhos da ingestão ficam de fora da interface). */
export const PUBLISHED_SCENES: Scene[] = ALL_SCENES.filter((s) => s.published);

const BY_ID = new Map(ALL_SCENES.map((s) => [s.id, s]));
export function getScene(id: string): Scene | undefined {
  return BY_ID.get(id);
}

/** Formato de marco usado pela linha do tempo e pelo HUD (compatível com o anterior à D12). */
export interface SceneMilestone {
  id: string;
  title: string;
  summary: string;
  year: number;
  exactDate?: string;
  category: Scene["category"];
  sourcePrimary: string;
  latitude?: number;
  longitude?: number;
  countryIso?: string;
  blocIsos?: string[];
  preferredAltitude?: number;
}

export function sceneToMilestone(scene: Scene): SceneMilestone {
  const m: SceneMilestone = {
    id: scene.id,
    title: scene.title,
    summary: scene.summary,
    year: sceneStartYear(scene),
    category: scene.category,
    sourcePrimary: scene.sources[0].label,
  };
  if (scene.date.precision === "day") m.exactDate = scene.date.start;
  if (scene.location) {
    m.latitude = scene.location.lat;
    m.longitude = scene.location.lng;
  }
  if (scene.country) m.countryIso = scene.country;
  if (scene.countries.length > 0) m.blocIsos = [...scene.countries];
  // A altitude preferida do marco é a câmera da cena quando ela aponta para o próprio local.
  if (scene.camera && scene.location && scene.camera.lat === scene.location.lat && scene.camera.lng === scene.location.lng) {
    m.preferredAltitude = scene.camera.altitude;
  }
  // Ordem de chaves igual à do formato antigo (serializações e snapshots estáveis).
  const ordered: SceneMilestone = { id: m.id, title: m.title, summary: m.summary, year: m.year } as SceneMilestone;
  for (const k of ["exactDate", "category", "sourcePrimary", "latitude", "longitude", "countryIso", "blocIsos", "preferredAltitude"] as const) {
    if (m[k] !== undefined) (ordered as unknown as Record<string, unknown>)[k] = m[k];
  }
  return ordered;
}

/** Marcos globais (sempre na linha do tempo), em ordem cronológica estável. */
export function globalMilestones(): SceneMilestone[] {
  return PUBLISHED_SCENES.filter((s) => s.timelineScope === "global")
    .map((s, i) => ({ s, i }))
    .sort((a, b) => sceneStartYear(a.s) - sceneStartYear(b.s) || a.i - b.i)
    .map(({ s }) => sceneToMilestone(s));
}

/** Marcos de um país (aparecem quando ele está selecionado). */
export function countryMilestones(iso: string): SceneMilestone[] {
  return PUBLISHED_SCENES.filter((s) => s.timelineScope === "country" && s.country === iso).map(sceneToMilestone);
}

/** Valor de um fato obrigatório (falha cedo se o JSON perder o campo). */
export function fact<T extends string | number>(facts: Record<string, string | number> | undefined, key: string): T {
  const v = facts?.[key];
  if (v === undefined) throw new Error(`cena: fato obrigatório ausente (${key})`);
  return v as T;
}
