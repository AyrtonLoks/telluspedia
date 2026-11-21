import { ASTROPHYSICAL_CATALOG, type CelestialBodyId } from "@/lib/astronomy-planets";
import {
  GLOBAL_MILESTONES, PILOT_COUNTRIES, WORLD_COUNTRIES_CATALOG, findMilestoneById, getCountryData,
} from "@/lib/country-data";
import { HISTORICAL_ENTITIES, HISTORICAL_ERAS } from "@/lib/historical-entities";
import type { ObservatoryLayerId } from "@/lib/observatory-data";
import { getEpochState } from "@/lib/epoch/useEpochState";
import { applyTimelinePreset, restoreContemporaryTimeline, selectCountry } from "@/stores/actions";
import { CHOROPLETH_INDICATOR_LIST, type ChoroplethIndicatorId } from "@/lib/choropleth";
import { useChoroplethStore } from "@/stores/choroplethStore";
import { useComparatorStore } from "@/stores/comparatorStore";
import { ALL_COSMIC_LAYERS, COSMIC_LAYER_LABELS, useCosmicStore, type CosmicLayerId } from "@/stores/cosmicStore";
import { useGlobeStore } from "@/stores/globeStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useObservatoryStore } from "@/stores/observatoryStore";
import { useSceneStore } from "@/stores/sceneStore";
import { useTimelineStore, type TimelinePreset } from "@/stores/timelineStore";

const OBSERVATORY_SEARCH_LAYERS: Record<ObservatoryLayerId, { title: string; keywords: string }> = {
  NASA_FIRMS: { title: "Queimadas ativas", keywords: "focos de calor incêndios fogo FIRMS NASA" },
  NASA_EONET: { title: "Eventos severos", keywords: "EONET tempestades ciclones vulcões alertas eventos naturais" },
  ISS_SATELLITES: { title: "ISS e satélites artificiais", keywords: "estação espacial CelesTrak" },
  FLIGHTS_OPENSKY: { title: "Tráfego aéreo", keywords: "aviões aeronaves voos OpenSky" },
  MARITIME_ROUTES: { title: "Tráfego marítimo", keywords: "navios barcos embarcações AIS" },
};

const presets: Record<TimelinePreset, string> = {
  LAST_50_YEARS: "Últimos 50 anos",
  COLD_WAR: "Guerra Fria",
  WORLD_WARS: "Guerras Mundiais",
  "21ST_CENTURY": "Século XXI",
  PANGEA_250MA: "Pangeia (250 Ma)",
  GONDWANA_150MA: "Gondwana e Laurásia (150 Ma)",
  KPG_66MA: "Extinção K–Pg (66 Ma)",
  MAGELLAN_1519: "Circum-navegação de Magalhães–Elcano",
};

export const SEARCH_GROUPS = {
  country: "Países",
  historical: "Entidades históricas",
  event: "Eventos",
  body: "Corpos celestes",
  layer: "Camadas do Observatório",
  choropleth: "Mapa temático coroplético",
  cosmicLayer: "Camadas cósmicas",
  preset: "Períodos e eras",
  command: "Comandos",
} as const;

export type SearchResult = {
  id: string;
  group: keyof typeof SEARCH_GROUPS;
  title: string;
  detail?: string;
  keywords?: string;
};

const seenEvents = new Set<string>();
const eventRecords = [
  ...GLOBAL_MILESTONES,
  ...Object.values(PILOT_COUNTRIES).flatMap((country) => country.milestones.map((event) => ({
    ...event, countryIso: event.countryIso ?? country.isoCode,
  }))),
].filter((event) => {
  const key = `${event.year}:${event.countryIso ?? ""}:${event.title}`;
  if (seenEvents.has(key)) return false;
  seenEvents.add(key);
  return true;
});

