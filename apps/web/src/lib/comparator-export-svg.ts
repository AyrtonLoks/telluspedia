/**
 * Exportação vetorial (SVG autônomo) e raster de alta resolução (PNG 2×) dos gráficos
 * do Comparador Multidimensional com legenda e fonte primária institucional (D37 · RN02).
 */

import type {
  ComparisonChartDataset,
  ComparisonMetricSpec,
} from "@/lib/comparator-data";
import type { Locale } from "@/lib/i18n/types";
import type { HistoricalComparisonDataset } from "@/lib/worldbank-timeseries";
import {
  buildComparatorFilename,
  buildComparisonChartCsv,
  COMPARATOR_EXPORT_COLORS_HEX,
  localizeSourceName,
  triggerBlobDownload,
} from "./comparator-export";

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Resolve tokens CSS do Recharts para cores sólidas em SVG/PNG autônomos fora do DOM. */
export function resolveChartCssVariables(svgMarkup: string): string {
  return svgMarkup
    .replace(/rgb\(var\(--color-accent\)\)/g, "#38bdd4")
    .replace(/rgb\(var\(--color-cat-economy\)\)/g, "#f59e0b")
    .replace(/rgb\(var\(--color-cat-science\)\)/g, "#34d399")
    .replace(/rgb\(var\(--color-cat-health\)\)/g, "#a78bfa")
    .replace(/rgb\(var\(--color-fg-muted\)\)/g, "#94a3b8")
    .replace(/rgb\(var\(--color-fg\)\)/g, "#f1f5f9")
    .replace(/rgb\(var\(--color-surface\)\)/g, "#0f172a")
    .replace(/rgb\(var\(--color-surface-hover\)\s*\/\s*0\.5\)/g, "rgba(30,41,59,0.5)")
    .replace(/rgb\(var\(--color-line\)\s*\/\s*0\.14\)/g, "rgba(148,163,184,0.22)");
}

function sanitizeSerializedInnerSvg(rawSvg: string | null | undefined): {
  viewBox: string;
  innerContent: string;
} | null {
  if (!rawSvg) return null;
  const resolved = resolveChartCssVariables(rawSvg)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");

  const openMatch = resolved.match(/<svg\b([^>]*)>([\s\S]*?)<\/svg>\s*$/i);
  if (!openMatch) return null;
  const attrs = openMatch[1] ?? "";
  const body = openMatch[2] ?? "";
  const vbMatch = attrs.match(/\bviewBox="([^"]+)"/i);
  const wMatch = attrs.match(/\bwidth="([\d.]+)"/i);
  const hMatch = attrs.match(/\bheight="([\d.]+)"/i);
  const width = wMatch ? Number(wMatch[1]) : 800;
  const height = hMatch ? Number(hMatch[1]) : 256;
  const viewBox =
    vbMatch?.[1] ??
    `0 0 ${Number.isFinite(width) && width > 0 ? width : 800} ${Number.isFinite(height) && height > 0 ? height : 256}`;

  return { viewBox: escapeXml(viewBox), innerContent: body };
}

export interface ChartLegendExportItem {
  isoCode: string;
  label: string;
  colorHex: string;
  valueLabel?: string;
}

export interface BuildStandaloneChartSvgParams {
  title: string;
  indicatorCode: string;
  unit: string;
  viewMode: "latest" | "historical";
  legend: readonly ChartLegendExportItem[];
  sources: readonly string[];
  locale: Locale;
  innerSvgMarkup?: string | null;
  exportDateIso?: string;
}

export function buildPrimarySourceFooter(
  sources: readonly string[],
  indicatorCode: string,
  locale: Locale
): string {
  const unique = Array.from(
    new Set(
      (sources.length > 0 ? sources : ["Banco Mundial"]).map((s) => localizeSourceName(s, locale))
    )
  );
  if (locale === "en") {
    return `Primary source (RN02): ${unique.join(", ")} · Official code: ${indicatorCode} · TellusPedia`;
  }
  return `Fonte primária (RN02): ${unique.join(", ")} · Código oficial: ${indicatorCode} · TellusPedia`;
}

