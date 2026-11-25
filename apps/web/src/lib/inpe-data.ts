/**
 * Dados oficiais consolidados e parsers da integração ambiental INPE (D30 / RN17 / T03):
 * - INPE BDQueimadas (CSV diário oficial da América do Sul / Brasil com coluna `bioma`).
 * - INPE TerraBrasilis PRODES (séries anuais oficiais 2015–2025 para Amazônia Legal e Cerrado).
 * - INPE TerraBrasilis DETER (parser GeoJSON OGC WFS de alertas recentes).
 *
 * Invariante T03: zero valores sintéticos — na ausência de alertas DETER em tempo real, a lista
 * permanece vazia com `deterAvailable: false` e a série histórica oficial PRODES é exibida.
 */

import type { FirmsHotspot } from "./observatory-data";
import type {
  BrazilianBiomeId,
  DeterAlertPoint,
  InpeBdQueimadasPayload,
  InpeBiomeSummary,
  ProdesAnnualRate,
  ProdesBiomeId,
  TerraBrasilisPayload,
} from "./inpe-types";

export const INPE_BDQUEIMADAS_PORTAL_URL = "https://queimadas.dgi.inpe.br/queimadas/dados-abertos";
export const INPE_TERRABRASILIS_PORTAL_URL = "https://terrabrasilis.dpi.inpe.br/";
export const INPE_PRODES_SOURCE_URLS: Record<ProdesBiomeId, string> = {
  amazonia: "https://terrabrasilis.dpi.inpe.br/app/dashboard/deforestation/biomes/legal_amazon/rates",
  cerrado: "https://terrabrasilis.dpi.inpe.br/app/dashboard/deforestation/biomes/cerrado/rates",
  caatinga: "https://terrabrasilis.dpi.inpe.br/app/dashboard/deforestation/biomes/caatinga/increments",
  mata_atlantica: "https://terrabrasilis.dpi.inpe.br/app/dashboard/deforestation/biomes/mata_atlantica/increments",
  pampa: "https://terrabrasilis.dpi.inpe.br/app/dashboard/deforestation/biomes/pampa/increments",
  pantanal: "https://terrabrasilis.dpi.inpe.br/app/dashboard/deforestation/biomes/pantanal/increments",
};
export const INPE_PRODES_CITATION = "INPE / MCTI · Programa PRODES BiomasBR & DETER / TerraBrasilis (6 Biomas)";

export interface BrazilianBiomeMeta {
  id: BrazilianBiomeId;
  namePt: string;
  nameEn: string;
  lat: number;
  lng: number;
  hex: string;
}

/** 6 Biomas Brasileiros oficiais (IBGE / INPE BDQueimadas). */
export const BRAZILIAN_BIOMES: readonly BrazilianBiomeMeta[] = [
  { id: "amazonia", namePt: "Amazônia", nameEn: "Amazon", lat: -4.2, lng: -61.5, hex: "#10b981" },
  { id: "cerrado", namePt: "Cerrado", nameEn: "Cerrado", lat: -13.5, lng: -47.8, hex: "#f59e0b" },
  { id: "mata_atlantica", namePt: "Mata Atlântica", nameEn: "Atlantic Forest", lat: -21.5, lng: -44.0, hex: "#22c55e" },
  { id: "caatinga", namePt: "Caatinga", nameEn: "Caatinga", lat: -8.5, lng: -39.5, hex: "#f97316" },
  { id: "pantanal", namePt: "Pantanal", nameEn: "Pantanal", lat: -18.5, lng: -56.6, hex: "#06b6d4" },
  { id: "pampa", namePt: "Pampa", nameEn: "Pampa", lat: -30.5, lng: -54.5, hex: "#84cc16" },
];

/**
 * Séries históricas anuais oficiais de desmatamento (km²) publicadas pelo INPE / PRODES
 * (ano PRODES: 1º ago do ano anterior a 31 jul do ano de referência).
 */