const entries: SearchResult[] = [
  ...Object.values(WORLD_COUNTRIES_CATALOG).map((country) => ({
    id: `country:${country.isoCode}`, group: "country" as const, title: country.nameCommon,
    detail: country.isoCode, keywords: `${country.iso2} ${country.nameNaturalEarth}`,
  })),
  ...Object.values(HISTORICAL_ENTITIES).map((entity) => ({
    id: `historical:${entity.id}`, group: "historical" as const, title: entity.nameCommon,
    detail: `${entity.startYear}–${entity.endYear}`, keywords: `${entity.id} ${entity.nameOfficial}`,
  })),
  ...eventRecords.map((event) => ({
    id: `event:${event.id}`, group: "event" as const, title: event.title,
    detail: String(event.year), keywords: event.countryIso,
  })),
  ...Object.values(ASTROPHYSICAL_CATALOG).map((body) => ({
    id: `body:${body.id}`, group: "body" as const, title: body.namePt, keywords: body.name,
  })),
  ...Object.entries(OBSERVATORY_SEARCH_LAYERS).map(([id, layer]) => ({
    id: `layer:${id}`, group: "layer" as const, title: layer.title, keywords: `ativar ${layer.keywords}`,
  })),
  ...CHOROPLETH_INDICATOR_LIST.map((item) => ({
    id: `choropleth:${item.id}`,
    group: "choropleth" as const,
    title: `Mapa temático: ${item.label}`,
    detail: item.sourcePrimary,
    keywords: `coropletico tematico globo colorir indicador ${item.shortLabel} ${item.unit} ${item.id}`,
  })),
  ...ALL_COSMIC_LAYERS.map((id) => ({
    id: `cosmicLayer:${id}`, group: "cosmicLayer" as const, title: COSMIC_LAYER_LABELS[id], keywords: "ativar cosmos",
  })),
  ...Object.entries(presets).map(([id, title]) => ({
    id: `preset:${id}`, group: "preset" as const, title,
  })),
  { id: "compare:", group: "command", title: "Abrir comparador", keywords: "comparar países" },
  { id: "route:/studies", group: "command", title: "Abrir Galeria de Estudos", detail: "/studies", keywords: "estudos públicos galeria forks snapshots" },
  { id: "year:2024", group: "command", title: "Ir para 2024", keywords: "época presente ano" },
];

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
}

function oneEditAway(query: string, word: string) {
  if (!/\p{L}/u.test(query) || query.length < 4 || Math.abs(query.length - word.length) > 1) return false;
  let left = 0;
  while (left < query.length && query[left] === word[left]) left++;
  if (query.length !== word.length) {
    const [shorter, longer] = query.length < word.length ? [query, word] : [word, query];
    return shorter.slice(left) === longer.slice(left + 1);
  }
  return query.slice(left + 1) === word.slice(left + 1) ||
    (query[left] === word[left + 1] && query[left + 1] === word[left] && query.slice(left + 2) === word.slice(left + 2));
}

const index = entries.map((entry) => ({
  entry,
  title: normalize(entry.title),
  detail: normalize(entry.detail ?? ""),
  words: normalize(`${entry.title} ${entry.detail ?? ""} ${entry.keywords ?? ""}`).split(/[^\p{L}\p{N}]+/u),
}));
const byId = new Map(entries.map((entry) => [entry.id, entry]));
const comparePrefix = /^(?:abrir\s+)?(?:comparador|comparar)(?:\s+(.+))?$/;
const yearPattern = /^(?:ir para\s+)?(\d{1,4})$/;

function parseComparison(ids: string) {
  const isos = [...new Set(ids.toUpperCase().split(/[\s,]+/).filter(Boolean))];
  return isos.length <= 4 && isos.every((iso) => Object.hasOwn(WORLD_COUNTRIES_CATALOG, iso)) ? isos : null;
}

function yearResult(yearText: string): SearchResult | undefined {
  const year = Number(yearText);
  if (!Number.isInteger(year) || year < 1 || year > 9999) return;
  return { id: `year:${year}`, group: "command", title: `Ir para ${year}` };
}

export function findSearchResult(id: string): SearchResult | undefined {
  const known = byId.get(id);
  if (known) return known;
  if (/^year:\d{1,4}$/.test(id)) return yearResult(id.slice(5));
  if (!id.startsWith("compare:")) return;
  const isos = parseComparison(id.slice(8));
  if (isos) return {
    id: `compare:${isos.join(",")}`, group: "command", title: "Abrir comparador", detail: isos.join(", "),
  };
}

export function searchExplore(raw: string): SearchResult[] {
  const query = normalize(raw);
  if (!query) return [];
  const tokens = query.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!tokens.length) return [];
  const comparison = query.match(comparePrefix);
  if (comparison?.[1]) {
    const result = findSearchResult(`compare:${comparison[1]}`);
    if (result) return [result];
  }
  const scored = index.flatMap(({ entry, title, detail, words }) => {
    const score = title === query ? 100 : detail === query ? 90 : title.startsWith(query) ? 75 :
      title.includes(query) ? 65 :
      tokens.reduce((total, token) => {
        const rank = words.includes(token) ? 12 : words.some((word) => word.startsWith(token)) ? 8 :
          words.some((word) => oneEditAway(token, word)) ? 3 : 0;
        return !rank || total < 0 ? -1 : total + rank;
      }, 0);
    return score > 0
      ? [{ entry, score: score + (entry.group === "body" ? 1 : entry.group === "choropleth" ? -1 : 0) }]
      : [];
  });
  const matches = scored.sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "pt-BR"))
    .slice(0, 13).map(({ entry }) => entry);
  const requestedYear = query.match(yearPattern);
  const goToYear = requestedYear && yearResult(requestedYear[1]);
  if (goToYear && !matches.some(({ id }) => id === goToYear.id)) {
    if (query === requestedYear[1]) matches.push(goToYear);
    else matches.unshift(goToYear);
  }
  return matches;
}

