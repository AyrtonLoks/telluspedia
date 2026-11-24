import type { AisSnapshot } from "@/lib/ais-data";
import type {
  ObservatoryLayer,
  FirmsHotspot,
  EonetEvent,
  EonetCategoryFilter,
  IssTelemetryData,
  AircraftState,
  MaritimeRoute,
  ObservatoryEntity,
} from "@/lib/observatory-data";
import type { ObservatoryMeta } from "@/lib/observatory-source";
import type {
  FirmsCountryStats,
  FirmsConfidenceFilter,
  FirmsWindowDays,
} from "@/lib/firms-aggregate";
import type { SatelliteCategory, SatelliteTle } from "@/lib/satellite-catalog";
import type { GibsProductId } from "@/lib/gibs-view";
import type { GibsLayerData } from "@/lib/gibs";
import type {
  CurrentUnit,
  FlowMode,
  OceanCurrentGrid,
  WindAltitude,
  WindFieldPayload,
  WindUnit,
} from "@/lib/winds-types";
import type {
  DebrisReleasePoint,
  MarineDebrisHorizonMonths,
  MarineDebrisWindage,
  OceanGyreId,
} from "@/lib/marine-debris-types";
import type {
  FireSourceProvider,
  InpeBdQueimadasPayload,
  ProdesBiomeId,
  TerraBrasilisPayload,
} from "@/lib/inpe-types";
import type { BiomeId, BiomeScope } from "@/lib/biomes-types";

export interface FirmsWindow {
  days: FirmsWindowDays;
  confidence: FirmsConfidenceFilter;
}

export const DEFAULT_FIRMS_WINDOW: FirmsWindow = { days: 1, confidence: "nominal" };

export const ALL_OBSERVATORY_LAYERS: readonly ObservatoryLayer[] = [
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
];

export const DEFAULT_LAYER_OPACITY: Record<ObservatoryLayer, number> = {
  NASA_FIRMS: 1.0,
  NASA_EONET: 1.0,
  ISS_SATELLITES: 1.0,
  FLIGHTS_OPENSKY: 1.0,
  MARITIME_ROUTES: 1.0,
  // Imagem cobre o globo inteiro: começa translúcida para o relevo e as fronteiras aparecerem.
  NASA_GIBS: 0.75,
  GLOBAL_WINDS: 0.85,
  MARINE_DEBRIS: 0.9,
  INPE_DEFORESTATION: 0.9,
  BIOMES_MAP: 0.72,
};

export function perLayer<T>(make: () => T): Record<ObservatoryLayer, T> {
  return Object.fromEntries(ALL_OBSERVATORY_LAYERS.map((id) => [id, make()])) as Record<
    ObservatoryLayer,
    T
  >;
}

export function isEonetSelection(entity: ObservatoryEntity | null): boolean {
  return entity?.type === "EONET" || entity?.type === "EONET_CLUSTER";
}

export function buildBiomesMeta(scope: BiomeScope): ObservatoryMeta {
  return {
    source: "computed",
    provider: scope === "brazil" ? "IBGE Biomas 2019" : "WWF / RESOLVE 2017",
    fetchedAt: new Date().toISOString(),
    stale: false,
  };
}

