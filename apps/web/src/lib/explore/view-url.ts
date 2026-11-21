import { CELESTIAL_BODY_IDS } from "@/lib/celestial-bodies";
import { GEOLOGICAL_MILESTONE_MA } from "@/lib/epoch/constants";
import { WORLD_COUNTRIES_CATALOG, findMilestoneById } from "@/lib/country-data";
import { HISTORICAL_ENTITIES } from "@/lib/historical-entities";
import type { ObservatoryLayer } from "@/lib/observatory-data";
import { encodeGibsView, readGibsView } from "@/lib/gibs";
import { ALL_COSMIC_LAYERS, useCosmicStore } from "@/stores/cosmicStore";
import { selectCountry } from "@/stores/actions";
import { useComparatorStore } from "@/stores/comparatorStore";
import { useGlobeStore } from "@/stores/globeStore";
import { RIGHT_PANEL_ORDER, useLayoutStore } from "@/stores/layoutStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { ALL_CATEGORIES, useTimelineStore } from "@/stores/timelineStore";
import { parseCameraOffset, DEFAULT_CAMERA_OFFSET, type ViewCamera } from "./view-camera";

const layerIds: readonly ObservatoryLayer[] = [
  "NASA_FIRMS", "NASA_EONET", "ISS_SATELLITES", "FLIGHTS_OPENSKY", "MARITIME_ROUTES", "NASA_GIBS",
];
const viewKeys = [
  "visao", "pais", "ano", "periodo", "ma", "marco", "categorias", "modo", "corpo", "escala",
  "camadas", "gibs", "camadasCosmos", "observatorio", "painel", "comparar", "camera",
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
  const iso = useGlobeStore.getState().selectedIso;
  const panel = useLayoutStore.getState().activeRightPanel;
  if (iso) params.set("pais", iso);
  if (timeline.selectedYear !== null) params.set("ano", String(timeline.selectedYear));
  if (timeline.geologicalMa !== null) params.set("ma", String(timeline.geologicalMa));
  if (timeline.startYear !== 1974 || timeline.endYear !== 2024) {
    params.set("periodo", `${timeline.startYear},${timeline.endYear}`);
  }
  if (timeline.selectedMilestoneId) params.set("marco", timeline.selectedMilestoneId);
  if (timeline.activeCategories.length !== ALL_CATEGORIES.length) {
    params.set("categorias", timeline.activeCategories.join(","));
  }
  if (cosmic.isCosmicMode) params.set("modo", "cosmos");
  if (cosmic.focusedBodyId) params.set("corpo", cosmic.focusedBodyId);
  if (cosmic.scaleMode === "real") params.set("escala", "real");
  if (cosmic.activeCosmicLayers.length !== ALL_COSMIC_LAYERS.length) {
    params.set("camadasCosmos", cosmic.activeCosmicLayers.join(","));
  }
  if (observatory.activeLayers.length) params.set("camadas", observatory.activeLayers.join(","));
  // Produto e mês da camada GIBS (D25); sem mês = o último processado quando o link for aberto.
  if (observatory.activeLayers.includes("NASA_GIBS")) {
    params.set("gibs", encodeGibsView(observatory.gibsProduct, observatory.gibsMonth));
  }
  if (observatory.isPanelOpen) params.set("observatorio", "1");
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
  selectCountry(iso && (Object.hasOwn(WORLD_COUNTRIES_CATALOG, iso) || Object.hasOwn(HISTORICAL_ENTITIES, iso)) ? iso : null);

  const [from, to] = (params.get("periodo") ?? "").split(",");
  const start = numberIn(from ?? null, 1, 9998);
  const end = numberIn(to ?? null, 2, 9999);
  const validRange = start !== null && end !== null && start < end;
  const milestone = params.get("marco");
  const ma = numberIn(params.get("ma"), 0, 4600);
  const categories = members(params.get("categorias"), ALL_CATEGORIES);
  useTimelineStore.setState({
    startYear: validRange ? start : 1974,
    endYear: validRange ? end : 2024,
    selectedYear: ma === null ? numberIn(params.get("ano"), 1, 9999) : null,
    geologicalMa: ma,
    selectedMilestoneId: milestone && (findMilestoneById(milestone) || Object.hasOwn(GEOLOGICAL_MILESTONE_MA, milestone)) ? milestone : null,
    activeCategories: categories.length ? categories : [...ALL_CATEGORIES],
  });

  const body = params.get("corpo");
  const focusedBodyId = CELESTIAL_BODY_IDS.find((id) => id === body) ?? null;
  const isCosmicMode = params.get("modo") === "cosmos";
  const focus = isCosmicMode || focusedBodyId === "MOON" ? focusedBodyId : null;
  useCosmicStore.setState({
    isCosmicMode,
    focusedBodyId: focus,
    isInspectorOpen: focus !== null,
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
  if (layers.length !== observatory.activeLayers.length || layers.some((id) => !observatory.activeLayers.includes(id))) {
    observatory.setAllLayers(layers);
  }
  observatory.setPanelOpen(params.get("observatorio") === "1");
  const [panel = null] = members(params.get("painel"), RIGHT_PANEL_ORDER);
  useLayoutStore.getState().setActiveRightPanel(panel);
  useComparatorStore.setState({
    isOpen: params.has("comparar"),
    selectedIsos: [...new Set(params.get("comparar")?.split(",") ?? [])]
      .filter((code) => Object.hasOwn(WORLD_COUNTRIES_CATALOG, code)).slice(0, 4),
  });
  const camera = parseCameraOffset(params.get("camera"));
  view.offset = camera ?? DEFAULT_CAMERA_OFFSET;
  view.restore = camera ?? (isCosmicMode || focus ? null : DEFAULT_CAMERA_OFFSET);
  return true;
}