export function countrySuggestions(iso: string | null, contemporary: boolean): SearchResult[] {
  const related = iso ? eventRecords
    .filter((event) => event.countryIso === iso || event.blocIsos?.includes(iso))
    .slice(0, 3).flatMap(({ id }) => byId.get(`event:${id}`) ?? []) : [];
  if (iso && contemporary && Object.hasOwn(WORLD_COUNTRIES_CATALOG, iso)) {
    const country = WORLD_COUNTRIES_CATALOG[iso].nameCommon;
    related.push(
      { ...byId.get("layer:NASA_FIRMS")!, detail: `Consultar focos para ${country}` },
      { ...byId.get("layer:NASA_EONET")!, detail: "Explorar eventos naturais próximos" },
    );
  }
  return related;
}

export function exploreSuggestions(iso: string | null, contemporary: boolean): SearchResult[] {
  const related = countrySuggestions(iso, contemporary);
  return related.length ? related : ["event:glo-1969", "body:HALLEY", "layer:NASA_FIRMS", "compare:"]
    .flatMap((id) => byId.get(id) ?? []);
}

function showYear(year: number, milestoneId: string | null = null) {
  useSceneStore.getState().closeScene({ restore: false });
  const { startYear, endYear } = useTimelineStore.getState();
  const range = year >= startYear && year <= endYear ? {} : { startYear: Math.max(1, year - 25), endYear: Math.min(9999, year + 25) };
  useTimelineStore.setState({ ...range, geologicalMa: null, selectedYear: year, selectedMilestoneId: milestoneId });
}

function showEarth() {
  const cosmic = useCosmicStore.getState();
  if (cosmic.isCosmicMode || cosmic.focusedBodyId) cosmic.exitToEarthView();
}

export function runSearchResult(result: SearchResult) {
  const separator = result.id.indexOf(":");
  const value = result.id.slice(separator + 1);
  const globe = useGlobeStore.getState();
  const comparator = useComparatorStore.getState();
  globe.setReaderOpen(false);
  if (!result.id.startsWith("compare:")) comparator.closeComparator();
  switch (result.group) {
    case "country":
    case "historical": {
      const entity = result.group === "historical" ? HISTORICAL_ENTITIES[value] : undefined;
      if (entity) {
        const era = HISTORICAL_ERAS[entity.era];
        showYear(Math.max(entity.startYear, Math.min(entity.endYear, era.representativeYear)));
      } else {
        useTimelineStore.getState().selectMilestone(null);
        if (useTimelineStore.getState().geologicalMa !== null) restoreContemporaryTimeline();
      }
      showEarth();
      selectCountry(value);
      useLayoutStore.getState().setActiveRightPanel("country");
      const country = entity ?? getCountryData(value);
      if (country?.latitude != null && country.longitude != null) globe.flyTo(country.latitude, country.longitude, 2);
      break;
    }
    case "event": {
      const event = findMilestoneById(value);
      if (!event) return;
      showEarth();
      showYear(event.year, event.id);
      const timeline = useTimelineStore.getState();
      if (!timeline.activeCategories.includes(event.category)) timeline.toggleCategory(event.category);
      timeline.setExpanded(true);
      if (event.countryIso) selectCountry(event.countryIso);
      if (event.latitude != null && event.longitude != null) {
        globe.flyTo(event.latitude, event.longitude, event.preferredAltitude ?? 1.8);
      }
      break;
    }
    case "body":
      useCosmicStore.getState().enterCosmicView(value as CelestialBodyId);
      useLayoutStore.getState().setActiveRightPanel("cosmos");
      break;
    case "layer": {
      // Os feeds são contemporâneos. Mantém o país selecionado ao sair de uma época histórica.
      if (!getEpochState().isContemporary) restoreContemporaryTimeline();
      showEarth();
      const observatory = useObservatoryStore.getState();
      observatory.setPanelOpen(true);
      observatory.setLayerActive(value as ObservatoryLayerId, true);
      useLayoutStore.getState().setActiveRightPanel("observatory");
      break;
    }
    case "choropleth": {
      if (!getEpochState().isContemporary) restoreContemporaryTimeline();
      showEarth();
      useChoroplethStore.getState().setIndicator(value as ChoroplethIndicatorId);
      useChoroplethStore.getState().setSelectorOpen(false);
      break;
    }
    case "cosmicLayer": {
      const cosmic = useCosmicStore.getState();
      if (!cosmic.isCosmicMode) cosmic.enterCosmicView();
      const layer = value as CosmicLayerId;
      if (!cosmic.activeCosmicLayers.includes(layer)) cosmic.toggleLayer(layer);
      break;
    }
    case "preset":
      showEarth();
      applyTimelinePreset(value);
      break;
    case "command":
      if (result.id.startsWith("year:")) {
        showEarth();
        showYear(Number(value));
      } else {
        if (value) comparator.setSelectedIsos(value.split(","));
        comparator.openComparator();
      }
      break;
  }
}