export async function fetchObservatoryEnvelope(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/** Referência local do produto GIBS quando nem o servidor do TellusPedia respondeu (catálogo sob demanda, T35). */
export async function gibsLocalReference(
  product: GibsProductId,
  month: string | null
): Promise<GibsLayerData> {
  const { GIBS_PRODUCTS } = await import("@/lib/gibs");
  const p = GIBS_PRODUCTS[product];
  return {
    product,
    month: month ?? p.fallbackMonth,
    imageMonth: p.fallbackMonth,
    imageUrl: p.fallbackImage,
    gibsLayer: p.gibsLayer,
    time: `${p.fallbackMonth}-${String(p.day).padStart(2, "0")}`,
  };
}

export interface ObservatoryState {
  activeLayers: ObservatoryLayer[];
  layerOpacity: Record<ObservatoryLayer, number>;
  isPanelOpen: boolean;
  selectedEntity: ObservatoryEntity | null;

  firmsHotspots: FirmsHotspot[];
  /** Focos na janela após o filtro de confiança (pode ser maior que firmsHotspots.length). */
  firmsTotal: number;
  /** Janela temporal e filtro de confiança da camada de queimadas. */
  firmsWindow: FirmsWindow;
  /**
   * Focos por país (ISO alfa-3) na janela. null = contagem indisponível (sem resposta do servidor
   * ou resposta sem o campo) — a UI não pode afirmar "nenhum foco" nesse caso.
   */
  firmsByCountry: Record<string, FirmsCountryStats> | null;
  eonetEvents: EonetEvent[];
  eonetCategory: EonetCategoryFilter;
  issTelemetry: IssTelemetryData | null;
  /** TLEs (CelesTrak) propagados com SGP4 no cliente (D04). */
  satellites: SatelliteTle[];
  /** Categorias de satélites visíveis no globo (a ISS aparece sempre que a camada está ligada). */
  satelliteCategories: SatelliteCategory[];
  /** Rastro da ISS projetado na superfície (desligado por padrão — se lia como segunda trajetória). */
  showIssGroundTrack: boolean;
  aircraftFleet: AircraftState[];
  maritimeRoutes: MaritimeRoute[];
  ais: AisSnapshot;
  vesselsMovingOnly: boolean;
  setVesselsMovingOnly: (enabled: boolean) => void;
  /** Camada NASA GIBS (D25): produto e mês pedidos (null = último mês processado) e o que o servidor entregou. */
  gibsProduct: GibsProductId;
  gibsMonth: string | null;
  gibs: GibsLayerData | null;
  /** Troca produto e/ou mês e recarrega a camada. */
  setGibsRequest: (request: { product?: GibsProductId; month?: string | null }) => void;
  /** Camada de Ventos Globais & Correntes Oceânicas (D27a / D27b). */
  flowMode: FlowMode;
  winds: WindFieldPayload | null;
  windAltitude: WindAltitude;
  windUnit: WindUnit;
  currents: OceanCurrentGrid | null;
  currentUnit: CurrentUnit;
  currentsMeta: ObservatoryMeta;
  currentsLoading: boolean;
  currentsHasLoaded: boolean;
  currentsError: boolean;
  setFlowMode: (mode: FlowMode) => void;
  setWindAltitude: (altitude: WindAltitude) => void;
  setWindUnit: (unit: WindUnit) => void;
  setCurrentUnit: (unit: CurrentUnit) => void;
  loadCurrentsData: () => Promise<void>;
  /** Camada de Lixo Marítimo, Giros Oceânicos & Microplásticos (D29 / RN17). */
  marineDebrisWindage: MarineDebrisWindage;
  marineDebrisHorizonMonths: MarineDebrisHorizonMonths;
  marineDebrisPickMode: boolean;
  marineDebrisReleasePoint: DebrisReleasePoint | null;
  selectedGyreId: OceanGyreId | null;
  setMarineDebrisWindage: (windage: MarineDebrisWindage) => void;
  setMarineDebrisHorizonMonths: (months: MarineDebrisHorizonMonths) => void;
  setMarineDebrisPickMode: (enabled: boolean) => void;
  setMarineDebrisReleasePoint: (point: DebrisReleasePoint | null) => void;
  setSelectedGyreId: (gyreId: OceanGyreId | null) => void;
  /** Dados Ambientais & INPE (D30): alternância FIRMS/BDQueimadas + TerraBrasilis DETER/PRODES. */
  fireSource: FireSourceProvider;
  inpeFires: InpeBdQueimadasPayload | null;
  inpeDeforestation: TerraBrasilisPayload | null;
  prodesBiome: ProdesBiomeId;
  setFireSource: (source: FireSourceProvider) => void;
  setProdesBiome: (biome: ProdesBiomeId) => void;
  /** Mapa dos Biomas Global 14 WWF/RESOLVE + Brasil 6 IBGE (D31). */
  biomeScope: BiomeScope;
  biomeFilterId: BiomeId | null;
  selectedBiomeId: BiomeId | null;
  biomePickMode: boolean;
  setBiomeScope: (scope: BiomeScope) => void;
  setBiomeFilterId: (id: BiomeId | null) => void;
  setSelectedBiomeId: (id: BiomeId | null) => void;
  setBiomePickMode: (enabled: boolean) => void;

  isLoading: Record<ObservatoryLayer, boolean>;
  hasLoaded: Record<ObservatoryLayer, boolean>;
  /** Procedência do dado exibido em cada camada (T05). */
  layerMeta: Record<ObservatoryLayer, ObservatoryMeta>;
  /** true quando o próprio servidor do TellusPedia não respondeu (dados locais em uso). */
  layerError: Record<ObservatoryLayer, boolean>;

  toggleLayer: (layerId: ObservatoryLayer) => void;
  setLayerActive: (layerId: ObservatoryLayer, active: boolean) => void;
  setAllLayers: (layers: ObservatoryLayer[]) => void;
  setLayerOpacity: (layerId: ObservatoryLayer, opacity: number) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setEonetCategory: (category: EonetCategoryFilter) => void;
  setSelectedEntity: (entity: ObservatoryEntity | null) => void;
  /** Muda janela/confiança das queimadas e recarrega a camada. */
  setFirmsWindow: (window: Partial<FirmsWindow>) => void;
  loadLayerData: (layerId: ObservatoryLayer) => Promise<void>;
  /** Recalcula a telemetria da ISS por SGP4 no instante dado (HUD, painel e modelo usam este valor). */
  refreshIssTelemetry: (now?: number) => void;
  toggleSatelliteCategory: (category: SatelliteCategory) => void;
  toggleIssGroundTrack: () => void;
  resetObservatory: () => void;
}