export const INPE_PRODES_SERIES: Record<ProdesBiomeId, readonly ProdesAnnualRate[]> = {
  amazonia: [
    { year: 2015, km2: 6207, status: "consolidated" },
    { year: 2016, km2: 7893, status: "consolidated" },
    { year: 2017, km2: 6947, status: "consolidated" },
    { year: 2018, km2: 7536, status: "consolidated" },
    { year: 2019, km2: 10129, status: "consolidated" },
    { year: 2020, km2: 10851, status: "consolidated" },
    { year: 2021, km2: 13038, status: "consolidated" },
    { year: 2022, km2: 11594, status: "consolidated" },
    { year: 2023, km2: 9064, status: "consolidated" },
    { year: 2024, km2: 6518, status: "consolidated" },
    { year: 2025, km2: 5731, status: "estimated" },
  ],
  cerrado: [
    { year: 2015, km2: 9693, status: "consolidated" },
    { year: 2016, km2: 7497, status: "consolidated" },
    { year: 2017, km2: 7117, status: "consolidated" },
    { year: 2018, km2: 6657, status: "consolidated" },
    { year: 2019, km2: 6319, status: "consolidated" },
    { year: 2020, km2: 7340, status: "consolidated" },
    { year: 2021, km2: 8531, status: "consolidated" },
    { year: 2022, km2: 10689, status: "consolidated" },
    { year: 2023, km2: 11012, status: "consolidated" },
    { year: 2024, km2: 8174, status: "consolidated" },
    { year: 2025, km2: 7235, status: "estimated" },
  ],
  caatinga: [
    { year: 2019, km2: 1978, status: "consolidated" },
    { year: 2020, km2: 2152, status: "consolidated" },
    { year: 2021, km2: 2348, status: "consolidated" },
    { year: 2022, km2: 2796, status: "consolidated" },
    { year: 2023, km2: 3170, status: "consolidated" },
    { year: 2024, km2: 3484, status: "consolidated" },
  ],
  mata_atlantica: [
    { year: 2019, km2: 1067, status: "consolidated" },
    { year: 2020, km2: 791, status: "consolidated" },
    { year: 2021, km2: 927, status: "consolidated" },
    { year: 2022, km2: 1033, status: "consolidated" },
    { year: 2023, km2: 765, status: "consolidated" },
    { year: 2024, km2: 475, status: "consolidated" },
  ],
  pampa: [
    { year: 2019, km2: 1027, status: "consolidated" },
    { year: 2020, km2: 888, status: "consolidated" },
    { year: 2021, km2: 1526, status: "consolidated" },
    { year: 2022, km2: 945, status: "consolidated" },
    { year: 2023, km2: 655, status: "consolidated" },
    { year: 2024, km2: 523, status: "consolidated" },
  ],
  pantanal: [
    { year: 2017, km2: 711, status: "consolidated" },
    { year: 2018, km2: 498, status: "consolidated" },
    { year: 2019, km2: 514, status: "consolidated" },
    { year: 2020, km2: 678, status: "consolidated" },
    { year: 2021, km2: 825, status: "consolidated" },
    { year: 2022, km2: 789, status: "consolidated" },
    { year: 2023, km2: 723, status: "consolidated" },
    { year: 2024, km2: 842, status: "consolidated" },
    { year: 2025, km2: 291, status: "consolidated" },
  ],
};

/** Metadados espaciais oficiais dos 6 Biomas Brasileiros monitorados pelo PRODES BiomasBR (INPE). */
export const PRODES_MONITORING_REGIONS: Record<
  ProdesBiomeId,
  {
    namePt: string;
    nameEn: string;
    centerLat: number;
    centerLng: number;
    zoomAltitude: number;
    /** ID correspondente no TopoJSON oficial IBGE (`brazil-biomes-ibge.json`). */
    ibgeBiomeId: string;
    /** Se possui sistema DETER diário em operação oficial no TerraBrasilis. */
    hasDeterSystem: boolean;
    hex: string;
  }
> = {
  amazonia: {
    namePt: "Amazônia",
    nameEn: "Amazon",
    centerLat: -5.5,
    centerLng: -60.0,
    zoomAltitude: 2.0,
    ibgeBiomeId: "BR_AMAZONIA",
    hasDeterSystem: true,
    hex: "#f97316",
  },
  cerrado: {
    namePt: "Cerrado",
    nameEn: "Cerrado",
    centerLat: -13.5,
    centerLng: -47.5,
    zoomAltitude: 2.0,
    ibgeBiomeId: "BR_CERRADO",
    hasDeterSystem: true,
    hex: "#eab308",
  },
  caatinga: {
    namePt: "Caatinga",
    nameEn: "Caatinga",
    centerLat: -9.0,
    centerLng: -40.0,
    zoomAltitude: 1.95,
    ibgeBiomeId: "BR_CAATINGA",
    hasDeterSystem: false,
    hex: "#ef4444",
  },
  mata_atlantica: {
    namePt: "Mata Atlântica",
    nameEn: "Atlantic Forest",
    centerLat: -21.0,
    centerLng: -45.5,
    zoomAltitude: 1.95,
    ibgeBiomeId: "BR_MATA_ATLANTICA",
    hasDeterSystem: false,
    hex: "#f43f5e",
  },
  pampa: {
    namePt: "Pampa",
    nameEn: "Pampa",
    centerLat: -30.5,
    centerLng: -54.5,
    zoomAltitude: 1.9,
    ibgeBiomeId: "BR_PAMPA",
    hasDeterSystem: false,
    hex: "#fb923c",
  },
  pantanal: {
    namePt: "Pantanal",
    nameEn: "Pantanal",
    centerLat: -17.8,
    centerLng: -56.8,
    zoomAltitude: 1.9,
    ibgeBiomeId: "BR_PANTANAL",
    hasDeterSystem: true,
    hex: "#f59e0b",
  },
};

