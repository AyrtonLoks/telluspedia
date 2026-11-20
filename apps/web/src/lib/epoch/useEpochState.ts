import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTimelineStore } from "@/stores/timelineStore";
import { useHistoricalRouteStore } from "@/stores/historicalRouteStore";
import { findMilestoneById } from "@/lib/country-data";
import { resolveEpoch, type EpochState } from "./resolveEpoch";

const selectTimeline = (s: ReturnType<typeof useTimelineStore.getState>) => ({
  selectedYear: s.selectedYear,
  selectedMilestoneId: s.selectedMilestoneId,
  startYear: s.startYear,
  endYear: s.endYear,
  geologicalMa: s.geologicalMa,
});
const selectRoute = (s: ReturnType<typeof useHistoricalRouteStore.getState>) => s.activeRouteId;

function resolve(timeline: ReturnType<typeof selectTimeline>, activeRouteId: string | null) {
  return resolveEpoch({
    ...timeline,
    milestoneYear: timeline.selectedMilestoneId
      ? findMilestoneById(timeline.selectedMilestoneId)?.year ?? null
      : null,
    activeRouteId,
  });
}

/** Leitura imperativa (fora de componentes / handlers). */
export function getEpochState(): EpochState {
  return resolve(selectTimeline(useTimelineStore.getState()), selectRoute(useHistoricalRouteStore.getState()));
}

/** Assina somente os campos que determinam a época ativa. */
export function useEpochState(): EpochState {
  const timeline = useTimelineStore(useShallow(selectTimeline));
  const route = useHistoricalRouteStore(selectRoute);

  // O Zustand retorna o estado inicial durante SSR. Renderizações estáticas locais usam o estado atual.
  const isServer = typeof window === "undefined";
  const activeTimeline = isServer ? selectTimeline(useTimelineStore.getState()) : timeline;
  const activeRoute = isServer ? selectRoute(useHistoricalRouteStore.getState()) : route;
  return useMemo(() => resolve(activeTimeline, activeRoute), [activeTimeline, activeRoute]);
}