/**
 * Monta um arquivo SVG 100% autônomo (960×540) com tema D14, título, legenda de países
 * e atribuição explícita de fonte primária em `pt-BR` ou `en` (RN02).
 */
export function buildStandaloneChartSvg(params: BuildStandaloneChartSvgParams): string {
  const {
    title,
    indicatorCode,
    unit,
    viewMode,
    legend,
    sources,
    locale,
    innerSvgMarkup,
    exportDateIso = new Date().toISOString().slice(0, 10),
  } = params;

  const isEn = locale === "en";
  const subtitle = isEn
    ? `Code ${indicatorCode} · Unit: ${unit} · Mode: ${viewMode === "historical" ? "1990–2024 Official Series" : "Latest Official Reading"}`
    : `Código ${indicatorCode} · Unidade: ${unit} · Modo: ${viewMode === "historical" ? "Série Oficial 1990–2024" : "Leitura Oficial Mais Recente"}`;
  const footerText = buildPrimarySourceFooter(sources, indicatorCode, locale);
  const parsedInner = sanitizeSerializedInnerSvg(innerSvgMarkup);

  const legendNodes = legend
    .slice(0, 4)
    .map((item, idx) => {
      const x = 36 + idx * 224;
      const text = item.valueLabel ? `${item.label}: ${item.valueLabel}` : item.label;
      return [
        `<g transform="translate(${x}, 84)">`,
        `<circle cx="6" cy="-4" r="5" fill="${escapeXml(item.colorHex)}" />`,
        `<text x="18" y="0" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600">${escapeXml(text.slice(0, 32))}</text>`,
        `</g>`,
      ].join("");
    })
    .join("");

  const plotMarkup = parsedInner
    ? `<svg x="32" y="108" width="896" height="368" viewBox="${parsedInner.viewBox}" preserveAspectRatio="xMidYMid meet">${parsedInner.innerContent}</svg>`
    : legend
        .slice(0, 4)
        .map((item, idx) => {
          const barW = 140;
          const gap = 64;
          const x = 110 + idx * (barW + gap);
          const barH = 180 - idx * 24;
          const y = 430 - barH;
          return [
            `<rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="6" fill="${escapeXml(item.colorHex)}" fill-opacity="0.88" />`,
            `<text x="${x + barW / 2}" y="452" text-anchor="middle" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="12">${escapeXml(item.isoCode)}</text>`,
            item.valueLabel
              ? `<text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" fill="#f8fafc" font-family="ui-monospace, monospace" font-size="12">${escapeXml(item.valueLabel)}</text>`
              : "",
          ].join("");
        })
        .join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540" role="img" aria-label="${escapeXml(title)}">`,
    `<rect width="960" height="540" fill="#0b1120" />`,
    `<rect x="16" y="16" width="928" height="508" rx="14" fill="#111a2e" stroke="#1e293b" stroke-width="1.5" />`,
    `<text x="36" y="46" fill="#f8fafc" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700">${escapeXml(title)}</text>`,
    `<text x="36" y="66" fill="#94a3b8" font-family="ui-monospace, SFMono-Regular, monospace" font-size="12">${escapeXml(subtitle)}</text>`,
    legendNodes,
    `<line x1="32" y1="98" x2="928" y2="98" stroke="#1e293b" stroke-width="1" />`,
    plotMarkup,
    `<line x1="32" y1="490" x2="928" y2="490" stroke="#1e293b" stroke-width="1" />`,
    `<text x="36" y="510" fill="#94a3b8" font-family="system-ui, -apple-system, sans-serif" font-size="11.5">${escapeXml(footerText)}</text>`,
    `<text x="924" y="510" text-anchor="end" fill="#64748b" font-family="ui-monospace, SFMono-Regular, monospace" font-size="11">${escapeXml(exportDateIso)}</text>`,
    `</svg>`,
  ].join("\n");
}

