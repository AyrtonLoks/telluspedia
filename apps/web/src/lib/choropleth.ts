import { getAllCountries, WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";
import { getSourceUrl } from "@/lib/citations";
import type { FirmsCountryStats } from "@/lib/firms-aggregate";

export const CHOROPLETH_INDICATOR_IDS = [
  "NY.GDP.MKTP.CD",
  "NY.GDP.PCAP.CD",
  "SP.POP.TOTL",
  "SP.DYN.LE00.IN",
  "MS.MIL.XPND.GD.ZS",
  "NASA_FIRMS",
] as const;

export type ChoroplethIndicatorId = (typeof CHOROPLETH_INDICATOR_IDS)[number];

export type ChoroplethScaleType = "log" | "linear" | "sqrt" | "log1p";

export interface ChoroplethIndicatorMeta {
  id: ChoroplethIndicatorId;
  label: string;
  shortLabel: string;
  unit: string;
  scale: ChoroplethScaleType;
  scaleLabel: string;
  palette: readonly [string, string, string, string, string];
  sourcePrimary: string;
  sourceUrl: string;
  description: string;
  formatValue: (value: number) => string;
  formatTick: (value: number) => string;
}

export interface ChoroplethCountryEntry {
  isoCode: string;
  nameCommon: string;
  available: boolean;
  isZeroActivity?: boolean;
  value: number | null;
  normalized: number | null;
  color: string;
  formattedValue: string;
  rank: number | null;
  rankTotal: number;
  year: number | null;
  sourcePrimary: string;
  sourceUrl: string;
  extraDetail?: string;
}

export interface ChoroplethLegendTick {
  position: number; // 0..1
  value: number;
  label: string;
}

export interface ChoroplethDataset {
  indicator: ChoroplethIndicatorMeta;
  entries: Record<string, ChoroplethCountryEntry>;
  min: number | null;
  max: number | null;
  availableCount: number;
  activeCount: number;
  totalCountries: number;
  ticks: ChoroplethLegendTick[];
  /** true quando a fonte dinâmica (ex.: FIRMS) ainda não entregou contagem por país. */
  isSourceUnavailable: boolean;
}

/** Cor neutra reservada a "Dado indisponível" — distinta de todas as rampas de dados. */
export const CHOROPLETH_MISSING_COLOR = "#343e4f";
/** Cor discreta para países sem focos detectados quando o dado FIRMS do servidor está disponível. */
export const CHOROPLETH_FIRMS_ZERO_COLOR = "#1c2432";

/**
 * Rampas perceptualmente uniformes (luminância monotônica L*, seguras para daltonismo):
 * - Viridis (economia)
 * - Plasma/Inferno adaptado (demografia / fogo)
 * - Cividis/Teal-Gold (saúde / expectativa de vida)
 * - Magma adaptado (gasto militar)
 */
const PALETTE_VIRIDIS = ["#221a53", "#2b5882", "#20908d", "#6ece58", "#f4e04d"] as const;
const PALETTE_PLASMA = ["#271258", "#7c1f82", "#c94662", "#f38c3c", "#f9df6b"] as const;
const PALETTE_TEAL_GOLD = ["#162d52", "#23648a", "#3a9f96", "#95cc77", "#f5e384"] as const;
const PALETTE_MAGMA = ["#241447", "#732069", "#c23d58", "#ec7d49", "#f8d387"] as const;
const PALETTE_THERMAL = ["#3a153a", "#932346", "#d8502e", "#f39426", "#fce26a"] as const;

function formatUsdCompact(v: number): string {
  if (v >= 1e12) {
    return `US$ ${(v / 1e12).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} tri`;
  }
  if (v >= 1e9) {
    return `US$ ${(v / 1e9).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} bi`;
  }
  if (v >= 1e6) {
    return `US$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  }
  return `US$ ${Math.round(v).toLocaleString("pt-BR")}`;
}

function formatUsdTick(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}T`;
  if (v >= 1e9) return `$${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}B`;
  if (v >= 1e6) return `$${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}M`;
  return `$${Math.round(v).toLocaleString("pt-BR")}`;
}

function formatPopulationCompact(v: number): string {
  if (v >= 1e9) {
    return `${(v / 1e9).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} bi hab.`;
  }
  if (v >= 1e6) {
    return `${(v / 1e6).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi hab.`;
  }
  return `${Math.round(v).toLocaleString("pt-BR")} hab.`;
}

function formatPopulationTick(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}B`;
  if (v >= 1e6) return `${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}M`;
  if (v >= 1e3) return `${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`;
  return String(Math.round(v));
}

export const CHOROPLETH_INDICATORS: Record<ChoroplethIndicatorId, ChoroplethIndicatorMeta> = {
  "NY.GDP.MKTP.CD": {
    id: "NY.GDP.MKTP.CD",
    label: "PIB nominal",
    shortLabel: "PIB",
    unit: "USD",
    scale: "log",
    scaleLabel: "Escala logarítmica",
    palette: PALETTE_VIRIDIS,
    sourcePrimary: "Banco Mundial (WDI)",
    sourceUrl: getSourceUrl("Banco Mundial", "NY.GDP.MKTP.CD"),
    description: "Produto Interno Bruto nominal em dólares correntes.",
    formatValue: formatUsdCompact,
    formatTick: formatUsdTick,
  },
  "NY.GDP.PCAP.CD": {
    id: "NY.GDP.PCAP.CD",
    label: "PIB per capita",
    shortLabel: "PIB / hab.",
    unit: "USD / hab.",
    scale: "log",
    scaleLabel: "Escala logarítmica",
    palette: PALETTE_VIRIDIS,
    sourcePrimary: "Banco Mundial (WDI)",
    sourceUrl: getSourceUrl("Banco Mundial", "NY.GDP.PCAP.CD"),
    description: "PIB nominal dividido pela população residente.",
    formatValue: (v) => `US$ ${Math.round(v).toLocaleString("pt-BR")}`,
    formatTick: (v) =>
      v >= 1e3
        ? `$${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}k`
        : `$${Math.round(v)}`,
  },
  "SP.POP.TOTL": {
    id: "SP.POP.TOTL",
    label: "População total",
    shortLabel: "População",
    unit: "habitantes",
    scale: "log",
    scaleLabel: "Escala logarítmica",
    palette: PALETTE_PLASMA,
    sourcePrimary: "Banco Mundial (WDI)",
    sourceUrl: getSourceUrl("Banco Mundial", "SP.POP.TOTL"),
    description: "População total residente por território.",
    formatValue: formatPopulationCompact,
    formatTick: formatPopulationTick,
  },
  "SP.DYN.LE00.IN": {
    id: "SP.DYN.LE00.IN",
    label: "Expectativa de vida",
    shortLabel: "Exp. de vida",
    unit: "anos",
    scale: "linear",
    scaleLabel: "Escala linear",
    palette: PALETTE_TEAL_GOLD,
    sourcePrimary: "Banco Mundial (WDI)",
    sourceUrl: getSourceUrl("Banco Mundial", "SP.DYN.LE00.IN"),
    description: "Expectativa de vida ao nascer em anos.",
    formatValue: (v) =>
      `${v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} anos`,
    formatTick: (v) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} a`,
  },
  "MS.MIL.XPND.GD.ZS": {
    id: "MS.MIL.XPND.GD.ZS",
    label: "Gasto militar (% do PIB)",
    shortLabel: "Gasto militar",
    unit: "% do PIB",
    scale: "sqrt",
    scaleLabel: "Escala raiz quadrada",
    palette: PALETTE_MAGMA,
    sourcePrimary: "SIPRI / Banco Mundial",
    sourceUrl: getSourceUrl("SIPRI", "MS.MIL.XPND.GD.ZS"),
    description: "Despesa militar como proporção do PIB anual.",
    formatValue: (v) =>
      `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% do PIB`,
    formatTick: (v) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
  },
  NASA_FIRMS: {
    id: "NASA_FIRMS",
    label: "Queimadas 24h (FIRMS)",
    shortLabel: "Queimadas 24h",
    unit: "focos",
    scale: "log1p",
    scaleLabel: "Escala logarítmica",
    palette: PALETTE_THERMAL,
    sourcePrimary: "NASA FIRMS (VIIRS/MODIS)",
    sourceUrl: "https://firms.modaps.eosdis.nasa.gov/",
    description: "Focos ativos de calor detectados por satélite nas últimas 24h.",
    formatValue: (v) => {
      const count = Math.round(v);
      return `${count.toLocaleString("pt-BR")} ${count === 1 ? "foco" : "focos"}`;
    },
    formatTick: (v) => {
      const count = Math.round(v);
      return count >= 1e3
        ? `${(count / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`
        : String(count);
    },
  },
};

export const CHOROPLETH_INDICATOR_LIST: readonly ChoroplethIndicatorMeta[] =
  CHOROPLETH_INDICATOR_IDS.map((id) => CHOROPLETH_INDICATORS[id]);

export function isChoroplethIndicatorId(value: unknown): value is ChoroplethIndicatorId {
  return typeof value === "string" && Object.hasOwn(CHOROPLETH_INDICATORS, value);
}

function parseHexRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    clamp(r).toString(16).padStart(2, "0") +
    clamp(g).toString(16).padStart(2, "0") +
    clamp(b).toString(16).padStart(2, "0")
  );
}

