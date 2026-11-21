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
    openedBy: s.openedBy ?? [],
    ...(s.hud
      ? { hud: { ...s.hud, stepStats: s.hud.stepStats ?? [], cameras: s.hud.cameras ?? [], speeds: s.hud.speeds ?? [0.5, 1, 2], durationSeconds: s.hud.durationSeconds ?? 90, startProgress: s.hud.startProgress ?? 0 } }
      : {}),
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

/** Cena "tocável" (tem trajetória para o player). Marcos simples não abrem o player. */
export function isPlayableScene(scene: Scene | undefined): scene is Scene {
  return Boolean(scene && scene.published && scene.trajectories.length > 0);
}

/** Cena aberta por um marco: a própria cena com o mesmo id ou a que o lista em `openedBy`. */
export function sceneOpenedBy(milestoneId: string | null | undefined): Scene | undefined {
  if (!milestoneId) return undefined;
  const own = getScene(milestoneId);
  if (isPlayableScene(own)) return own;
  return PUBLISHED_SCENES.find((s) => isPlayableScene(s) && s.openedBy.includes(milestoneId));
}

/** Cena com trajetória Terra–Lua trava o relógio astronômico no instante de referência. */
export function sceneLockedInstant(sceneId: string | null | undefined): Date | null {
  const scene = sceneId ? getScene(sceneId) : undefined;
  const t = scene?.trajectories.find((x) => x.kind === "cislunar");
  if (!t || t.kind !== "cislunar") return null;
  const ref = t.phases.find((p) => p.id === "landing") ?? t.phases[t.phases.length - 1];
  return new Date(ref.time);
}

export function sceneHasTrajectoryKind(sceneId: string | null | undefined, kind: "surface" | "cislunar"): boolean {
  return Boolean(sceneId && getScene(sceneId)?.trajectories.some((t) => t.kind === kind));
}

/** Progresso (0..1) em que começa cada passo da cena: pontos da rota (igualmente espaçados) ou fases. */
export function sceneStepStarts(scene: Scene | undefined): number[] {
  const t = scene?.trajectories[0];
  if (!t) return [];
  if (t.kind === "surface") {
    const n = t.points.length;
    return t.points.map((_, i) => (n > 1 ? Number((i / (n - 1)).toFixed(4)) : 0));
  }
  const n = t.phases.length;
  return t.phases.map((ph, i) => {
    const v = ph.facts?.startProgress;
    return typeof v === "number" ? v : i / n;
  });
}

/** Passo atual: na rota, o ponto mais próximo; nas fases, a última que já começou. */
export function sceneStepIndex(scene: Scene | undefined, progress: number): number {
  const starts = sceneStepStarts(scene);
  if (starts.length === 0) return 0;
  if (scene?.trajectories[0]?.kind === "surface") {
    return Math.min(starts.length - 1, Math.floor(progress * (starts.length - 1) + 0.5));
  }
  let idx = 0;
  starts.forEach((s, i) => { if (progress >= s) idx = i; });
  return idx;
}

/** Ano da data do passo (ponto da rota ou fase), ou null. */
export function sceneStepYear(scene: Scene | undefined, index: number): number | null {
  const t = scene?.trajectories[0];
  if (!t) return null;
  const time = t.kind === "surface" ? t.points[index]?.time : t.phases[index]?.time;
  const year = time ? Number(String(time).slice(0, 4)) : NaN;
  return Number.isFinite(year) ? year : null;
}
