import { DEFAULT_MAP_PROJECTION, DEFAULT_MAP_VIEW_MODE } from "@/lib/map-projections-types";
import type { StudyLineageInfo, StudyRecord } from "@/lib/studies-store";
import { restoreStudySnapshot, selectCountry } from "@/stores/actions";
import { useChoroplethStore } from "@/stores/choroplethStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useCriticalGeoStore } from "@/stores/criticalGeoStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useStudioToolsStore } from "@/stores/studioToolsStore";
import { useStudyStore } from "@/stores/studyStore";

export type InitialGlobeState =
  | { kind: "default" }
  | { kind: "study"; study: StudyRecord; lineage?: StudyLineageInfo }
  | { kind: "country"; iso: string; latitude: number | null; longitude: number | null }
  | { kind: "compare"; isos: string[] };

export function getInitialGlobeStateKey(state: InitialGlobeState): string {
  switch (state.kind) {
    case "study":
      return `study:${state.study.id}`;
    case "country":
      return `country:${state.iso}`;
    case "compare":
      return `compare:${state.isos.join(",")}`;
    default:
      return "default";
  }
}

/**
 * Hydrates Zustand stores synchronously from server-loaded route state so the first
 * SSR HTML pass and the first client render already reflect the target study, country,
 * or comparison without flashing the default landing state.
 */
export function applyInitialGlobeState(initialState: InitialGlobeState): void {
  if (typeof window === "undefined") {
    // Evita vazamento de estado de stores Zustand entre requisições SSR consecutivas
    // no mesmo processo Node (ex.: `/pais/GRL` seguido de `/`, que causaria erro React #418).
    selectCountry(null);
    useGlobeStore.getState().setViewMode(DEFAULT_MAP_VIEW_MODE);
    useGlobeStore.getState().setProjectionId(DEFAULT_MAP_PROJECTION);
    useComparatorStore.getState().closeComparator();
    useChoroplethStore.getState().restoreIndicator(null);
    useCriticalGeoStore.getState().restoreLens(null);
    useStudyStore.getState().resetStudy();
    useStudioToolsStore.getState().resetStudioTools();
  }

  if (initialState.kind === "study") {
    restoreStudySnapshot(initialState.study);
    useChoroplethStore
      .getState()
      .restoreIndicator(initialState.study.choroplethIndicator, initialState.study.choroplethYear);
    return;
  }

  if (initialState.kind === "country") {
    selectCountry(initialState.iso);
    if (
      initialState.latitude !== null &&
      initialState.longitude !== null &&
      (initialState.latitude !== 0 || initialState.longitude !== 0)
    ) {
      useGlobeStore.getState().flyTo(initialState.latitude, initialState.longitude, 2.0);
    }
    return;
  }

  if (initialState.kind === "compare") {
    const comparator = useComparatorStore.getState();
    if (initialState.isos.length > 0) {
      comparator.setSelectedIsos(initialState.isos);
    }
    comparator.openComparator();
  }
}
