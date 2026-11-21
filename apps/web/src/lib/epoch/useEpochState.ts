import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTimelineStore } from "@/stores/timelineStore";
import { useSceneStore } from "@/stores/sceneStore";
import { findMilestoneById } from "@/lib/country-data";
import { resolveEpoch, type EpochState } from "./resolveEpoch";

const selectTimeline = (s: ReturnType<typeof useTimelineStore.getState>) => ({
  selectedYear: s.selectedYear,
  selectedMilestoneId: s.selectedMilestoneId,
  startYear: s.startYear,
  endYear: s.endYear,
  geologicalMa: s.geologicalMa,
});
const selectScene = (s: ReturnType<typeof useSceneStore.getState>) => s.activeSceneId;

function resolve(timeline: ReturnType<typeof selectTimeline>, activeSceneId: string | null) {
  return resolveEpoch({
    ...timeline,
    milestoneYear: timeline.selectedMilestoneId
      ? findMilestoneById(timeline.selectedMilestoneId)?.year ?? null
      : null,
    activeSceneId,
  });
}

/** Leitura imperativa (fora de componentes / handlers). */
export function getEpochState(): EpochState {
  return resolve(selectTimeline(useTimelineStore.getState()), selectScene(useSceneStore.getState()));
}

/** Assina somente os campos que determinam a época ativa. */
export function useEpochState(): EpochState {
  const timeline = useTimelineStore(useShallow(selectTimeline));
  const route = useSceneStore(selectScene);

  // O Zustand retorna o estado inicial durante SSR. Renderizações estáticas locais usam o estado atual.
  const isServer = typeof window === "undefined";
  const activeTimeline = isServer ? selectTimeline(useTimelineStore.getState()) : timeline;
  const activeRoute = isServer ? selectScene(useSceneStore.getState()) : route;
  return useMemo(() => resolve(activeTimeline, activeRoute), [activeTimeline, activeRoute]);
}
