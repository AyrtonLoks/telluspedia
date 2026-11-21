/**
 * TellusPedia — Rotas de Expedições Históricas & Trajetórias 3D (RN12)
 *
 * Reconstituição náutica, geodésica e cronológica da Primeira Circum-navegação da Terra
 * por Fernão de Magalhães e Juan Sebastián Elcano (1519–1522), a bordo da Armada das Molucas.
 *
 * Fontes primárias e historiográficas:
 * - Pigafetta, Antonio. "Relazione del primo viaggio intorno al mondo" (1524–1525).
 * - Zweig, Stefan. "Magalhães: O Homem e o Seu Feito" (1938).
 * - Bergreen, Laurence. "Over the Edge of the World: Magellan's Terrifying Circumnavigation of the Globe" (2003).
 * - Instituto Geográfico Nacional de España (IGN) — "500º Aniversario de la Primera Vuelta al Mundo".
 */

import { latLngToVector3, vector3ToLatLng, slerpVectors } from "./geo-spatial";
import { getScene, fact } from "./scenes/catalog";
import type { Scene } from "./scenes/schema";

export type HistoricalRouteId = "magellan-1519" | (string & {});

export interface HistoricalVessel {
  name: string;
  type: string;
  tonnage: number;
  originalCaptain: string;
  crewCount: number;
  fate: string;
}

export interface RouteWaypoint {
  id: string;
  order: number;
  name: string;
  lat: number;
  lng: number;
  date: string;
  calendarDate: string;
  dayOfVoyage: number;
  daysAtSea: number;
  leaguesNavigated: number;
  vessel: string;
  commander: string;
  modernCountry: string;
  description: string;
  historicalEvent: string;
  milestoneTitle?: string;
  quoteFromPigafetta?: string;
  pigafettaDiary?: string;
  vesselStatus?: string;
}

export interface LogbookEntry {
  date: string;
  location: string;
  event: string;
  excerptPigafetta?: string;
}

export interface HistoricalRouteDefinition {
  id: HistoricalRouteId;
  title: string;
  subtitle: string;
  type: "MARITIME" | "TERRESTRIAL" | "AVIATION";
  startYear: number;
  endYear: number;
  commander: string;
  flagCountry: string; // ISO 3166-1 alpha-3: "ESP"
  vessels: string[];
  fleet: HistoricalVessel[];
  survivorsCount: string;
  totalDistanceKm: number;
  durationDays: number;
  description: string;
  waypoints: RouteWaypoint[];
  logbookEntries: LogbookEntry[];
  citations: {
    authors: string;
    title: string;
    publication: string;
    year: number;
    doi?: string;
    url?: string;
  }[];
  dossierMarkdown: string;
}

// Aliases para conformidade com o plano técnico
export type HistoricalRoute = HistoricalRouteDefinition;
export type HistoricalRouteWaypoint = RouteWaypoint;

// ---------------------------------------------------------------------------------------------
// Dados da expedição: vêm da cena `src/data/scenes/magellan-1519.json` (D12b). Os formatos abaixo
// são mantidos para os componentes atuais até o player genérico (D12c).

const MAGELLAN_SCENE = (() => {
  const scene = getScene("magellan-1519");
  if (!scene) throw new Error("cena magellan-1519 ausente");
  return scene;
})();

const isoToDmy = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export const MAGELLAN_FLEET: HistoricalVessel[] = MAGELLAN_SCENE.participants.map((p) => ({
  name: p.name,
  type: p.role,
  tonnage: fact<number>(p.facts, "tonnage"),
  originalCaptain: fact<string>(p.facts, "originalCaptain"),
  crewCount: fact<number>(p.facts, "crewCount"),
  fate: p.description ?? "",
}));

const MAGELLAN_TRAJECTORY = MAGELLAN_SCENE.trajectories.find((t) => t.kind === "surface");
if (!MAGELLAN_TRAJECTORY || MAGELLAN_TRAJECTORY.kind !== "surface") throw new Error("cena magellan-1519 sem trajetória");

export const MAGELLAN_WAYPOINTS: RouteWaypoint[] = MAGELLAN_TRAJECTORY.points.map((p) => {
  const w: RouteWaypoint = {
    id: p.id,
    order: fact<number>(p.facts, "order"),
    name: p.name,
    lat: p.lat,
    lng: p.lng,
    date: isoToDmy(p.time),
    calendarDate: p.time.slice(0, 10),
    dayOfVoyage: fact<number>(p.facts, "dayOfVoyage"),
    daysAtSea: fact<number>(p.facts, "daysAtSea"),
    leaguesNavigated: fact<number>(p.facts, "leaguesNavigated"),
    vessel: fact<string>(p.facts, "vessel"),
    commander: fact<string>(p.facts, "commander"),
    modernCountry: fact<string>(p.facts, "modernCountry"),
    description: p.description ?? "",
    historicalEvent: fact<string>(p.facts, "historicalEvent"),
  };
  if (p.facts?.milestoneTitle !== undefined) w.milestoneTitle = String(p.facts.milestoneTitle);
  if (p.quote) w.quoteFromPigafetta = p.quote.text;
  if (p.facts?.pigafettaDiary !== undefined) w.pigafettaDiary = String(p.facts.pigafettaDiary);
  if (p.facts?.vesselStatus !== undefined) w.vesselStatus = String(p.facts.vesselStatus);
  return w;
});

