import React from "react";
import {
  Activity,
  Anchor,
  Flame,
  Leaf,
  Network,
  PawPrint,
  Plane,
  Radio,
  Satellite,
  Trees,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import type { Tone } from "@/components/ui/tones";
import { GIBS_PRODUCTS, formatGibsMonth } from "@/lib/gibs";
import { formatNumber } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/types";
import type { TranslateFn } from "@/lib/i18n/useT";
import type { ObservatoryLayer } from "@/lib/observatory-data";
import type { useObservatoryStore } from "@/stores/observatoryStore";

export interface LayerOption {
  id: ObservatoryLayer;
  name: string;
  source: string;
  description: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  tone: Tone;
  badgeText: (
    state: ReturnType<typeof useObservatoryStore.getState>,
    locale: Locale,
    t: TranslateFn
  ) => string;
}

export const LAYER_OPTIONS: readonly LayerOption[] = [
  {
    id: "NASA_FIRMS",
    name: "Queimadas Ativas (FIRMS)",
    source: "NASA MODIS / VIIRS",
    description:
      "Anomalias térmicas globais detectadas por satélite (VIIRS/MODIS): focos de calor ativos.",
    icon: Flame,
    tone: "layer-fires",
    badgeText: (s, locale, t) =>
      `${formatNumber(s.firmsTotal ?? s.firmsHotspots?.length ?? 0, locale)} ${t("obs.badge.hotspots", "focos ativos")}`,
  },
  {
    id: "USGS_EARTHQUAKES",
    name: "Terremotos & Placas Tectônicas",
    source: "USGS Hazards · PB2002",
    description:
      "Sismicidade global em tempo real (USGS GeoJSON) por magnitude e profundidade com limites de placas tectônicas (PB2002).",
    icon: Zap,
    tone: "warning",
    badgeText: (s, locale, t) => {
      const count = s.earthquakes?.totalCount ?? 0;
      return `${formatNumber(count, locale)} ${t("obs.seismic.quakesShort", "sismos")} · M${s.seismicMinMagnitude}+`;
    },
  },
  {
    id: "NASA_EONET",
    name: "Eventos Severos (EONET)",
    source: "NASA Earth Observatory",
    description: "Monitoramento de tempestades, vulcões, secas e eventos naturais.",
    icon: Activity,
    tone: "layer-events",
    badgeText: (s, locale, t) => {
      const count =
        s.eonetCategory === "all"
          ? s.eonetEvents.length
          : s.eonetEvents.filter((event) => event.category === s.eonetCategory).length;
      return `${formatNumber(count, locale)} ${t("obs.badge.events", "eventos")}`;
    },
  },
  {
    id: "ISS_SATELLITES",
    name: "ISS & Satélites Artificiais",
    source: "CelesTrak (TLE) + SGP4",
    description:
      "Estação Espacial Internacional e satélites: posição real, órbita e rastro na superfície.",
    icon: Radio,
    tone: "layer-satellites",
    badgeText: (s, locale, t) =>
      typeof s.issTelemetry?.altitudeKm === "number"
        ? `${t("obs.badge.altitude", "Altitude")}: ${formatNumber(s.issTelemetry.altitudeKm, locale, { maximumFractionDigits: 1 })} km`
        : t("obs.badge.calculatingOrbit", "Calculando órbita…"),
  },
  {
    id: "FLIGHTS_OPENSKY",
    name: "Tráfego Aéreo",
    source: "OpenSky Network (ADS-B)",
    description:
      "Amostra global de aeronaves em voo. A posição entre transmissões é estimada.",
    icon: Plane,
    tone: "layer-aircraft",
    badgeText: (s, locale, t) =>
      `${formatNumber(s.aircraftFleet?.length ?? 0, locale)} ${t("obs.badge.flights", "voos")}`,
  },
  {
    id: "MARITIME_ROUTES",
    name: "Tráfego Marítimo",
    source: "AIS Stream",
    description:
      "Amostra AIS em seis regiões monitoradas. Os números variam conforme as posições recebidas.",
    icon: Anchor,
    tone: "layer-maritime",
    badgeText: (s, locale, t) =>
      `${formatNumber(s.ais.vessels.length, locale)} ${t("obs.badge.vessels", "embarcações")}`,
  },
  {
    id: "NASA_GIBS",
    name: "Imagens de Satélite (GIBS)",
    source: "NASA GIBS (MODIS, GHRSST)",
    description:
      "Mapas globais mensais de vegetação, neve, gelo marinho e temperatura da superfície, desde 2000.",
    icon: Satellite,
    tone: "layer-satellites",
    badgeText: (s, locale, t) => {
      const pid = s.gibs ? s.gibs.product : s.gibsProduct;
      const shortName = t(`obs.gibs.${pid}.short`, GIBS_PRODUCTS[pid].shortName);
      return s.gibs ? `${shortName} · ${formatGibsMonth(s.gibs.imageMonth, locale)}` : shortName;
    },
  },
  {
    id: "GLOBAL_WINDS",
    name: "Ventos & Correntes Oceânicas",
    source: "NOAA GFS · Open-Meteo Marine",
    description:
      "Circulação atmosférica (10 m e jato 250 hPa) e correntes oceânicas superficiais com partículas GPU.",
    icon: Wind,
    tone: "layer-satellites",
    badgeText: (s, locale, t) => {
      if (s.flowMode === "both") {
        const level = s.windAltitude === "jet250" ? "250 hPa" : "10 m";
        return `${level} + ${t("obs.badge.oceans", "Oceanos")}`;
      }
      if (s.flowMode === "currents") {
        if (!s.currents) return t("obs.badge.currents", "Correntes");
        const val =
          s.currentUnit === "knots"
            ? s.currents.maxSpeedMs * 1.9438444924
            : s.currents.maxSpeedMs;
        const unit = s.currentUnit === "knots" ? t("obs.badge.knots", "nós") : "m/s";
        return `${t("obs.badge.oceans", "Oceanos")} · ${formatNumber(val, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unit}`;
      }
      const grid = s.winds ? s.winds[s.windAltitude] : null;
      const level = s.windAltitude === "jet250" ? "250 hPa" : "10 m";
      if (!grid) return level;
      const factor = s.windUnit === "knots" ? 1.9438444924 : 3.6;
      const unit = s.windUnit === "knots" ? t("obs.badge.knots", "nós") : "km/h";
      return `${level} · ${formatNumber(Math.round(grid.maxSpeedMs * factor), locale)} ${unit}`;
    },
  },
  {
    id: "MARINE_DEBRIS",
    name: "Lixo Marítimo & Giros Oceânicos",
    source: "NOAA · Eriksen–Lebreton · D27",
    description:
      "5 giros subtropicais de microplásticos e advecção Lagrangiana acoplada a correntes + ventos.",
    icon: Waves,
    tone: "layer-maritime",
    badgeText: (s, _locale, t) =>
      s.marineDebrisReleasePoint
        ? t("obs.badge.driftActive", "5 giros · Deriva ativa")
        : t("obs.badge.gyres5", "5 giros · Ekman"),
  },
  {
    id: "INPE_DEFORESTATION",
    name: "Desmatamento INPE (DETER / PRODES)",
    source: "INPE / MCTI · TerraBrasilis",
    description:
      "Mapa de calor de desmatamento e séries oficiais PRODES BiomasBR nos 6 Biomas Brasileiros + alertas DETER.",
    icon: Trees,
    tone: "layer-fires",
    badgeText: (s, locale, t) => {
      const biomeNames: Record<string, string> = {
        amazonia: t("obs.inpe.amazonShort", "Amazônia"),
        cerrado: "Cerrado",
        caatinga: "Caatinga",
        mata_atlantica: locale === "en" ? "Atlantic Forest" : "Mata Atlântica",
        pampa: "Pampa",
        pantanal: "Pantanal",
      };
      const biomeLabel = biomeNames[s.prodesBiome] ?? "Amazônia";
      const alertsCount = s.inpeDeforestation?.deterAlerts.length ?? 0;
      if (s.inpeDeforestation?.deterAvailable && alertsCount > 0) {
        return `${biomeLabel} · ${formatNumber(alertsCount, locale)} ${t("obs.inpe.alertsShort", "alertas")}`;
      }
      return `${biomeLabel} · PRODES`;
    },
  },
  {
    id: "BIOMES_MAP",
    name: "Mapa dos Biomas (WWF & IBGE)",
    source: "WWF / RESOLVE · IBGE Biomas",
    description:
      "14 biomas terrestres globais (RESOLVE/WWF) e 6 Biomas Brasileiros (IBGE) com fichas ecológicas.",
    icon: Leaf,
    tone: "success",
    badgeText: (s, _locale, t) =>
      s.biomeScope === "brazil"
        ? t("obs.biomes.badgeBrazil", "Brasil · 6 IBGE")
        : t("obs.biomes.badgeGlobal", "Global · 14 WWF"),
  },
  {
    id: "SPECIES_MAP",
    name: "Espécies & Biodiversidade (GBIF / IUCN)",
    source: "GBIF API v1 · IUCN Red List",
    description:
      "Fauna emblemática e ameaçada (CR–LC) por bioma e país com ocorrências georreferenciadas reais do GBIF.",
    icon: PawPrint,
    tone: "accent",
    badgeText: (_s, _locale, t) => t("obs.species.badgeSummary", "28 espécies · IUCN + GBIF"),
  },
  {
    id: "SUBMARINE_CABLES",
    name: "Cabos Submarinos de Internet",
    source: "TeleGeography (CC BY-SA 4.0)",
    description:
      "Sistemas troncais transoceânicos de fibra óptica, estações de aterramento e gargalos geopolíticos estratégicos.",
    icon: Network,
    tone: "accent",
    badgeText: (_s, _locale, t) => t("obs.cables.badgeSummary", "15 sistemas · 6 gargalos"),
  },
  {
    id: "AIR_QUALITY",
    name: "Qualidade do Ar (PM2.5 & AQI)",
    source: "Open-Meteo Air Quality (CAMS)",
    description:
      "Material particulado fino (PM2.5/PM10), US AQI (EPA) e European AQI (EEA) em estações capitais globais.",
    icon: Wind,
    tone: "success",
    badgeText: (s, locale, t) => {
      const count = s.airQualityStations?.totalCount ?? 28;
      const scale = s.aqiScaleMode === "european_aqi" ? "EAQI" : "US AQI";
      return `${formatNumber(count, locale)} ${t("obs.aqi.stationsShort", "estações")} · ${scale}`;
    },
  },
];
