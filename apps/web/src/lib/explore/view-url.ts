import { CELESTIAL_BODY_IDS } from "@/lib/celestial-bodies";
import { isDeepSpaceProbeId } from "@/lib/deep-space-probes-ids";
import {
  clampEclipseOffsetMinutes,
  isEclipseId,
} from "@/lib/eclipses-ids";
import { GEOLOGICAL_MILESTONE_MA } from "@/lib/epoch/constants";
import { COUNTRY_ISO_CODES } from "@/lib/country-isos";
import { findMilestoneById } from "@/lib/milestones";
import { HISTORICAL_ENTITY_IDS } from "@/lib/historical-eras";
import type { ObservatoryLayer } from "@/lib/observatory-data";
import { encodeGibsView, readGibsView } from "@/lib/gibs-view";
import { DEFAULT_BIOME_SCOPE, encodeBiomesView, readBiomesView } from "@/lib/biomes-types";
import {
  DEFAULT_SEISMIC_MIN_MAGNITUDE,
  DEFAULT_SEISMIC_WINDOW,
  DEFAULT_SHOW_TECTONIC_PLATES,
  encodeSeismicView,
  readSeismicView,
} from "@/lib/seismic-types";
import { DEFAULT_AQI_SCALE_MODE, isAqiScaleMode } from "@/lib/air-quality-types";
import {
  DEFAULT_CABLE_BASIN_FILTER,
  DEFAULT_SHOW_CABLE_CHOKE_POINTS,
  encodeCablesView,
  readCablesView,
} from "@/lib/submarine-cables-types";
import { DEFAULT_MAP_PROJECTION, readMapView } from "@/lib/map-projections-types";
import {
  CHOROPLETH_MAX_YEAR,
  CHOROPLETH_MIN_YEAR,
  isChoroplethIndicatorId,
  isTemporalChoroplethIndicator,
} from "@/lib/choropleth-ids";
import { useChoroplethStore } from "@/stores/choroplethStore";
import { isCriticalGeoLensId } from "@/lib/critical-geo-ids";
import { useCriticalGeoStore } from "@/stores/criticalGeoStore";
import { isTransversalEntityId } from "@/lib/transversal-types";
import { useTransversalStore } from "@/stores/transversalStore";
import { ALL_COSMIC_LAYERS, useCosmicStore } from "@/stores/cosmicStore";
import { selectCountry } from "@/stores/actions";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useGlobeStore } from "@/stores/globeStore";
import { RIGHT_PANEL_ORDER, useLayoutStore } from "@/stores/layoutStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import {
  DEFAULT_TIMELINE_END_YEAR,
  DEFAULT_TIMELINE_START_YEAR,
} from "@/lib/timeline/current-year";
import { ALL_CATEGORIES, useTimelineStore } from "@/stores/timelineStore";
import { parseCameraOffset, DEFAULT_CAMERA_OFFSET, type ViewCamera } from "./view-camera";

const layerIds: readonly ObservatoryLayer[] = [
  "NASA_FIRMS",
  "NASA_EONET",
  "ISS_SATELLITES",
  "FLIGHTS_OPENSKY",
  "MARITIME_ROUTES",
  "NASA_GIBS",
  "GLOBAL_WINDS",
  "MARINE_DEBRIS",
  "INPE_DEFORESTATION",
  "BIOMES_MAP",
  "SPECIES_MAP",
  "USGS_EARTHQUAKES",
  "SUBMARINE_CABLES",
  "AIR_QUALITY",
];
const viewKeys = [
  "visao", "pais", "ano", "periodo", "ma", "marco", "categorias", "modo", "corpo", "sonda", "eclipse", "escala",
  "camadas", "gibs", "bioma", "sismos", "cabos", "aqi", "camadasCosmos", "observatorio", "painel", "comparar", "camera",
  "mapa", "proj", "coropletico", "coropleticoAno", "lente", "trilha",
];