/**
 * Interpola linearmente em sRGB entre os stops perceptualmente uniformes da rampa.
 * Retorna sempre hex `#rrggbb`.
 */
export function samplePaletteColor(
  palette: readonly string[],
  t: number
): string {
  if (palette.length === 0) return CHOROPLETH_MISSING_COLOR;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
  if (clamped <= 0) return palette[0];
  if (clamped >= 1) return palette[palette.length - 1];

  const scaled = clamped * (palette.length - 1);
  const idx = Math.floor(scaled);
  const frac = scaled - idx;
  const [r1, g1, b1] = parseHexRgb(palette[idx]);
  const [r2, g2, b2] = parseHexRgb(palette[Math.min(idx + 1, palette.length - 1)]);
  return rgbToHex(r1 + (r2 - r1) * frac, g1 + (g2 - g1) * frac, b1 + (b2 - b1) * frac);
}

function transformScale(value: number, scale: ChoroplethScaleType): number {
  switch (scale) {
    case "log":
      return Math.log10(Math.max(value, 1e-6));
    case "log1p":
      return Math.log10(Math.max(0, value) + 1);
    case "sqrt":
      return Math.sqrt(Math.max(0, value));
    case "linear":
    default:
      return value;
  }
}

function invertScale(transformed: number, scale: ChoroplethScaleType): number {
  switch (scale) {
    case "log":
      return 10 ** transformed;
    case "log1p":
      return Math.max(0, 10 ** transformed - 1);
    case "sqrt":
      return transformed * transformed;
    case "linear":
    default:
      return transformed;
  }
}