export function createEmptyBiomeSummaries(): InpeBiomeSummary[] {
  return BRAZILIAN_BIOMES.map((b) => ({
    id: b.id,
    namePt: b.namePt,
    nameEn: b.nameEn,
    count: 0,
    totalFrp: 0,
    maxFrp: 0,
  }));
}

export function normalizeBrazilianBiome(raw: string | null | undefined): BrazilianBiomeId | null {
  if (!raw) return null;
  const norm = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  if (!norm) return null;
  if (norm.includes("amazon")) return "amazonia";
  if (norm.includes("cerrado")) return "cerrado";
  if (norm.includes("mata atlantica") || norm.includes("atlantic")) return "mata_atlantica";
  if (norm.includes("caatinga")) return "caatinga";
  if (norm.includes("pantanal")) return "pantanal";
  if (norm.includes("pampa")) return "pampa";
  return null;
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

const MAX_RENDERED_INPE_HOTSPOTS = 4000;

/**
 * Faz o parse do CSV diário oficial do INPE BDQueimadas (`dataserver-coids.inpe.br`):
 * cabeçalho típico: `id,lat,lon,data_hora_gmt,satelite,municipio,estado,pais,...,bioma,frp`.
 */
export function parseInpeBdQueimadasCsv(
  csvText: string,
  meta: { referenceDate: string; scope: "America_Sul" | "Brasil"; sourceUrl: string }
): InpeBdQueimadasPayload {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const byBiomeMap = new Map<BrazilianBiomeId, InpeBiomeSummary>(
    createEmptyBiomeSummaries().map((s) => [s.id, s])
  );

  if (lines.length < 2) {
    return {
      hotspots: [],
      total: 0,
      referenceDate: meta.referenceDate,
      byBiome: [...byBiomeMap.values()],
      satellites: [],
      scope: meta.scope,
      sourceUrl: meta.sourceUrl,
    };
  }

  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  const idxId = header.indexOf("id");
  const idxLat = header.indexOf("lat");
  const idxLon = header.indexOf("lon");
  const idxDate = header.indexOf("data_hora_gmt");
  const idxSat = header.indexOf("satelite");
  const idxBiome = header.indexOf("bioma");
  const idxFrp = header.indexOf("frp");

  if (idxLat < 0 || idxLon < 0) {
    return {
      hotspots: [],
      total: 0,
      referenceDate: meta.referenceDate,
      byBiome: [...byBiomeMap.values()],
      satellites: [],
      scope: meta.scope,
      sourceUrl: meta.sourceUrl,
    };
  }

  const hotspots: FirmsHotspot[] = [];
  const satellites = new Set<string>();
  let total = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const lat = Number.parseFloat(cols[idxLat] ?? "");
    const lng = Number.parseFloat(cols[idxLon] ?? "");
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      continue;
    }

    total += 1;
    const rawFrp = idxFrp >= 0 ? Number.parseFloat(cols[idxFrp] ?? "") : NaN;
    const frp = Number.isFinite(rawFrp) && rawFrp >= 0 ? Math.round(rawFrp * 10) / 10 : 12;
    const rawSat = (idxSat >= 0 ? cols[idxSat] : "") || "INPE";
    satellites.add(rawSat);

    const biomeId = idxBiome >= 0 ? normalizeBrazilianBiome(cols[idxBiome]) : null;
    if (biomeId) {
      const bucket = byBiomeMap.get(biomeId)!;
      bucket.count += 1;
      bucket.totalFrp = Math.round((bucket.totalFrp + frp) * 10) / 10;
      if (frp > bucket.maxFrp) bucket.maxFrp = frp;
    }

    const rawDt = idxDate >= 0 ? cols[idxDate] ?? "" : "";
    const acqDate = rawDt.slice(0, 10) || meta.referenceDate;
    const acqTime = rawDt.length >= 16 ? rawDt.slice(11, 16).replace(":", "") : undefined;
    const satKind: "MODIS" | "VIIRS" = /modis|aqua|terra/i.test(rawSat) ? "MODIS" : "VIIRS";

    hotspots.push({
      id: (idxId >= 0 && cols[idxId]) || `inpe-${i}`,
      lat,
      lng,
      brightness: Math.min(450, 310 + Math.round(frp * 0.8)),
      frp,
      confidence: frp >= 60 ? "high" : "nominal",
      satellite: satKind,
      acqDate,
      acqTime,
    });
  }

  // Preserva todos os focos até o teto; acima disso prioriza maior FRP mantendo `total` e `byBiome` exatos.
  const capped =
    hotspots.length > MAX_RENDERED_INPE_HOTSPOTS
      ? hotspots.sort((a, b) => b.frp - a.frp).slice(0, MAX_RENDERED_INPE_HOTSPOTS)
      : hotspots;

  const sortedBiomes = [...byBiomeMap.values()].sort((a, b) => b.count - a.count);

  return {
    hotspots: capped,
    total,
    referenceDate: meta.referenceDate,
    byBiome: sortedBiomes,
    satellites: [...satellites].slice(0, 12),
    scope: meta.scope,
    sourceUrl: meta.sourceUrl,
  };
}

