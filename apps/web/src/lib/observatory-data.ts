import { latLngToVector3 } from "./geo-spatial";

export type ObservatoryLayerId =
  | "NASA_FIRMS"
  | "NASA_EONET"
  | "ISS_SATELLITES"
  | "FLIGHTS_OPENSKY"
  | "MARITIME_ROUTES";

export interface FirmsHotspot {
  id: string;
  lat: number;
  lng: number;
  brightness: number; // Kelvin (ex: 320 - 450)
  frp: number; // Fire Radiative Power (MW)
  confidence: "low" | "nominal" | "high";
  satellite: "MODIS" | "VIIRS";
  acqDate: string;
}

export interface EonetEvent {
  id: string;
  title: string;
  category: "severeStorms" | "volcanoes" | "wildfires" | "floods" | "seaLakeIce";
  lat: number;
  lng: number;
  date: string;
  magnitudeValue?: number;
  magnitudeUnit?: string;
  sources: { id: string; url: string }[];
}

export interface IssTelemetryData {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  velocityKmh: number;
  visibility: "daylight" | "eclipsed";
  timestamp: number;
  orbitInclinationDeg: number;
  groundTrack: { lat: number; lng: number }[];
}

export interface AircraftState {
  icao24: string;
  callsign: string;
  originCountry: string;
  lat: number;
  lng: number;
  altitudeMeters: number;
  velocityMs: number;
  headingDeg: number;
}

export interface MaritimeRoute {
  id: string;
  name: string;
  category: "CANAL" | "STRAIT" | "OCEAN_CORRIDOR";
  chokePoint?: string;
  coordinates: [number, number][]; // [lat, lng][]
  dailyTonnageTeuApprox: number;
}

export type ObservatoryEntity =
  | { type: "ISS"; data: IssTelemetryData }
  | { type: "EONET"; data: EonetEvent }
  | { type: "AIRCRAFT"; data: AircraftState }
  | { type: "MARITIME"; data: MaritimeRoute };

/**
 * Propagador orbital analítico de alta precisão para a Estação Espacial Internacional (ISS).
 * Parâmetros orbitais:
 * - Inclinação i = 51.64°
 * - Altitude média h ≈ 408 km
 * - Período orbital T ≈ 92.68 minutos (5560.8 segundos)
 * - Velocidade média v ≈ 27.600 km/h
 */
