import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTimelineStore } from "@/stores/timelineStore";
import { useStudyStore } from "@/stores/studyStore";
import { useHistoricalRouteStore } from "@/stores/historicalRouteStore";
import { findMilestoneById } from "@/lib/country-data";
import { resolveEpoch, type EpochInput, type EpochState } from "./resolveEpoch";

type TimelineSlice = Pick<
  ReturnType<typeof useTimelineStore.getState>,
  | "selectedYear"
  | "selectedMilestoneId"
  | "startYear"
  | "endYear"
  | "timelineMode"
  | "geologicalMa"
  | "selectedGeologicalMa"
  | "activeRouteId"
  | "selectedRouteId"
>;
type StudySlice = { geologicalMa: number | null; activeRouteId: string | null; isApollo11Active: boolean };

const selectTimeline = (s: ReturnType<typeof useTimelineStore.getState>): TimelineSlice => ({
  selectedYear: s.selectedYear,
  selectedMilestoneId: s.selectedMilestoneId,
  startYear: s.startYear,
  endYear: s.endYear,
  timelineMode: s.timelineMode,
  geologicalMa: s.geologicalMa,
  selectedGeologicalMa: s.selectedGeologicalMa,
  activeRouteId: s.activeRouteId,
  selectedRouteId: s.selectedRouteId,
});
const selectStudy = (s: ReturnType<typeof useStudyStore.getState>): StudySlice => ({
  geologicalMa: s.geologicalMa,
  activeRouteId: s.activeRouteId,
  isApollo11Active: s.isApollo11Active,
});
const selectRoute = (s: ReturnType<typeof useHistoricalRouteStore.getState>) => s.activeRouteId;

function toInput(t: TimelineSlice, study: StudySlice, historicalRouteId: string | null): EpochInput {
  return {
    ...t,
    milestoneYear: t.selectedMilestoneId ? findMilestoneById(t.selectedMilestoneId)?.year ?? null : null,
    routeIds: [t.activeRouteId, t.selectedRouteId, historicalRouteId],
    study,
  };
}

/** Leitura imperativa (fora de componentes / handlers). */
export function getEpochState(): EpochState {
  return resolveEpoch(
    toInput(
      selectTimeline(useTimelineStore.getState()),
      selectStudy(useStudyStore.getState()),
      selectRoute(useHistoricalRouteStore.getState())
    )
  );
}

/**
 * Época ativa (modo, ano efetivo, idade geológica, era, cena, contemporaneidade) — seletor único
 * para todos os componentes. Assina só os campos relevantes das stores (comparação rasa).
 */
export function useEpochState(): EpochState {
  const timeline = useTimelineStore(useShallow(selectTimeline));
  const study = useStudyStore(useShallow(selectStudy));
  const historicalRouteId = useHistoricalRouteStore(selectRoute);

  // No render de servidor (testes com renderToStaticMarkup) o zustand 5 devolve o estado
  // inicial; lê o estado atual como os demais componentes do app já fazem.
  const isServer = typeof window === "undefined";
  const t = isServer ? selectTimeline(useTimelineStore.getState()) : timeline;
  const st = isServer ? selectStudy(useStudyStore.getState()) : study;
  const r = isServer ? selectRoute(useHistoricalRouteStore.getState()) : historicalRouteId;

  return useMemo(
    () => resolveEpoch(toInput(t, st, r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      t.selectedYear, t.selectedMilestoneId, t.startYear, t.endYear, t.timelineMode, t.geologicalMa,
      t.selectedGeologicalMa, t.activeRouteId, t.selectedRouteId, st.geologicalMa, st.activeRouteId,
      st.isApollo11Active, r,
    ]
  );
}