function numberIn(value: string | null, min: number, max: number) {
  if (value === null || !/^-?\d+(?:\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  return number >= min && number <= max ? number : null;
}

function members<T extends string>(value: string | null, allowed: readonly T[]) {
  const values = new Set(value?.split(",") ?? []);
  return allowed.filter((member) => values.has(member));
}

export function encodeView(view: ViewCamera) {
  const timeline = useTimelineStore.getState();
  const cosmic = useCosmicStore.getState();
  const observatory = useObservatoryStore.getState();
  const comparator = useComparatorStore.getState();
  const params = new URLSearchParams();
  const globe = useGlobeStore.getState();
  const iso = globe.selectedIso;
  const panel = useLayoutStore.getState().activeRightPanel;
  if (iso) params.set("pais", iso);
  if (globe.viewMode === "2d" && !cosmic.isCosmicMode) {
    params.set("mapa", "2d");
    if (globe.projectionId !== DEFAULT_MAP_PROJECTION) {
      params.set("proj", globe.projectionId);
    }
  }
  if (timeline.selectedYear !== null) params.set("ano", String(timeline.selectedYear));
  if (timeline.geologicalMa !== null) params.set("ma", String(timeline.geologicalMa));
  if (timeline.startYear !== DEFAULT_TIMELINE_START_YEAR || timeline.endYear !== DEFAULT_TIMELINE_END_YEAR) {
    params.set("periodo", `${timeline.startYear},${timeline.endYear}`);
  }
  if (timeline.selectedMilestoneId) params.set("marco", timeline.selectedMilestoneId);
  if (timeline.activeCategories.length !== ALL_CATEGORIES.length) {
    params.set("categorias", timeline.activeCategories.join(","));
  }
  if (cosmic.isCosmicMode) params.set("modo", "cosmos");
  if (cosmic.focusedBodyId) params.set("corpo", cosmic.focusedBodyId);
  if (cosmic.focusedProbeId) params.set("sonda", cosmic.focusedProbeId);
  if (cosmic.activeEclipseId) {
    params.set(
      "eclipse",
      cosmic.eclipseOffsetMinutes !== 0
        ? `${cosmic.activeEclipseId},${cosmic.eclipseOffsetMinutes}`
        : cosmic.activeEclipseId
    );
  }
  if (cosmic.scaleMode === "real") params.set("escala", "real");
  if (cosmic.activeCosmicLayers.length !== ALL_COSMIC_LAYERS.length) {
    params.set("camadasCosmos", cosmic.activeCosmicLayers.join(","));
  }
  if (observatory.activeLayers.length) params.set("camadas", observatory.activeLayers.join(","));
  // Produto e mês da camada GIBS (D25); sem mês = o último processado quando o link for aberto.
  if (observatory.activeLayers.includes("NASA_GIBS")) {
    params.set("gibs", encodeGibsView(observatory.gibsProduct, observatory.gibsMonth));
  }
  if (observatory.activeLayers.includes("BIOMES_MAP")) {
    params.set("bioma", encodeBiomesView(observatory.biomeScope, observatory.biomeFilterId));
  }
  if (observatory.activeLayers.includes("USGS_EARTHQUAKES")) {
    params.set(
      "sismos",
      encodeSeismicView(
        observatory.seismicWindow,
        observatory.seismicMinMagnitude,
        observatory.showTectonicPlates
      )
    );
  }
  if (observatory.activeLayers.includes("SUBMARINE_CABLES")) {
    params.set(
      "cabos",
      encodeCablesView(observatory.cableBasinFilter, observatory.showCableChokePoints)
    );
  }
  if (observatory.activeLayers.includes("AIR_QUALITY") && observatory.aqiScaleMode !== DEFAULT_AQI_SCALE_MODE) {
    params.set("aqi", observatory.aqiScaleMode);
  }
  if (observatory.isPanelOpen) params.set("observatorio", "1");
  const choropleth = useChoroplethStore.getState();
  if (choropleth.activeIndicator && !cosmic.isCosmicMode) {
    params.set("coropletico", choropleth.activeIndicator);
    if (choropleth.year !== null && isTemporalChoroplethIndicator(choropleth.activeIndicator)) {
      params.set("coropleticoAno", String(choropleth.year));
    }
  }
  const criticalGeo = useCriticalGeoStore.getState();
  if (criticalGeo.activeLens && !cosmic.isCosmicMode) {
    params.set("lente", criticalGeo.activeLens);
  }
  const transversal = useTransversalStore.getState();
  if (transversal.activeEntityId && !cosmic.isCosmicMode) {
    params.set("trilha", transversal.activeEntityId);
  }
  if (panel) params.set("painel", panel);
  if (comparator.isOpen) params.set("comparar", comparator.selectedIsos.join(","));
  if (view.offset.some((value, axis) => value !== DEFAULT_CAMERA_OFFSET[axis])) {
    params.set("camera", view.offset.join(","));
  }
  return params.toString();
}

export function mergeView(search: string, encoded: string) {
  const params = new URLSearchParams(search);
  viewKeys.forEach((key) => params.delete(key));
  params.set("visao", "1");
  new URLSearchParams(encoded).forEach((value, key) => params.set(key, value));
  return `?${params}`;
}

export function restoreView(search: string, view: ViewCamera) {
  const params = new URLSearchParams(search);
  if (params.get("visao") !== "1") return false;
  const iso = params.get("pais");
  selectCountry(iso && (COUNTRY_ISO_CODES.has(iso) || (HISTORICAL_ENTITY_IDS as readonly string[]).includes(iso)) ? iso : null);

  const [from, to] = (params.get("periodo") ?? "").split(",");
  const start = numberIn(from ?? null, 1, 9998);
  const end = numberIn(to ?? null, 2, 9999);
  const validRange = start !== null && end !== null && start < end;
  const milestone = params.get("marco");
  const ma = numberIn(params.get("ma"), 0, 4600);
  const categories = members(params.get("categorias"), ALL_CATEGORIES);
  useTimelineStore.setState({
    startYear: validRange ? start : DEFAULT_TIMELINE_START_YEAR,
    endYear: validRange ? end : DEFAULT_TIMELINE_END_YEAR,
    selectedYear: ma === null ? numberIn(params.get("ano"), 1, 9999) : null,
    geologicalMa: ma,
    selectedMilestoneId: milestone && (findMilestoneById(milestone) || Object.hasOwn(GEOLOGICAL_MILESTONE_MA, milestone)) ? milestone : null,
    activeCategories: categories.length ? categories : [...ALL_CATEGORIES],
  });

  const body = params.get("corpo");
  const focusedBodyId = CELESTIAL_BODY_IDS.find((id) => id === body) ?? null;
  const rawProbe = params.get("sonda");
  const probeCandidate = isDeepSpaceProbeId(rawProbe) ? rawProbe : null;
  const [rawEclipseId, rawEclipseOffset] = (params.get("eclipse") ?? "").split(",");
  const activeEclipseId = isEclipseId(rawEclipseId) ? rawEclipseId : null;
  const eclipseOffsetMinutes = activeEclipseId
    ? clampEclipseOffsetMinutes(Number(rawEclipseOffset ?? "0"))
    : 0;
  const isCosmicMode = params.get("modo") === "cosmos" || probeCandidate !== null;
  const focusedProbeId = isCosmicMode ? probeCandidate : null;
  const focus =
    focusedProbeId === null && (isCosmicMode || focusedBodyId === "MOON")
      ? focusedBodyId
      : null;
  useCosmicStore.setState({
    isCosmicMode,
    focusedBodyId: focus,
    focusedProbeId,
    activeEclipseId,
    eclipseOffsetMinutes,
    isEclipseMenuOpen: activeEclipseId !== null,
    isInspectorOpen: focus !== null || focusedProbeId !== null,
    isPlaying: false,
    scaleMode: params.get("escala") === "real" ? "real" : "visual",
    activeCosmicLayers: params.has("camadasCosmos")
      ? members(params.get("camadasCosmos"), ALL_COSMIC_LAYERS) : [...ALL_COSMIC_LAYERS],
  });

  const observatory = useObservatoryStore.getState();
  const layers = members(params.get("camadas"), layerIds);
  const [gibsProduct, gibsMonth] = (params.get("gibs") ?? "").split(",");
  const gibs = readGibsView(gibsProduct, gibsMonth ?? null);
  // Antes de ligar as camadas, para a primeira carga já pedir o produto e o mês do link.
  observatory.setGibsRequest(gibs ?? { product: "ndvi", month: null });
  const biomesView = readBiomesView(params.get("bioma"));
  observatory.setBiomeScope(biomesView?.scope ?? DEFAULT_BIOME_SCOPE);
  observatory.setBiomeFilterId(biomesView?.filterId ?? null);
  observatory.setSelectedBiomeId(biomesView?.filterId ?? null);
  const seismicView = readSeismicView(params.get("sismos"));
  observatory.setSeismicFilter({
    window: seismicView?.window ?? DEFAULT_SEISMIC_WINDOW,
    minMagnitude: seismicView?.minMagnitude ?? DEFAULT_SEISMIC_MIN_MAGNITUDE,
  });
  observatory.setShowTectonicPlates(seismicView?.showPlates ?? DEFAULT_SHOW_TECTONIC_PLATES);
  const cablesView = readCablesView(params.get("cabos"));
  observatory.setCableBasinFilter(cablesView?.basin ?? DEFAULT_CABLE_BASIN_FILTER);
  observatory.setShowCableChokePoints(cablesView?.showChokePoints ?? DEFAULT_SHOW_CABLE_CHOKE_POINTS);
  const aqiParam = params.get("aqi");
  observatory.setAqiScaleMode(isAqiScaleMode(aqiParam) ? aqiParam : DEFAULT_AQI_SCALE_MODE);
  if (layers.length !== observatory.activeLayers.length || layers.some((id) => !observatory.activeLayers.includes(id))) {
    observatory.setAllLayers(layers);
  }
  observatory.setPanelOpen(params.get("observatorio") === "1");
  const [panel = null] = members(params.get("painel"), RIGHT_PANEL_ORDER);
  useLayoutStore.getState().setActiveRightPanel(panel);
  useComparatorStore.setState({
    isOpen: params.has("comparar"),
    selectedIsos: [...new Set(params.get("comparar")?.split(",") ?? [])]
      .filter((code) => COUNTRY_ISO_CODES.has(code)).slice(0, 4),
  });
  const mapView = readMapView(params.get("mapa"), params.get("proj"));
  useGlobeStore.getState().setProjectionId(mapView.projectionId);
  useGlobeStore.getState().setViewMode(isCosmicMode ? "3d" : mapView.viewMode);

  const coroParam = params.get("coropletico");
  const coroYearParam = numberIn(
    params.get("coropleticoAno"),
    CHOROPLETH_MIN_YEAR,
    CHOROPLETH_MAX_YEAR
  );
  useChoroplethStore
    .getState()
    .restoreIndicator(
      !isCosmicMode && isChoroplethIndicatorId(coroParam) ? coroParam : null,
      coroYearParam
    );

  const lensParam = params.get("lente");
  const validLens = !isCosmicMode && isCriticalGeoLensId(lensParam) ? lensParam : null;
  useCriticalGeoStore.getState().restoreLens(validLens);
  if (validLens) {
    useChoroplethStore.getState().clearIndicator();
  }

  const trilhaParam = params.get("trilha");
  const validTrilha = !isCosmicMode && isTransversalEntityId(trilhaParam) ? trilhaParam : null;
  useTransversalStore.getState().restoreEntityFromUrl(validTrilha);

  const camera = parseCameraOffset(params.get("camera"));
  view.offset = camera ?? DEFAULT_CAMERA_OFFSET;
  view.restore = camera ?? (isCosmicMode || focus ? null : DEFAULT_CAMERA_OFFSET);
  return true;
}