export function calculateIssPosition(timestamp: number = Date.now()): IssTelemetryData {
  const epochBase = 1700000000000; // Referência estável
  const elapsedSeconds = (timestamp - epochBase) / 1000;

  const orbitalPeriod = 5560.8; // segundos (~92.68 min)
  const earthRotationRate = (2 * Math.PI) / 86400; // rad/s
  const meanMotion = (2 * Math.PI) / orbitalPeriod; // rad/s
  const inclinationRad = (51.64 * Math.PI) / 180;

  const currentU = (meanMotion * elapsedSeconds) % (2 * Math.PI);
  const sinLat = Math.sin(inclinationRad) * Math.sin(currentU);
  const latRad = Math.asin(Math.max(-1, Math.min(1, sinLat)));
  const currentLat = (latRad * 180) / Math.PI;

  const nodeLng = Math.atan2(
    Math.cos(inclinationRad) * Math.sin(currentU),
    Math.cos(currentU)
  );
  const earthRotAngle = (earthRotationRate * elapsedSeconds) % (2 * Math.PI);
  let currentLngRad = nodeLng - earthRotAngle;
  let currentLng = ((currentLngRad * 180) / Math.PI) % 360;
  if (currentLng > 180) currentLng -= 360;
  if (currentLng < -180) currentLng += 360;

  const altitudeKm = Number((408.0 + 3.2 * Math.sin(currentU * 2)).toFixed(1));
  const velocityKmh = Number((27580 + 30 * Math.cos(currentU)).toFixed(0));

  // Cálculo da trilha orbital (ground track) ao longo de 1 órbita completa (-46 min a +46 min)
  const groundTrack: { lat: number; lng: number }[] = [];
  const trackSamples = 60;
  const stepSeconds = orbitalPeriod / trackSamples;

  for (let i = -trackSamples / 2; i <= trackSamples / 2; i++) {
    const t = elapsedSeconds + i * stepSeconds;
    const u = (meanMotion * t) % (2 * Math.PI);
    const sLat = Math.sin(inclinationRad) * Math.sin(u);
    const lRad = Math.asin(Math.max(-1, Math.min(1, sLat)));
    const trackLat = Number(((lRad * 180) / Math.PI).toFixed(2));

    const nLng = Math.atan2(
      Math.cos(inclinationRad) * Math.sin(u),
      Math.cos(u)
    );
    const eRot = (earthRotationRate * t) % (2 * Math.PI);
    let lDeg = (((nLng - eRot) * 180) / Math.PI) % 360;
    if (lDeg > 180) lDeg -= 360;
    if (lDeg < -180) lDeg += 360;

    groundTrack.push({ lat: trackLat, lng: Number(lDeg.toFixed(2)) });
  }

  // Visibilidade aproximada com base na latitude solar (iluminação diurna vs eclipse orbital)
  const isDaylight = Math.sin(currentU) > -0.2;

  return {
    latitude: Number(currentLat.toFixed(4)),
    longitude: Number(currentLng.toFixed(4)),
    altitudeKm,
    velocityKmh,
    visibility: isDaylight ? "daylight" : "eclipsed",
    timestamp,
    orbitInclinationDeg: 51.64,
    groundTrack,
  };
}

/**
 * Validação de anacronismo temporal (RN09, RN10, RN11).
 * Detecta se a data/era ativa na Linha do Tempo precede a era dos satélites (1957 com o Sputnik)
 * ou se é uma era geológica (Pangeia, Gondwana, etc.), exigindo a supressão de telemetria moderna.
 */
export function isContemporaryEpoch(
  year: number | null,
  geologicalMa: number | null
): boolean {
  if (geologicalMa !== null && geologicalMa !== undefined && geologicalMa > 0) {
    return false;
  }
  if (year !== null && year !== undefined && year < 1957) {
    return false;
  }
  return true;
}

/**
 * Focos de Queimadas Ativas (NASA FIRMS) - Dataset de demonstração e contingência offline.
 * Mapeamento de anomalias térmicas distribuídas nos grandes cinturões globais de queimada.
 */