export const MAGELLAN_LOGBOOK_ENTRIES: LogbookEntry[] = MAGELLAN_SCENE.chronicle.map((c) => {
  const e: LogbookEntry = { date: isoToDmy(c.date), location: c.place ?? "", event: c.text };
  if (c.quote) e.excerptPigafetta = c.quote.text;
  return e;
});

function routeFromScene(scene: Scene): HistoricalRouteDefinition {
  const f = scene.facts;
  return {
    id: scene.id,
    title: fact<string>(f, "routeTitle"),
    subtitle: scene.subtitle ?? "",
    type: fact<string>(f, "routeType") as HistoricalRouteDefinition["type"],
    startYear: fact<number>(f, "startYear"),
    endYear: fact<number>(f, "endYear"),
    commander: fact<string>(f, "commander"),
    flagCountry: fact<string>(f, "flagCountry"),
    vessels: MAGELLAN_FLEET.map((v) => v.name),
    fleet: MAGELLAN_FLEET,
    survivorsCount: fact<string>(f, "survivorsCount"),
    totalDistanceKm: fact<number>(f, "totalDistanceKm"),
    durationDays: fact<number>(f, "durationDays"),
    description: fact<string>(f, "routeDescription"),
    waypoints: MAGELLAN_WAYPOINTS,
    logbookEntries: MAGELLAN_LOGBOOK_ENTRIES,
    // A primeira fonte é a do marco; as demais são as referências bibliográficas da rota.
    citations: scene.sources.slice(1).map((src) => {
      const c: HistoricalRouteDefinition["citations"][number] = {
        authors: src.authors ?? "",
        title: src.title ?? src.label,
        publication: src.publication ?? "",
        year: src.year ?? 0,
      };
      if (src.doi) c.doi = src.doi;
      if (src.url) c.url = src.url;
      return c;
    }),
    dossierMarkdown: scene.dossierMarkdown ?? "",
  };
}

export const HISTORICAL_ROUTES: Record<string, HistoricalRouteDefinition> = {
  "magellan-1519": routeFromScene(MAGELLAN_SCENE),
};

export const MAGELLAN_ROUTE: HistoricalRouteDefinition = HISTORICAL_ROUTES["magellan-1519"];

/**
 * Recupera os metadados de uma rota histórica pelo seu identificador.
 */
export function getHistoricalRoute(
  routeId: string | null | undefined
): HistoricalRouteDefinition | null {
  if (!routeId) return null;
  return HISTORICAL_ROUTES[routeId] ?? null;
}

/**
 * Cálculo da distância total percorrida somando os segmentos de grande círculo (Haversine).
 */
export function calculateRouteDistanceKm(waypoints: RouteWaypoint[]): number {
  if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) return 0;
  const EARTH_RADIUS_KM = 6371.0;
  let totalKm = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];
    if (
      !p1 ||
      !p2 ||
      typeof p1.lat !== "number" ||
      typeof p1.lng !== "number" ||
      typeof p2.lat !== "number" ||
      typeof p2.lng !== "number" ||
      !Number.isFinite(p1.lat) ||
      !Number.isFinite(p1.lng) ||
      !Number.isFinite(p2.lat) ||
      !Number.isFinite(p2.lng)
    ) {
      continue;
    }

    const lat1Rad = (p1.lat * Math.PI) / 180;
    const lat2Rad = (p2.lat * Math.PI) / 180;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;

    let dLngDeg = p2.lng - p1.lng;
    if (dLngDeg > 180) dLngDeg -= 360;
    if (dLngDeg < -180) dLngDeg += 360;
    const dLng = (dLngDeg * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalKm += EARTH_RADIUS_KM * c;
  }

  return Math.round(totalKm);
}

/**
 * Interpolação esférica geodésica contínua para trajetórias de navegação Three.js.
 * Utiliza o slerp tridimensional rigoroso no espaço esférico unitário, garantindo
 * fidelidade cartográfica sem distorções no anti-meridiano do Pacífico.
 */
export function interpolateGeodesicSegment(
  p1: { lat: number; lng: number } | null | undefined,
  p2: { lat: number; lng: number } | null | undefined,
  steps: number = 8
): Array<{ lat: number; lng: number }> {
  if (
    !p1 ||
    !p2 ||
    typeof p1.lat !== "number" ||
    typeof p1.lng !== "number" ||
    typeof p2.lat !== "number" ||
    typeof p2.lng !== "number" ||
    !Number.isFinite(p1.lat) ||
    !Number.isFinite(p1.lng) ||
    !Number.isFinite(p2.lat) ||
    !Number.isFinite(p2.lng)
  ) {
    return [];
  }

  if (steps < 1) {
    return [{ lat: p1.lat, lng: p1.lng }];
  }

  const v1 = latLngToVector3(p1.lat, p1.lng, 1.0);
  const v2 = latLngToVector3(p2.lat, p2.lng, 1.0);
  const result: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const v = slerpVectors(v1, v2, t);
    const pt = vector3ToLatLng(v);
    result.push(pt);
  }

  return result;
}

/**
 * Recupera um waypoint histórico específico pelo seu identificador na rota.
 */
export function findRouteWaypoint(
  waypointId: string,
  routeId: string = "magellan-1519"
): RouteWaypoint | null {
  if (!waypointId) return null;
  const route = getHistoricalRoute(routeId);
  if (!route) return null;
  const targetId = waypointId.trim().toUpperCase();
  return (
    route.waypoints.find(
      (w) => w.id === waypointId || w.id.toUpperCase() === targetId
    ) ?? null
  );
}