/** Rasteriza um SVG autônomo em PNG 2× (1920×1080) usando `<canvas>` offscreen no navegador. */
export function rasterizeSvgToPngBlob(svgMarkup: string, scale: number = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined" || typeof Image === "undefined") {
      reject(new Error("Canvas rasterization requires a browser environment"));
      return;
    }
    const width = 960 * scale;
    const height = 540 * scale;
    const img = new Image();
    img.decoding = "async";
    const encoded = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgMarkup)}`;

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("2D canvas context unavailable"));
          return;
        }
        ctx.fillStyle = "#0b1120";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("PNG encoding failed"));
        }, "image/png");
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    img.onerror = () => reject(new Error("Failed to decode standalone SVG for PNG export"));
    img.src = encoded;
  });
}

export interface ExportChartActionParams {
  format: "csv" | "svg" | "png";
  containerEl: HTMLElement | null;
  selectedIsos: readonly string[];
  activeMetricId: string;
  viewMode: "latest" | "historical";
  metric: ComparisonMetricSpec;
  headingTitle: string;
  metricUnit: string;
  latestDataset: ComparisonChartDataset;
  historicalDataset: HistoricalComparisonDataset | null;
  locale: Locale;
  localizeCountry: (isoCode: string, fallback: string) => string;
}

export async function downloadComparisonChartArtifact(
  params: ExportChartActionParams
): Promise<void> {
  const {
    format,
    containerEl,
    selectedIsos,
    activeMetricId,
    viewMode,
    metric,
    headingTitle,
    metricUnit,
    latestDataset,
    historicalDataset,
    locale,
    localizeCountry,
  } = params;
  const suffix = `${activeMetricId.toLowerCase()}-${viewMode}`;

  if (format === "csv") {
    const csv = buildComparisonChartCsv({
      viewMode,
      metric,
      metricTitle: headingTitle,
      metricUnit,
      latestDataset,
      historicalDataset,
      locale,
    });
    triggerBlobDownload(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      buildComparatorFilename(selectedIsos, suffix, "csv")
    );
    return;
  }

  const svgEl = containerEl?.querySelector("svg.recharts-surface");
  const innerSvgMarkup =
    svgEl && typeof XMLSerializer !== "undefined"
      ? new XMLSerializer().serializeToString(svgEl)
      : null;

  const legend =
    viewMode === "historical" && historicalDataset
      ? historicalDataset.activeSeries.map((s) => ({
          isoCode: s.isoCode,
          label: localizeCountry(s.isoCode, s.nameCommon),
          colorHex: COMPARATOR_EXPORT_COLORS_HEX[s.colorIndex % COMPARATOR_EXPORT_COLORS_HEX.length]!,
          valueLabel: `${s.firstYear}–${s.lastYear}`,
        }))
      : latestDataset.entries.map((entry) => ({
          isoCode: entry.isoCode,
          label: localizeCountry(entry.isoCode, entry.nameCommon),
          colorHex:
            COMPARATOR_EXPORT_COLORS_HEX[entry.colorIndex % COMPARATOR_EXPORT_COLORS_HEX.length]!,
          valueLabel: metric.formatValue(entry.value),
        }));

  const sources =
    viewMode === "historical" && historicalDataset
      ? historicalDataset.activeSeries.map((s) => s.sourcePrimary)
      : latestDataset.entries.map((e) => e.sourcePrimary);

  const svg = buildStandaloneChartSvg({
    title: headingTitle,
    indicatorCode: metric.indicatorCode,
    unit: metricUnit,
    viewMode,
    legend,
    sources,
    locale,
    innerSvgMarkup,
  });

  if (format === "svg") {
    triggerBlobDownload(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      buildComparatorFilename(selectedIsos, suffix, "svg")
    );
    return;
  }

  try {
    const pngBlob = await rasterizeSvgToPngBlob(svg, 2);
    triggerBlobDownload(pngBlob, buildComparatorFilename(selectedIsos, suffix, "png"));
  } catch {
    triggerBlobDownload(
      new Blob([svg], { type: "image/svg+xml;charset=utf-8" }),
      buildComparatorFilename(selectedIsos, suffix, "svg")
    );
  }
}