export function normalizeScaleValue(
  value: number,
  min: number,
  max: number,
  scale: ChoroplethScaleType
): number {
  const tMin = transformScale(min, scale);
  const tMax = transformScale(max, scale);
  if (tMax <= tMin) return 0.5;
  const tVal = transformScale(value, scale);
  return Math.max(0, Math.min(1, (tVal - tMin) / (tMax - tMin)));
}

function buildLegendTicks(
  min: number | null,
  max: number | null,
  meta: ChoroplethIndicatorMeta
): ChoroplethLegendTick[] {
  if (min === null || max === null) return [];
  if (max <= min) {
    return [{ position: 0.5, value: min, label: meta.formatTick(min) }];
  }
  const tMin = transformScale(min, meta.scale);
  const tMax = transformScale(max, meta.scale);
  const positions = [0, 0.5, 1];
  return positions.map((position) => {
    const value =
      position === 0
        ? min
        : position === 1
          ? max
          : invertScale(tMin + (tMax - tMin) * position, meta.scale);
    return {
      position,
      value,
      label: meta.formatTick(value),
    };
  });
}

export function buildPaletteGradientCss(palette: readonly string[]): string {
  return `linear-gradient(90deg, ${palette.join(", ")})`;
}

/** Fundo CSS com hachura sutil espelhando o padrão de "Dado indisponível" do globo 3D. */
export const CHOROPLETH_MISSING_SWATCH_CSS =
  `repeating-linear-gradient(-45deg, ${CHOROPLETH_MISSING_COLOR}, ${CHOROPLETH_MISSING_COLOR} 3px, rgba(180, 194, 214, 0.24) 3px, rgba(180, 194, 214, 0.24) 4.5px)`;