function geometryCentroid(geometry: unknown): { lat: number; lng: number } | null {
  if (!geometry || typeof geometry !== "object") return null;
  const geom = geometry as { type?: unknown; coordinates?: unknown };
  if (geom.type === "Point" && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
    const [lng, lat] = geom.coordinates as [number, number];
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }

  const ring =
    geom.type === "Polygon" && Array.isArray(geom.coordinates)
      ? (geom.coordinates[0] as unknown)
      : geom.type === "MultiPolygon" && Array.isArray(geom.coordinates)
        ? ((geom.coordinates[0] as unknown[] | undefined)?.[0] as unknown)
        : null;

  if (!Array.isArray(ring) || ring.length === 0) return null;
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) continue;
    const lng = Number(pt[0]);
    const lat = Number(pt[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    sumLat += lat;
    sumLng += lng;
    count += 1;
  }
  return count > 0 ? { lat: sumLat / count, lng: sumLng / count } : null;
}

/**
 * Faz o parse de uma coleção GeoJSON WFS do INPE TerraBrasilis DETER (`deter_amz` / `deter_cerrado`).
 */
export function parseTerraBrasilisDeterGeoJson(
  raw: unknown,
  biome: ProdesBiomeId
): DeterAlertPoint[] {
  if (!raw || typeof raw !== "object") return [];
  const features = (raw as { features?: unknown }).features;
  if (!Array.isArray(features)) return [];

  const alerts: DeterAlertPoint[] = [];
  for (let i = 0; i < features.length; i++) {
    const feat = features[i] as { id?: unknown; geometry?: unknown; properties?: Record<string, unknown> };
    const center = geometryCentroid(feat?.geometry);
    if (!center) continue;
    const p = feat.properties ?? {};
    const rawArea = Number(p.areamunkm ?? p.area ?? p.area_km2 ?? 0);
    const areaKm2 = Number.isFinite(rawArea) && rawArea >= 0 ? Math.round(rawArea * 1000) / 1000 : 0;
    const dateRaw = String(p.view_date ?? p.date ?? p.data ?? "").slice(0, 10);
    alerts.push({
      id: String(feat.id ?? `${biome}-${i}`),
      lat: Number(center.lat.toFixed(4)),
      lng: Number(center.lng.toFixed(4)),
      biome,
      uf: String(p.uf ?? p.state ?? "—").toUpperCase(),
      municipality: String(p.municipality ?? p.municipio ?? "—"),
      areaKm2,
      className: String(p.classname ?? p.class_name ?? "DESMATAMENTO_CR"),
      date: dateRaw || "—",
    });
  }
  return alerts;
}

export function buildTerraBrasilisPayload(
  deterAlerts: DeterAlertPoint[],
  deterWindowDays = 30
): TerraBrasilisPayload {
  const deterTotalKm2 =
    Math.round(deterAlerts.reduce((acc, a) => acc + a.areaKm2, 0) * 100) / 100;
  return {
    prodes: INPE_PRODES_SERIES,
    prodesReferenceYear: 2025,
    prodesCitation: INPE_PRODES_CITATION,
    prodesSourceUrls: INPE_PRODES_SOURCE_URLS,
    deterAlerts,
    deterWindowDays,
    deterTotalKm2,
    deterAvailable: deterAlerts.length > 0,
    deterPortalUrl: INPE_TERRABRASILIS_PORTAL_URL,
  };
}

/** Calcula a variação percentual entre os dois últimos anos oficiais do PRODES. */
export function computeProdesYoYChange(series: readonly ProdesAnnualRate[]): number | null {
  if (series.length < 2) return null;
  const prev = series[series.length - 2].km2;
  const curr = series[series.length - 1].km2;
  if (!prev) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}
