import { sceneHasTrajectoryKind, sceneOpenedBy } from "@/lib/scenes/catalog";
import { HISTORICAL_ERAS } from "@/lib/historical-eras";
import type { ObservatoryLayer } from "@/lib/observatory-data";
import { readGibsView } from "@/lib/gibs-view";
import type { CelestialBodyId } from "@/lib/astronomy-planets";
import type { StudyRecord } from "@/lib/studies-store";
import { normalizeStudyEpoch } from "@/lib/study-epoch";
import {
  APOLLO11_GLOBAL_MILESTONE_ID,
  DEFAULT_GEOLOGICAL_MA,
  MAGELLAN_ROUTE_ID,
  MAGELLAN_START_YEAR,
  MAGELLAN_END_YEAR,
} from "@/lib/epoch/constants";
import { useComparatorStore } from "./comparatorStore";
import { ALL_COSMIC_LAYERS, useCosmicStore } from "./cosmicStore";
import { useGlobeStore } from "./globeStore";
import { useSceneStore } from "./sceneStore";
import { useObservatoryStore } from "./observatoryStore";
import { useReaderStore } from "./readerStore";
import { useStudyStore } from "./studyStore";
import {
  CURRENT_YEAR,
  DEFAULT_TIMELINE_END_YEAR,
  DEFAULT_TIMELINE_START_YEAR,
  TWENTY_FIRST_CENTURY_START_YEAR,
} from "@/lib/timeline/current-year";
import { ALL_CATEGORIES, useTimelineStore, type MilestoneCategoryType, type TimelinePreset } from "./timelineStore";

export function selectCountry(iso: string | null) {
  const globe = useGlobeStore.getState();
  if (iso && iso !== globe.selectedIso) useReaderStore.getState().resetActiveDimension();
  globe.setSelectedIso(iso);
}

export function resetGlobeView() {
  useSceneStore.getState().closeScene({ restore: false });
  useTimelineStore.setState({ selectedMilestoneId: null, selectedYear: null });
  useReaderStore.getState().resetActiveDimension();
  useGlobeStore.getState().resetView();
}

export function enterGeologicalMode(age = DEFAULT_GEOLOGICAL_MA, milestoneId: string | null = null) {
  useSceneStore.getState().closeScene({ restore: false });
  useTimelineStore.setState({ geologicalMa: age, selectedYear: null, selectedMilestoneId: milestoneId });
}

export function restoreContemporaryTimeline() {
  useSceneStore.getState().closeScene({ restore: false });
  useTimelineStore.setState({
    geologicalMa: null,
    startYear: DEFAULT_TIMELINE_START_YEAR,
    endYear: DEFAULT_TIMELINE_END_YEAR,
    selectedYear: CURRENT_YEAR,
    selectedMilestoneId: null,
  });
}

/** Abre (id) ou fecha (null) a cena de uma rota. Fechar restaura o estado de antes da abertura. */
export function selectHistoricalRoute(id: string | null) {
  const scenes = useSceneStore.getState();
  if (id === null) scenes.closeScene();
  else scenes.openScene(id, { applyTimeline: true });
}

const historicalRanges = {
  LAST_50_YEARS: [DEFAULT_TIMELINE_START_YEAR, DEFAULT_TIMELINE_END_YEAR],
  COLD_WAR: [1947, 1991],
  WORLD_WARS: [1914, 1945],
  "21ST_CENTURY": [TWENTY_FIRST_CENTURY_START_YEAR, CURRENT_YEAR],
} as const;

export function applyTimelinePreset(preset: TimelinePreset | string) {
  switch (preset) {
    case "PANGEA_250MA": return enterGeologicalMode(250);
    case "GONDWANA_150MA": return enterGeologicalMode(150);
    case "KPG_66MA": return enterGeologicalMode(66);
    case "MAGELLAN_1519":
      // Abre a cena antes de mudar o período: o estado guardado para restaurar é o de antes do clique.
      selectHistoricalRoute(MAGELLAN_ROUTE_ID);
      useTimelineStore.setState({
        startYear: MAGELLAN_START_YEAR,
        endYear: MAGELLAN_END_YEAR,
        selectedMilestoneId: null,
      });
      return;
    case "LAST_50_YEARS":
    case "COLD_WAR":
    case "WORLD_WARS":
    case "21ST_CENTURY": {
      const [startYear, endYear] = historicalRanges[preset];
      useSceneStore.getState().closeScene({ restore: false });
      useTimelineStore.setState({ startYear, endYear, geologicalMa: null, selectedMilestoneId: null, selectedYear: null });
    }
  }
}

/** Controles da cena aberta (mantido o nome por compatibilidade dos chamadores). */
export const historicalRouteActions = {
  togglePlay: () => useSceneStore.getState().togglePlay(),
  seek: (progress: number) => useSceneStore.getState().seek(progress),
  nextWaypoint: () => useSceneStore.getState().nextStep(),
  prevWaypoint: () => useSceneStore.getState().prevStep(),
  reset: () => useSceneStore.getState().reset(),
  tick: (deltaSeconds: number) => useSceneStore.getState().tick(deltaSeconds),
};

export type StudySnapshot = Partial<StudyRecord> & {
  id: string;
  title: string;
  selectedGeologicalMa?: number | null;
  selectedRouteId?: string | null;
};

