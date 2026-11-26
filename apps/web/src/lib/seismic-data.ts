/**
 * Normalização, validação estrita de URLs externas, dataset de referência offline (T05) e
 * carregamento sob demanda das fronteiras de placas tectônicas contemporâneas (PB2002) para D39.
 */

import {
  classifySeismicDepth,
  DEFAULT_SEISMIC_MIN_MAGNITUDE,
  DEFAULT_SEISMIC_WINDOW,
  isSeismicMinMagnitude,
  isSeismicWindow,
  type PlateBoundaryType,
  type SeismicDepthBand,
  type SeismicEvent,
  type SeismicMinMagnitude,
  type SeismicPayload,
  type SeismicWindow,
  type TectonicPlatesCollection,
} from "./seismic-types";

export const MAX_SEISMIC_EVENTS = 1200;
export const TECTONIC_PLATES_DATA_URL = "/data/tectonic-plates-pb2002.json";

export const SEISMIC_DEPTH_COLORS_HEX: Record<SeismicDepthBand, string> = {
  shallow: "#f97316",
  intermediate: "#facc15",
  deep: "#38bdf8",
};

export const PLATE_BOUNDARY_COLORS_HEX: Record<PlateBoundaryType, string> = {
  convergent: "#f43f5e",
  divergent: "#f59e0b",
  transform: "#38bdd4",
};

const SAFE_EVENT_ID_RE = /^[A-Za-z0-9._-]+$/;

/** Sanitiza e restringe URLs de ficha sísmica estritamente ao domínio HTTPS oficial da USGS. */
export function sanitizeUsgsEventUrl(rawUrl: unknown, eventId: string): string {
  const safeId = SAFE_EVENT_ID_RE.test(eventId)
    ? eventId
    : eventId.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 48) || "index";
  const fallback = `https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(safeId)}/executive`;

  if (typeof rawUrl !== "string" || !rawUrl.trim()) return fallback;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol === "https:" && parsed.hostname === "earthquake.usgs.gov") {
      return parsed.toString();
    }
  } catch {
    // Fallback seguro abaixo
  }
  return fallback;
}

/** Resolve o endpoint público oficial USGS GeoJSON Summary para a janela e magnitude pedidas. */
export function buildUsgsFeedUrl(window: SeismicWindow, minMagnitude: SeismicMinMagnitude): string {
  const period = window === "24h" ? "day" : window === "7d" ? "week" : "month";
  const feedMag = minMagnitude === "2.5" ? "2.5" : "4.5";
  return `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feedMag}_${period}.geojson`;
}

/**
 * Faz o parse defensivo de um `FeatureCollection` GeoJSON da USGS e filtra pela magnitude mínima.
 * Lança erro caso o envelope não seja um `FeatureCollection` válido (acionando fallback/stale T05).
 */
