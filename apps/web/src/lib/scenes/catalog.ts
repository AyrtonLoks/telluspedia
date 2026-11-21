import { create } from "zustand";
import milestonesJson from "../../data/scenes/milestones.json";
import magellanJson from "../../data/scenes/magellan-1519.json";
import apolloJson from "../../data/scenes/glo-1969.json";
import sceneIndexJson from "../../data/scenes/scene-index.json";
import type { Scene } from "./schema";
import { sceneStartYear, type TrajectoryKind } from "./catalog-utils";

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

/** Arquivos de cena do bundle (para a validação nos testes; os sob demanda estão em `lazy-files.ts`). */
export const SCENE_SOURCES: ReadonlyArray<readonly [string, unknown[]]> = SCENE_FILES;

/*
 * Carga sob demanda (D24). Cenas grandes não entram no bundle de `/`: o índice leve
 * (`scene-index.json`) traz o que a linha do tempo, a busca e os links precisam, e o arquivo completo
 * chega por `import()` quando a cena abre. Até lá, `getScene` devolve a cena do índice, com as
 * trajetórias, a crônica e os participantes vazios; `isSceneLoaded` diz se já está completa.
 * Os mapas abaixo e `LAZY_SCENE_FILES` precisam bater (teste `scenes.test.ts`).
 */
type Loader = () => Promise<unknown>;
const LAZY_LOADERS: Record<string, Loader> = {
  "polo-1271": () => import("../../data/scenes/polo-1271.json").then((m) => m.default),
  "gama-1497": () => import("../../data/scenes/gama-1497.json").then((m) => m.default),
  "glo-1914": () => import("../../data/scenes/glo-1914.json").then((m) => m.default),
  "glo-1939": () => import("../../data/scenes/glo-1939.json").then((m) => m.default),
  "glo-1989": () => import("../../data/scenes/glo-1989.json").then((m) => m.default),
};
/** Cenas do bundle com detalhes à parte (a Apollo 11 trava o relógio astronômico, então fica no bundle). */
const DETAIL_LOADERS: Record<string, Loader> = {
  "glo-1969": () => import("../../data/scenes/glo-1969.details.json").then((m) => m.default),
};
export const LAZY_SCENE_IDS: readonly string[] = Object.keys(LAZY_LOADERS);
export const DETAIL_SCENE_IDS: readonly string[] = Object.keys(DETAIL_LOADERS);

type IndexEntry = Record<string, unknown> & { id: string; trajectoryKinds: TrajectoryKind[] };
const KINDS = new Map<string, TrajectoryKind[]>();
const INDEX_SCENES = (sceneIndexJson as unknown as IndexEntry[]).map(({ trajectoryKinds, ...rest }) => {
  KINDS.set(rest.id, trajectoryKinds);
  return normalizeScene(rest);
});

export const ALL_SCENES: Scene[] = (() => {
  const all = [...SCENE_FILES.flatMap(([, items]) => items.map(normalizeScene)), ...INDEX_SCENES];
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

const loaded = new Set<string>(ALL_SCENES.filter((s) => !(s.id in LAZY_LOADERS) && !(s.id in DETAIL_LOADERS)).map((s) => s.id));
const pending = new Map<string, Promise<Scene | undefined>>();

/** Versão dos dados de cena: muda a cada carga, para os componentes re-renderizarem (`useScene`). */
export const useSceneDataVersion = create<{ version: number }>(() => ({ version: 0 }));

/** A cena já tem trajetórias, crônica e participantes (ou nunca foi sob demanda). */
export function isSceneLoaded(id: string): boolean {
  return loaded.has(id);
}

function replaceScene(next: Scene) {
  BY_ID.set(next.id, next);
  const i = ALL_SCENES.findIndex((s) => s.id === next.id);
  if (i >= 0) ALL_SCENES[i] = next;
  const j = PUBLISHED_SCENES.findIndex((s) => s.id === next.id);
  if (j >= 0) PUBLISHED_SCENES[j] = next;
}

/** Carrega a parte pesada da cena (uma vez; chamadas repetidas reaproveitam a mesma promessa). */
export function loadScene(id: string): Promise<Scene | undefined> {
  if (loaded.has(id)) return Promise.resolve(BY_ID.get(id));
  const isLazy = id in LAZY_LOADERS;
  const loader = isLazy ? LAZY_LOADERS[id] : id in DETAIL_LOADERS ? DETAIL_LOADERS[id] : null;
  if (!loader) return Promise.resolve(undefined);
  let p = pending.get(id);
  if (!p) {
    p = loader()
      .then((raw) => {
        const base = BY_ID.get(id);
        const next = isLazy ? normalizeScene(raw) : normalizeScene({ ...base, ...(raw as object) });
        replaceScene(next);
        loaded.add(id);
        useSceneDataVersion.setState((s) => ({ version: s.version + 1 }));
        return next;
      })
      .catch((error) => {
        pending.delete(id); // permite tentar de novo
        console.warn(`[cenas] falha ao carregar ${id}`, error);
        return BY_ID.get(id);
      });
    pending.set(id, p);
  }
  return p;
}

/** Tipos das trajetórias da cena, mesmo antes de carregá-la (vêm do índice). */
export function sceneTrajectoryKinds(id: string): TrajectoryKind[] {
  return KINDS.get(id) ?? BY_ID.get(id)?.trajectories.map((t) => t.kind) ?? [];
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
  return Boolean(scene && scene.published && (scene.trajectories.length > 0 || sceneTrajectoryKinds(scene.id).length > 0));
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
  return Boolean(sceneId && sceneTrajectoryKinds(sceneId).includes(kind));
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