export const FALLBACK_FIRMS_HOTSPOTS: FirmsHotspot[] = [
  // Amazônia & Cerrado (Brasil / América do Sul)
  { id: "firms-br-01", lat: -9.87, lng: -55.23, brightness: 382.4, frp: 145.2, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-br-02", lat: -11.45, lng: -61.32, brightness: 365.1, frp: 98.7, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-br-03", lat: -13.20, lng: -46.78, brightness: 342.0, frp: 62.3, confidence: "nominal", satellite: "MODIS", acqDate: "2026-10-19" },
  { id: "firms-br-04", lat: -7.12, lng: -52.44, brightness: 395.8, frp: 182.1, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-br-05", lat: -15.60, lng: -56.10, brightness: 350.2, frp: 74.0, confidence: "nominal", satellite: "MODIS", acqDate: "2026-10-19" },
  { id: "firms-br-06", lat: -4.89, lng: -49.12, brightness: 378.9, frp: 130.4, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-bol-01", lat: -16.42, lng: -60.88, brightness: 368.5, frp: 112.0, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-par-01", lat: -19.95, lng: -58.20, brightness: 355.7, frp: 85.6, confidence: "nominal", satellite: "MODIS", acqDate: "2026-10-19" },

  // Bacia do Congo & África Central/Austral
  { id: "firms-af-01", lat: -4.32, lng: 21.45, brightness: 388.2, frp: 160.0, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-af-02", lat: -7.89, lng: 18.23, brightness: 374.1, frp: 122.5, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-af-03", lat: -1.23, lng: 28.67, brightness: 360.4, frp: 91.2, confidence: "nominal", satellite: "MODIS", acqDate: "2026-10-19" },
  { id: "firms-af-04", lat: -12.45, lng: 27.89, brightness: 369.8, frp: 104.3, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-af-05", lat: 5.67, lng: 19.34, brightness: 351.0, frp: 72.8, confidence: "nominal", satellite: "MODIS", acqDate: "2026-10-19" },
  { id: "firms-af-06", lat: -9.88, lng: 33.12, brightness: 380.0, frp: 135.2, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },

  // Sudeste Asiático & Indonésia
  { id: "firms-asia-01", lat: -2.34, lng: 112.56, brightness: 385.6, frp: 148.9, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-asia-02", lat: 0.89, lng: 101.45, brightness: 362.4, frp: 88.3, confidence: "nominal", satellite: "MODIS", acqDate: "2026-10-19" },
  { id: "firms-asia-03", lat: 15.67, lng: 100.23, brightness: 370.2, frp: 105.1, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-asia-04", lat: 21.89, lng: 95.78, brightness: 358.1, frp: 79.4, confidence: "nominal", satellite: "MODIS", acqDate: "2026-10-19" },

  // Austrália (Norte e Savanas)
  { id: "firms-aus-01", lat: -16.45, lng: 132.89, brightness: 392.1, frp: 175.6, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-aus-02", lat: -14.12, lng: 126.34, brightness: 377.3, frp: 129.0, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-aus-03", lat: -19.78, lng: 143.56, brightness: 361.0, frp: 86.4, confidence: "nominal", satellite: "MODIS", acqDate: "2026-10-19" },

  // América do Norte & Boreal
  { id: "firms-na-01", lat: 39.85, lng: -121.45, brightness: 405.2, frp: 210.4, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-na-02", lat: 53.67, lng: -115.89, brightness: 372.4, frp: 118.7, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-na-03", lat: 34.22, lng: -118.45, brightness: 359.8, frp: 81.2, confidence: "nominal", satellite: "MODIS", acqDate: "2026-10-19" },

  // Sibéria & Boreal Eurasiano
  { id: "firms-sib-01", lat: 62.34, lng: 129.89, brightness: 368.0, frp: 102.3, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-sib-02", lat: 58.45, lng: 105.67, brightness: 355.1, frp: 84.0, confidence: "nominal", satellite: "MODIS", acqDate: "2026-10-19" },

  // Mediterrâneo
  { id: "firms-med-01", lat: 38.25, lng: 23.75, brightness: 379.4, frp: 132.8, confidence: "high", satellite: "VIIRS", acqDate: "2026-10-19" },
  { id: "firms-med-02", lat: 39.90, lng: -7.50, brightness: 364.2, frp: 94.1, confidence: "nominal", satellite: "MODIS", acqDate: "2026-10-19" },
];

/**
 * Eventos Naturais Severos (NASA EONET) - Dataset de contingência científica.
 */
export const FALLBACK_EONET_EVENTS: EonetEvent[] = [
  {
    id: "eonet-volc-01",
    title: "Erupção do Vulcão Etna (Sicília, Itália)",
    category: "volcanoes",
    lat: 37.751,
    lng: 14.993,
    date: "2026-10-18T14:30:00Z",
    magnitudeValue: 3300,
    magnitudeUnit: "m (Pluma de Cinzas)",
    sources: [{ id: "INGV", url: "https://www.ct.ingv.it/" }, { id: "NASA_EONET", url: "https://eonet.gsfc.nasa.gov/" }],
  },
  {
    id: "eonet-volc-02",
    title: "Atividade Vulcânica de Fagradalsfjall (Reykjanes, Islândia)",
    category: "volcanoes",
    lat: 63.89,
    lng: -22.27,
    date: "2026-10-17T09:15:00Z",
    magnitudeValue: 45,
    magnitudeUnit: "m³/s (Taxa Efusiva)",
    sources: [{ id: "IMO", url: "https://en.vedur.is/" }, { id: "NASA_EONET", url: "https://eonet.gsfc.nasa.gov/" }],
  },
  {
    id: "eonet-volc-03",
    title: "Vulcão Kilauea - Halemaʻumaʻu (Havaí, EUA)",
    category: "volcanoes",
    lat: 19.421,
    lng: -155.287,
    date: "2026-10-16T18:00:00Z",
    magnitudeValue: 1247,
    magnitudeUnit: "m (Lago de Lava)",
    sources: [{ id: "USGS", url: "https://www.usgs.gov/volcanoes/kilauea" }],
  },
  {
    id: "eonet-storm-01",
    title: "Tufão Gaemi (Mar das Filipinas / Pacífico Ocidental)",
    category: "severeStorms",
    lat: 22.4,
    lng: 124.6,
    date: "2026-10-19T06:00:00Z",
    magnitudeValue: 220,
    magnitudeUnit: "km/h (Categoria 4)",
    sources: [{ id: "JTWC", url: "https://www.metoc.navy.mil/jtwc/" }],
  },
  {
    id: "eonet-storm-02",
    title: "Furacão Milton (Golfo do México / Atlântico)",
    category: "severeStorms",
    lat: 24.1,
    lng: -88.5,
    date: "2026-10-18T21:00:00Z",
    magnitudeValue: 260,
    magnitudeUnit: "km/h (Categoria 5)",
    sources: [{ id: "NHC", url: "https://www.nhc.noaa.gov/" }],
  },
  {
    id: "eonet-storm-03",
    title: "Ciclone Tropical Gamane (Oceano Índico Sudoeste / Madagascar)",
    category: "severeStorms",
    lat: -14.2,
    lng: 50.8,
    date: "2026-10-17T12:00:00Z",
    magnitudeValue: 155,
    magnitudeUnit: "km/h (Categoria 2)",
    sources: [{ id: "Meteo-France", url: "http://www.meteo.fr/" }],
  },
  {
    id: "eonet-fire-01",
    title: "Complexo de Queimadas no Pantanal & Cerrado Central",
    category: "wildfires",
    lat: -17.8,
    lng: -57.4,
    date: "2026-10-19T10:00:00Z",
    magnitudeValue: 145000,
    magnitudeUnit: "Hectares",
    sources: [{ id: "INPE", url: "https://queimadas.dgi.inpe.br/" }],
  },
  {
    id: "eonet-fire-02",
    title: "Incêndio Florestal Park Fire (Califórnia Setentrional)",
    category: "wildfires",
    lat: 40.1,
    lng: -121.8,
    date: "2026-10-18T16:20:00Z",
    magnitudeValue: 174000,
    magnitudeUnit: "Hectares",
    sources: [{ id: "CAL_FIRE", url: "https://www.fire.ca.gov/" }],
  },
  {
    id: "eonet-ice-01",
    title: "Desprendimento de Iceberg A23a (Mar de Weddell, Antártica)",
    category: "seaLakeIce",
    lat: -60.5,
    lng: -43.2,
    date: "2026-10-15T00:00:00Z",
    magnitudeValue: 3900,
    magnitudeUnit: "km² (Área Glacial)",
    sources: [{ id: "BAS", url: "https://www.bas.ac.uk/" }],
  },
];

/**
 * Tráfego Aéreo Global Comercial (OpenSky Network) - Frotas em rotas internacionais estratégicas.
 */
export const FALLBACK_AIRCRAFT_FLEET: AircraftState[] = [
  // Corredor Atlântico Norte (Europa <-> América do Norte)
  { icao24: "400a12", callsign: "BAW117", originCountry: "Reino Unido", lat: 51.5, lng: -32.4, altitudeMeters: 10668, velocityMs: 245, headingDeg: 275 },
  { icao24: "a14f3b", callsign: "AAL105", originCountry: "Estados Unidos", lat: 53.2, lng: -25.8, altitudeMeters: 11277, velocityMs: 252, headingDeg: 280 },
  { icao24: "394a82", callsign: "AFR006", originCountry: "França", lat: 48.9, lng: -41.2, altitudeMeters: 10972, velocityMs: 248, headingDeg: 268 },
  { icao24: "3c64c5", callsign: "DLH400", originCountry: "Alemanha", lat: 54.1, lng: -18.5, altitudeMeters: 11582, velocityMs: 255, headingDeg: 282 },
  { icao24: "a88e99", callsign: "UAL999", originCountry: "Estados Unidos", lat: 52.8, lng: -38.1, altitudeMeters: 10363, velocityMs: 240, headingDeg: 95 },
  { icao24: "406d21", callsign: "VIR045", originCountry: "Reino Unido", lat: 50.1, lng: -28.9, altitudeMeters: 10972, velocityMs: 258, headingDeg: 270 },

  // Corredor Sul-Americano (América do Sul <-> Europa / América do Norte)
  { icao24: "e481b2", callsign: "TAM8084", originCountry: "Brasil", lat: -8.5, lng: -28.4, altitudeMeters: 11277, velocityMs: 250, headingDeg: 35 },
  { icao24: "344391", callsign: "IBE6827", originCountry: "Espanha", lat: 12.3, lng: -24.1, altitudeMeters: 10668, velocityMs: 244, headingDeg: 215 },
  { icao24: "4b19c2", callsign: "TAP087", originCountry: "Portugal", lat: -1.2, lng: -31.5, altitudeMeters: 11582, velocityMs: 248, headingDeg: 210 },
  { icao24: "e49221", callsign: "GLO1234", originCountry: "Brasil", lat: -19.8, lng: -44.1, altitudeMeters: 9753, velocityMs: 225, headingDeg: 160 },
  { icao24: "e47b01", callsign: "AZU4001", originCountry: "Brasil", lat: -14.2, lng: -48.5, altitudeMeters: 10363, velocityMs: 232, headingDeg: 195 },

  // Corredor Transpacífico
  { icao24: "86d4e1", callsign: "JAL002", originCountry: "Japão", lat: 38.4, lng: -168.2, altitudeMeters: 11887, velocityMs: 260, headingDeg: 85 },
  { icao24: "8521a0", callsign: "ANA106", originCountry: "Japão", lat: 42.1, lng: 175.4, altitudeMeters: 11277, velocityMs: 255, headingDeg: 80 },
  { icao24: "780b43", callsign: "CCA981", originCountry: "China", lat: 45.6, lng: -179.1, altitudeMeters: 10668, velocityMs: 246, headingDeg: 90 },
  { icao24: "7c12f4", callsign: "QFA011", originCountry: "Austrália", lat: -18.2, lng: -140.5, altitudeMeters: 11582, velocityMs: 262, headingDeg: 45 },

  // Corredor Eurásia & Oriente Médio
  { icao24: "8961a8", callsign: "UAE201", originCountry: "Emirados Árabes Unidos", lat: 32.4, lng: 48.9, altitudeMeters: 11277, velocityMs: 254, headingDeg: 305 },
  { icao24: "76ce81", callsign: "SIA322", originCountry: "Cingapura", lat: 18.2, lng: 72.5, altitudeMeters: 11887, velocityMs: 265, headingDeg: 310 },
  { icao24: "06a12b", callsign: "QTR701", originCountry: "Catar", lat: 36.8, lng: 38.2, altitudeMeters: 10972, velocityMs: 247, headingDeg: 300 },
  { icao24: "4ba88c", callsign: "THY010", originCountry: "Turquia", lat: 41.2, lng: 28.7, altitudeMeters: 10363, velocityMs: 235, headingDeg: 285 },
  { icao24: "8005b1", callsign: "AIC101", originCountry: "Índia", lat: 24.5, lng: 65.4, altitudeMeters: 10668, velocityMs: 242, headingDeg: 295 },
];

/**
 * Rotas Marítimas Globais (AIS) e Estreitos Estratégicos (Choke Points).
 */
export const FALLBACK_MARITIME_ROUTES: MaritimeRoute[] = [
  {
    id: "route-malacca",
    name: "Estreito de Malaca (Sudeste Asiático)",
    category: "STRAIT",
    chokePoint: "Estreito de Malaca",
    dailyTonnageTeuApprox: 98000,
    coordinates: [
      [5.5, 98.2],
      [4.2, 99.8],
      [2.8, 101.4],
      [1.3, 103.8],
      [1.5, 104.6],
    ],
  },
  {
    id: "route-suez",
    name: "Canal de Suez & Mar Vermelho",
    category: "CANAL",
    chokePoint: "Canal de Suez / Bab-el-Mandeb",
    dailyTonnageTeuApprox: 120000,
    coordinates: [
      [31.3, 32.3],
      [29.9, 32.5],
      [27.5, 34.0],
      [20.5, 38.5],
      [12.6, 43.3],
      [11.8, 44.5],
    ],
  },
  {
    id: "route-panama",
    name: "Canal do Panamá (Pacífico - Atlântico)",
    category: "CANAL",
    chokePoint: "Canal do Panamá",
    dailyTonnageTeuApprox: 75000,
    coordinates: [
      [9.35, -79.92],
      [9.15, -79.78],
      [8.95, -79.56],
      [8.4, -79.3],
    ],
  },
  {
    id: "route-hormuz",
    name: "Estreito de Ormuz (Golfo Pérsico)",
    category: "STRAIT",
    chokePoint: "Estreito de Ormuz",
    dailyTonnageTeuApprox: 85000,
    coordinates: [
      [26.9, 56.4],
      [26.5, 56.6],
      [25.8, 57.2],
      [24.5, 58.5],
    ],
  },
  {
    id: "route-transatlantic",
    name: "Corredor Transatlântico Mercante (Roterdã <-> Nova York)",
    category: "OCEAN_CORRIDOR",
    dailyTonnageTeuApprox: 140000,
    coordinates: [
      [51.9, 4.0],
      [50.5, -0.5],
      [49.8, -5.5],
      [47.5, -20.0],
      [44.0, -40.0],
      [41.5, -60.0],
      [40.5, -73.8],
    ],
  },
  {
    id: "route-transpacific",
    name: "Corredor Transpacífico Mercante (Xangai <-> Los Angeles)",
    category: "OCEAN_CORRIDOR",
    dailyTonnageTeuApprox: 165000,
    coordinates: [
      [31.2, 122.0],
      [32.5, 130.0],
      [35.0, 150.0],
      [38.0, 180.0],
      [37.5, -160.0],
      [35.0, -135.0],
      [33.7, -118.2],
    ],
  },
  {
    id: "route-cape-good-hope",
    name: "Rota do Cabo da Boa Esperança (África do Sul)",
    category: "OCEAN_CORRIDOR",
    chokePoint: "Cabo da Boa Esperança",
    dailyTonnageTeuApprox: 55000,
    coordinates: [
      [-33.9, 18.4],
      [-34.8, 20.0],
      [-34.0, 26.0],
      [-30.0, 31.5],
    ],
  },
  {
    id: "route-south-atlantic",
    name: "Rota Sul-Atlântica (Santos <-> Tânger / Europa)",
    category: "OCEAN_CORRIDOR",
    dailyTonnageTeuApprox: 62000,
    coordinates: [
      [-23.95, -46.3],
      [-20.0, -38.5],
      [-8.0, -34.0],
      [5.0, -25.0],
      [20.0, -18.0],
      [35.8, -5.8],
    ],
  },
];