export function restoreStudySnapshot(study: StudySnapshot) {
  const epoch = normalizeStudyEpoch({
    ...study,
    geologicalMa: study.geologicalMa === undefined ? study.selectedGeologicalMa : study.geologicalMa,
    activeRouteId: study.activeRouteId === undefined ? study.selectedRouteId : study.activeRouteId,
  });
  useStudyStore.getState().restoreStudy({ ...study, ...epoch, notes: study.markdownNotes });

  const timeline = useTimelineStore.getState();
  const restoredRange = study.timelineStartYear != null && study.timelineEndYear != null
    ? { startYear: study.timelineStartYear, endYear: study.timelineEndYear }
    : epoch.activeRouteId === MAGELLAN_ROUTE_ID
      ? { startYear: MAGELLAN_START_YEAR, endYear: MAGELLAN_END_YEAR }
      : {};
  const historicalEra = Object.values(HISTORICAL_ERAS).find((era) => era.id === epoch.historicalEra);
  let selectedYear = historicalEra?.id === "COLD_WAR_1969" ? 1968 : historicalEra?.representativeYear ?? null;
  if (epoch.geologicalMa !== null) selectedYear = null;
  else if (epoch.activeRouteId === MAGELLAN_ROUTE_ID) selectedYear = MAGELLAN_START_YEAR;
  else if (epoch.isApollo11Active) selectedYear = 1969;

  const activeCategories = study.activeCategories?.filter(
    (category): category is MilestoneCategoryType => ALL_CATEGORIES.some((allowed) => allowed === category)
  );
  useTimelineStore.setState({
    ...restoredRange,
    geologicalMa: epoch.geologicalMa,
    selectedYear,
    selectedMilestoneId: epoch.isApollo11Active ? APOLLO11_GLOBAL_MILESTONE_ID : null,
    activeCategories: activeCategories ?? timeline.activeCategories,
  });
  // O estudo restaurado é o novo ponto de partida: abrir a rota não guarda o estado anterior a ele.
  const scenes = useSceneStore.getState();
  if (epoch.activeRouteId) {
    scenes.closeScene({ restore: false });
    scenes.openScene(epoch.activeRouteId, { snapshot: null });
    useSceneStore.setState({ previous: null });
  } else if (!epoch.isApollo11Active) scenes.closeScene({ restore: false });
  if (useSceneStore.getState().activeSceneId) useSceneStore.setState({ previous: null });
  if (epoch.geologicalMa !== null) useSceneStore.getState().pause();

  const cosmic = useCosmicStore.getState();
  if (study.isCosmicMode) {
    cosmic.enterCosmicView((study.focusedCelestialBody ?? undefined) as CelestialBodyId | undefined);
    if (study.activeCosmicLayers) {
      const layers = study.activeCosmicLayers;
      cosmic.setLayers(ALL_COSMIC_LAYERS.filter((layer) => layers.includes(layer)));
    }
  } else {
    cosmic.exitToEarthView();
  }
  // As rotas de estudos validam os IDs de camadas antes de retornar o snapshot.
  const observatory = useObservatoryStore.getState();
  // Produto e mês do GIBS antes de ligar as camadas, para a primeira carga já ser a do estudo (D25).
  observatory.setGibsRequest(readGibsView(study.gibsProduct, study.gibsMonth) ?? { product: "ndvi", month: null });
  observatory.setAllLayers(epoch.activeObservatoryLayers as ObservatoryLayer[]);

  const countries = study.selectedCountryIsos ?? [];
  selectCountry(countries[0] ?? null);
  useComparatorStore.getState().setSelectedIsos(countries);
  if (study.cameraLat !== undefined && study.cameraLng !== undefined) {
    useGlobeStore.getState().flyTo(study.cameraLat, study.cameraLng, study.cameraAltitude ?? 2.2);
  }
}

// ---------------------------------------------------------------------------
// Corpos celestes (D15): focar/desfocar não mexe no país selecionado — o painel do país continua
// numa aba do dock enquanto o usuário explora o Cosmos.
// ---------------------------------------------------------------------------

/** Foca um corpo celeste (abre o painel no dock) sem limpar o país selecionado. */
export function focusCelestialBody(id: CelestialBodyId) {
  useGlobeStore.getState().setHoveredIso(null);
  useCosmicStore.getState().focusBody(id);
}

/** Deseleciona o corpo focado: fecha o painel cósmico e solta a câmera. */
export function clearCelestialFocus() {
  useCosmicStore.getState().focusBody(null);
}

/**
 * Clique no vazio do canvas. No modo cósmico, desfaz só o foco do corpo celeste (o país selecionado
 * continua na aba dele). No modo Terra, deseleciona país, marco e entidade do Observatório.
 */
export function handleCanvasPointerMissed() {
  const cosmic = useCosmicStore.getState();
  cosmic.setHoveredBody(null);
  if (cosmic.isCosmicMode) {
    if (cosmic.focusedBodyId) clearCelestialFocus();
    return;
  }
  useGlobeStore.getState().setSelectedIso(null);
  useGlobeStore.getState().setHoveredIso(null);
  useTimelineStore.getState().selectMilestone(null);
  useObservatoryStore.getState().setSelectedEntity(null);
  if (cosmic.focusedBodyId === "MOON") clearCelestialFocus();
}
