import type { Scene, SceneTrajectory } from "@/lib/scenes/schema";
import type { Locale } from "./types";
import type { EnScenesMap, EnSceneTranslation } from "./en-scenes-types";
import { EN_SCENES_EARLY } from "./en-scenes-early";
import { EN_SCENE_MAGELLAN } from "./en-scenes-magellan";
import { EN_SCENES_WARS } from "./en-scenes-wars";
import { EN_SCENES_COLDWAR } from "./en-scenes-coldwar";

export type { EnScenesMap, EnSceneTranslation } from "./en-scenes-types";

/**
 * Catálogo completo sob demanda (`en`) das 7 cenas históricas publicadas (D42):
 * `polo-1271`, `gama-1497`, `magellan-1519`, `glo-1914`, `glo-1939`, `glo-1969` e `glo-1989`.
 */
export const EN_SCENES_PACK: EnScenesMap = {
  ...EN_SCENES_EARLY,
  "magellan-1519": EN_SCENE_MAGELLAN,
  ...EN_SCENES_WARS,
  ...EN_SCENES_COLDWAR,
};

let enScenesCache: EnScenesMap | null = EN_SCENES_PACK;

export function getEnScenesSync(): EnScenesMap | null {
  return enScenesCache;
}

export function resetEnScenesCacheForTest(): void {
  enScenesCache = null;
}

export async function loadEnScenes(): Promise<EnScenesMap> {
  enScenesCache = EN_SCENES_PACK;
  return EN_SCENES_PACK;
}

function localizeTrajectory(
  trajectory: SceneTrajectory,
  tr: EnSceneTranslation
): SceneTrajectory {
  if (trajectory.kind === "surface") {
    return {
      ...trajectory,
      label: tr.trajectoryLabel ?? trajectory.label,
      points: trajectory.points.map((pt) => {
        const ptTr = tr.points?.[pt.id];
        if (!ptTr) return pt;
        return {
          ...pt,
          name: ptTr.name,
          description: ptTr.description ?? pt.description,
          ...(pt.quote
            ? {
                quote: {
                  text: ptTr.quote?.text ?? pt.quote.text,
                  source: ptTr.quote?.source ?? pt.quote.source,
                },
              }
            : {}),
          ...(pt.facts || ptTr.facts
            ? {
                facts: {
                  ...(pt.facts ?? {}),
                  ...(ptTr.facts ?? {}),
                },
              }
            : {}),
        };
      }),
    };
  }

  return {
    ...trajectory,
    label: tr.trajectoryLabel ?? trajectory.label,
    launchSite: tr.launchSiteName
      ? { ...trajectory.launchSite, name: tr.launchSiteName }
      : trajectory.launchSite,
    ...(trajectory.landingSite
      ? {
          landingSite: tr.landingSiteName
            ? { ...trajectory.landingSite, name: tr.landingSiteName }
            : trajectory.landingSite,
        }
      : {}),
    phases: trajectory.phases.map((ph) => {
      const phTr = tr.phases?.[ph.id];
      if (!phTr) return ph;
      return {
        ...ph,
        label: phTr.label,
        description: phTr.description ?? ph.description,
        ...(ph.facts || phTr.facts
          ? {
              facts: {
                ...(ph.facts ?? {}),
                ...(phTr.facts ?? {}),
              },
            }
          : {}),
      };
    }),
  };
}

/**
 * Aplica tradução integral (`en`) aos textos, HUD, trajetórias, participantes e crônica de uma cena,
 * mantendo 100% intactos os dados em `pt-BR` quando `locale === "pt-BR"`.
 */
export function localizeScene(
  scene: Scene,
  locale: Locale,
  pack: EnScenesMap | null = enScenesCache
): Scene {
  if (locale !== "en" || !pack) return scene;
  const tr = pack[scene.id];
  if (!tr) return scene;

  return {
    ...scene,
    title: tr.title,
    summary: tr.summary,
    subtitle: tr.subtitle ?? scene.subtitle,
    dossierMarkdown: tr.dossierMarkdown ?? scene.dossierMarkdown,
    sources: scene.sources.map((src) => ({
      ...src,
      label: tr.sourceLabels?.[src.label] ?? src.label,
    })),
    trajectories: scene.trajectories.map((t) => localizeTrajectory(t, tr)),
    participants: scene.participants.map((p, idx) => {
      const pTr = tr.participants?.[idx];
      if (!pTr) return p;
      return {
        ...p,
        name: pTr.name ?? p.name,
        role: pTr.role,
        description: pTr.description ?? p.description,
      };
    }),
    chronicle: scene.chronicle.map((c, idx) => {
      const cTr = tr.chronicle?.[idx];
      if (!cTr) return c;
      return {
        ...c,
        place: cTr.place ?? c.place,
        text: cTr.text,
        ...(c.quote
          ? {
              quote: {
                text: cTr.quote?.text ?? c.quote.text,
                source: cTr.quote?.source ?? c.quote.source,
              },
            }
          : {}),
      };
    }),
    ...(scene.hud && tr.hud
      ? {
          hud: {
            ...scene.hud,
            badge: tr.hud.badge,
            subtitle: tr.hud.subtitle ?? scene.hud.subtitle,
            period: tr.hud.period ?? scene.hud.period,
            startLabel: tr.hud.startLabel,
            endLabel: tr.hud.endLabel,
            progressLabel: tr.hud.progressLabel,
            quoteTitle: tr.hud.quoteTitle ?? scene.hud.quoteTitle,
            stepStats: scene.hud.stepStats.map((st) => {
              const stTr = tr.hud?.stepStats?.[st.fact];
              if (!stTr) return st;
              return {
                ...st,
                label: stTr.label,
                unit: stTr.unit ?? st.unit,
                note: stTr.note ?? st.note,
              };
            }),
            cameras: scene.hud.cameras.map((cam, idx) => ({
              ...cam,
              label: tr.hud?.cameras?.[idx] ?? cam.label,
            })),
            ...(scene.hud.finalQuote
              ? {
                  finalQuote: {
                    ...scene.hud.finalQuote,
                    text: tr.hud.finalQuoteText ?? scene.hud.finalQuote.text,
                  },
                }
              : {}),
          },
        }
      : {}),
  };
}