export function parseUsgsGeoJson(
  raw: unknown,
  window: SeismicWindow = DEFAULT_SEISMIC_WINDOW,
  minMagnitude: SeismicMinMagnitude = DEFAULT_SEISMIC_MIN_MAGNITUDE
): SeismicPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("Envelope GeoJSON da USGS ausente ou inválido");
  }
  const obj = raw as { type?: unknown; features?: unknown };
  if (obj.type !== "FeatureCollection" || !Array.isArray(obj.features)) {
    throw new Error("Resposta da USGS não é um FeatureCollection GeoJSON");
  }

  const minMagNum = Number(minMagnitude);
  const parsed: SeismicEvent[] = [];

  for (const feat of obj.features) {
    if (!feat || typeof feat !== "object") continue;
    const f = feat as {
      id?: unknown;
      properties?: Record<string, unknown> | null;
      geometry?: { type?: unknown; coordinates?: unknown } | null;
    };
    if (f.geometry?.type !== "Point" || !Array.isArray(f.geometry.coordinates)) continue;
    const [rawLng, rawLat, rawDepth] = f.geometry.coordinates as unknown[];
    const lng = typeof rawLng === "number" ? rawLng : Number.NaN;
    const lat = typeof rawLat === "number" ? rawLat : Number.NaN;
    const depthRaw = typeof rawDepth === "number" && Number.isFinite(rawDepth) ? rawDepth : 10;

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) continue;
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) continue;

    const props = f.properties ?? {};
    const mag = typeof props.mag === "number" ? props.mag : Number.NaN;
    if (!Number.isFinite(mag) || mag < minMagNum) continue;

    const rawId = typeof f.id === "string" && f.id.trim() ? f.id.trim() : `usgs-${parsed.length}`;
    const place =
      typeof props.place === "string" && props.place.trim()
        ? props.place.trim().slice(0, 160)
        : `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
    const magType =
      typeof props.magType === "string" && props.magType.trim()
        ? props.magType.trim().toLowerCase().slice(0, 12)
        : "m";
    const timestamp =
      typeof props.time === "number" && Number.isFinite(props.time) ? props.time : Date.now();
    const tsunamiAlert = props.tsunami === 1 || props.tsunami === true;
    const significance =
      typeof props.sig === "number" && Number.isFinite(props.sig) ? Math.round(props.sig) : 0;
    const depthKm = Math.max(0, Number(depthRaw.toFixed(1)));

    parsed.push({
      id: rawId.slice(0, 48),
      place,
      magnitude: Number(mag.toFixed(1)),
      magType,
      depthKm,
      depthBand: classifySeismicDepth(depthKm),
      lat: Number(lat.toFixed(4)),
      lng: Number(lng.toFixed(4)),
      timestamp,
      tsunamiAlert,
      significance,
      usgsUrl: sanitizeUsgsEventUrl(props.url, rawId),
    });
  }

  // Ordena por magnitude decrescente e recência para priorizar eventos mais relevantes no teto
  parsed.sort((a, b) => b.magnitude - a.magnitude || b.timestamp - a.timestamp);
  const totalCount = parsed.length;
  const events = parsed.slice(0, MAX_SEISMIC_EVENTS);
  const maxMagnitude = events.length > 0 ? events[0]!.magnitude : null;
  const tsunamiCount = parsed.reduce((acc, ev) => acc + (ev.tsunamiAlert ? 1 : 0), 0);

  return {
    window,
    minMagnitude,
    totalCount,
    maxMagnitude,
    tsunamiCount,
    events,
  };
}

export function isValidSeismicPayload(value: unknown): value is SeismicPayload {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<SeismicPayload>;
  return (
    isSeismicWindow(p.window) &&
    isSeismicMinMagnitude(p.minMagnitude) &&
    typeof p.totalCount === "number" &&
    Array.isArray(p.events)
  );
}

/**
 * Amostra sísmica de referência geofísica (subducção circumpacífica, dorsais e falhas transformantes),
 * usada EXCLUSIVAMENTE com `meta.source = "fallback"` ("Simulado") quando a USGS estiver inacessível.
 */
const REFERENCE_SEISMIC_BASE: ReadonlyArray<Omit<SeismicEvent, "depthBand">> = [
  {
    id: "ref-honshu-subduction",
    place: "Fossa do Japão — Leste de Sendai, Honshu",
    magnitude: 6.4,
    magType: "mww",
    depthKm: 38.0,
    lat: 38.12,
    lng: 142.38,
    timestamp: Date.UTC(2026, 10, 25, 18, 15),
    tsunamiAlert: false,
    significance: 630,
    usgsUrl: "https://earthquake.usgs.gov/earthquakes/map/",
  },
  {
    id: "ref-atacama-nazca",
    place: "Subducção Nazca–América do Sul — Costa de Antofagasta, Chile",
    magnitude: 6.1,
    magType: "mww",
    depthKm: 52.4,
    lat: -23.45,
    lng: -70.62,
    timestamp: Date.UTC(2026, 10, 25, 14, 40),
    tsunamiAlert: false,
    significance: 572,
    usgsUrl: "https://earthquake.usgs.gov/earthquakes/map/",
  },
  {
    id: "ref-tonga-deep",
    place: "Fossa de Tonga–Kermadec — Zona Wadati–Benioff profunda",
    magnitude: 6.6,
    magType: "mww",
    depthKm: 548.0,
    lat: -20.85,
    lng: -178.42,
    timestamp: Date.UTC(2026, 10, 25, 9, 10),
    tsunamiAlert: true,
    significance: 670,
    usgsUrl: "https://earthquake.usgs.gov/earthquakes/map/",
  },
  {
    id: "ref-sunda-sumatra",
    place: "Arco de Sunda — Sudoeste de Bengkulu, Sumatra",
    magnitude: 5.6,
    magType: "mww",
    depthKm: 84.5,
    lat: -4.32,
    lng: 101.85,
    timestamp: Date.UTC(2026, 10, 25, 6, 22),
    tsunamiAlert: false,
    significance: 482,
    usgsUrl: "https://earthquake.usgs.gov/earthquakes/map/",
  },
  {
    id: "ref-mid-atlantic-romanche",
    place: "Zona de Fratura Romanche — Dorsal Mesoatlântica Equatorial",
    magnitude: 5.2,
    magType: "mb",
    depthKm: 10.0,
    lat: -0.18,
    lng: -18.45,
    timestamp: Date.UTC(2026, 10, 25, 3, 5),
    tsunamiAlert: false,
    significance: 416,
    usgsUrl: "https://earthquake.usgs.gov/earthquakes/map/",
  },
  {
    id: "ref-san-andreas-mendocino",
    place: "Junção Tripla de Mendocino — Falha de San Andreas, Califórnia",
    magnitude: 4.8,
    magType: "mw",
    depthKm: 14.2,
    lat: 40.38,
    lng: -124.92,
    timestamp: Date.UTC(2026, 10, 24, 21, 50),
    tsunamiAlert: false,
    significance: 355,
    usgsUrl: "https://earthquake.usgs.gov/earthquakes/map/",
  },
  {
    id: "ref-acre-deep-peru-brazil",
    place: "Fronteira Acre–Ucayali (Subducção profunda sob a Amazônia)",
    magnitude: 4.6,
    magType: "mb",
    depthKm: 585.0,
    lat: -8.15,
    lng: -73.85,
    timestamp: Date.UTC(2026, 10, 24, 15, 30),
    tsunamiAlert: false,
    significance: 325,
    usgsUrl: "https://earthquake.usgs.gov/earthquakes/map/",
  },
  {
    id: "ref-anatolia-aegean",
    place: "Falha Norte-Anatólia / Arco Helênico — Mar Egeu",
    magnitude: 4.5,
    magType: "mb",
    depthKm: 18.0,
    lat: 38.92,
    lng: 25.48,
    timestamp: Date.UTC(2026, 10, 24, 11, 12),
    tsunamiAlert: false,
    significance: 312,
    usgsUrl: "https://earthquake.usgs.gov/earthquakes/map/",
  },
  {
    id: "ref-reykjanes-iceland",
    place: "Península de Reykjanes — Dorsal Mesoatlântica, Islândia",
    magnitude: 3.4,
    magType: "ml",
    depthKm: 5.8,
    lat: 63.88,
    lng: -22.41,
    timestamp: Date.UTC(2026, 10, 25, 19, 45),
    tsunamiAlert: false,
    significance: 178,
    usgsUrl: "https://earthquake.usgs.gov/earthquakes/map/",
  },
  {
    id: "ref-east-african-rift",
    place: "Rifte Leste-Africano — Lago Tanganica",
    magnitude: 3.9,
    magType: "mb",
    depthKm: 12.0,
    lat: -6.25,
    lng: 29.62,
    timestamp: Date.UTC(2026, 10, 25, 12, 5),
    tsunamiAlert: false,
    significance: 235,
    usgsUrl: "https://earthquake.usgs.gov/earthquakes/map/",
  },
];

export function buildFallbackSeismicPayload(
  window: SeismicWindow = DEFAULT_SEISMIC_WINDOW,
  minMagnitude: SeismicMinMagnitude = DEFAULT_SEISMIC_MIN_MAGNITUDE
): SeismicPayload {
  const minMag = Number(minMagnitude);
  const events: SeismicEvent[] = REFERENCE_SEISMIC_BASE.filter((e) => e.magnitude >= minMag).map(
    (e) => ({
      ...e,
      depthBand: classifySeismicDepth(e.depthKm),
    })
  );
  return {
    window,
    minMagnitude,
    totalCount: events.length,
    maxMagnitude: events.length > 0 ? Math.max(...events.map((e) => e.magnitude)) : null,
    tsunamiCount: events.filter((e) => e.tsunamiAlert).length,
    events,
  };
}

let cachedPlates: TectonicPlatesCollection | null = null;
let inflightPlates: Promise<TectonicPlatesCollection | null> | null = null;

export function getTectonicPlatesSync(): TectonicPlatesCollection | null {
  return cachedPlates;
}

export function setTectonicPlatesForTest(data: TectonicPlatesCollection | null): void {
  cachedPlates = data;
  inflightPlates = null;
}

/** Carrega sob demanda `public/data/tectonic-plates-pb2002.json` (0 bytes no bundle inicial). */
export async function loadTectonicPlates(): Promise<TectonicPlatesCollection | null> {
  if (cachedPlates) return cachedPlates;
  if (!inflightPlates) {
    inflightPlates = fetch(TECTONIC_PLATES_DATA_URL)
      .then(async (res) => {
        if (!res.ok) return null;
        const json = (await res.json()) as TectonicPlatesCollection;
        if (json?.type !== "FeatureCollection" || !Array.isArray(json.features)) return null;
        cachedPlates = json;
        return json;
      })
      .catch(() => null)
      .finally(() => {
        inflightPlates = null;
      });
  }
  return inflightPlates;
}