const staticDatasetCache = new Map<ChoroplethIndicatorId, ChoroplethDataset>();

/**
 * Constrói o dataset coroplético completo para os 177 países do globo.
 * Países sem dado real são marcados com `available: false` e `value: null`
 * (NUNCA convertidos em zero) e recebem `CHOROPLETH_MISSING_COLOR`.
 */
export function buildChoroplethDataset(
  indicatorId: ChoroplethIndicatorId,
  firmsByCountry?: Record<string, FirmsCountryStats> | null
): ChoroplethDataset {
  const meta = CHOROPLETH_INDICATORS[indicatorId];

  if (indicatorId !== "NASA_FIRMS") {
    const cached = staticDatasetCache.get(indicatorId);
    if (cached) return cached;
  }

  const allCountries = getAllCountries();
  const totalCountries = Object.keys(WORLD_COUNTRIES_CATALOG).length;
  const entries: Record<string, ChoroplethCountryEntry> = {};

  if (indicatorId === "NASA_FIRMS") {
    const isSourceUnavailable = firmsByCountry === null || firmsByCountry === undefined;

    if (isSourceUnavailable) {
      for (const country of allCountries) {
        entries[country.isoCode] = {
          isoCode: country.isoCode,
          nameCommon: country.nameCommon,
          available: false,
          value: null,
          normalized: null,
          color: CHOROPLETH_MISSING_COLOR,
          formattedValue: "Dado indisponível",
          rank: null,
          rankTotal: 0,
          year: null,
          sourcePrimary: meta.sourcePrimary,
          sourceUrl: meta.sourceUrl,
        };
      }
      return {
        indicator: meta,
        entries,
        min: null,
        max: null,
        availableCount: 0,
        activeCount: 0,
        totalCountries,
        ticks: [],
        isSourceUnavailable: true,
      };
    }

    const positiveRows: Array<{
      isoCode: string;
      nameCommon: string;
      stats: FirmsCountryStats;
    }> = [];

    for (const country of allCountries) {
      const stats = firmsByCountry[country.isoCode];
      if (stats && Number.isFinite(stats.count) && stats.count > 0) {
        positiveRows.push({
          isoCode: country.isoCode,
          nameCommon: country.nameCommon,
          stats,
        });
      }
    }

    positiveRows.sort((a, b) => b.stats.count - a.stats.count || b.stats.frpSum - a.stats.frpSum);
    const min = positiveRows.length > 0 ? positiveRows[positiveRows.length - 1].stats.count : null;
    const max = positiveRows.length > 0 ? positiveRows[0].stats.count : null;
    const rankByIso = new Map<string, number>();
    positiveRows.forEach((row, index) => {
      rankByIso.set(row.isoCode, index + 1);
    });

    for (const country of allCountries) {
      const stats = firmsByCountry[country.isoCode];
      const count = stats && Number.isFinite(stats.count) && stats.count > 0 ? stats.count : 0;
      if (count > 0 && min !== null && max !== null) {
        const normalized = normalizeScaleValue(count, min, max, meta.scale);
        const frpLabel =
          Number.isFinite(stats.frpSum) && stats.frpSum > 0
            ? `FRP acumulado ${stats.frpSum.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MW`
            : undefined;
        entries[country.isoCode] = {
          isoCode: country.isoCode,
          nameCommon: country.nameCommon,
          available: true,
          isZeroActivity: false,
          value: count,
          normalized,
          color: samplePaletteColor(meta.palette, normalized),
          formattedValue: meta.formatValue(count),
          rank: rankByIso.get(country.isoCode) ?? null,
          rankTotal: positiveRows.length,
          year: null,
          sourcePrimary: meta.sourcePrimary,
          sourceUrl: meta.sourceUrl,
          extraDetail: frpLabel,
        };
      } else {
        entries[country.isoCode] = {
          isoCode: country.isoCode,
          nameCommon: country.nameCommon,
          available: true,
          isZeroActivity: true,
          value: 0,
          normalized: null,
          color: CHOROPLETH_FIRMS_ZERO_COLOR,
          formattedValue: "0 focos detectados (24h)",
          rank: null,
          rankTotal: positiveRows.length,
          year: null,
          sourcePrimary: meta.sourcePrimary,
          sourceUrl: meta.sourceUrl,
        };
      }
    }

    return {
      indicator: meta,
      entries,
      min,
      max,
      availableCount: totalCountries,
      activeCount: positiveRows.length,
      totalCountries,
      ticks: buildLegendTicks(min, max, meta),
      isSourceUnavailable: false,
    };
  }

  // Indicadores estruturais (Banco Mundial / SIPRI)
  const validRows: Array<{
    isoCode: string;
    nameCommon: string;
    value: number;
    year: number | null;
    sourcePrimary: string;
    sourceUrl: string;
  }> = [];

  const validByIso = new Map<string, (typeof validRows)[number]>();

  for (const country of allCountries) {
    const ind = country.indicators.find((item) => item.indicatorCode === indicatorId);
    if (ind && typeof ind.value === "number" && Number.isFinite(ind.value)) {
      const row = {
        isoCode: country.isoCode,
        nameCommon: country.nameCommon,
        value: ind.value,
        year: typeof ind.year === "number" && Number.isFinite(ind.year) ? ind.year : null,
        sourcePrimary: ind.sourcePrimary || meta.sourcePrimary,
        sourceUrl: ind.sourceUrl || meta.sourceUrl,
      };
      validRows.push(row);
      validByIso.set(country.isoCode, row);
    }
  }

  validRows.sort((a, b) => b.value - a.value);
  const rankByIso = new Map<string, number>();
  validRows.forEach((row, index) => {
    rankByIso.set(row.isoCode, index + 1);
  });

  const min = validRows.length > 0 ? validRows[validRows.length - 1].value : null;
  const max = validRows.length > 0 ? validRows[0].value : null;

  for (const country of allCountries) {
    const row = validByIso.get(country.isoCode);
    if (row && min !== null && max !== null) {
      const normalized = normalizeScaleValue(row.value, min, max, meta.scale);
      entries[country.isoCode] = {
        isoCode: country.isoCode,
        nameCommon: country.nameCommon,
        available: true,
        value: row.value,
        normalized,
        color: samplePaletteColor(meta.palette, normalized),
        formattedValue: meta.formatValue(row.value),
        rank: rankByIso.get(country.isoCode) ?? null,
        rankTotal: validRows.length,
        year: row.year,
        sourcePrimary: row.sourcePrimary,
        sourceUrl: row.sourceUrl,
      };
    } else {
      entries[country.isoCode] = {
        isoCode: country.isoCode,
        nameCommon: country.nameCommon,
        available: false,
        value: null,
        normalized: null,
        color: CHOROPLETH_MISSING_COLOR,
        formattedValue: "Dado indisponível",
        rank: null,
        rankTotal: validRows.length,
        year: null,
        sourcePrimary: meta.sourcePrimary,
        sourceUrl: meta.sourceUrl,
      };
    }
  }

  const dataset: ChoroplethDataset = {
    indicator: meta,
    entries,
    min,
    max,
    availableCount: validRows.length,
    activeCount: validRows.length,
    totalCountries,
    ticks: buildLegendTicks(min, max, meta),
    isSourceUnavailable: false,
  };

  staticDatasetCache.set(indicatorId, dataset);
  return dataset;
}
