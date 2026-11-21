import { formatABNT, formatAPA, getSourceUrl } from "./citations";
import { getCountryData, type CountryIndicator } from "./country-data";
import { HISTORICAL_ERAS, type HistoricalEraId } from "./historical-entities";
import type { StudyLineageInfo, StudyRecord } from "./studies-store";

export interface StudyExportOptions {
  origin?: string;
  lineage?: StudyLineageInfo | null;
  accessDate?: Date;
}

export interface PrimarySourceEntry {
  source: string;
  url: string;
}

function normalizeOrigin(origin?: string): string {
  const candidate = (origin ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").trim();
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.origin;
    }
  } catch {
    // fallback below
  }
  return "http://localhost:3000";
}

function formatPeriod(study: StudyRecord): string {
  if (typeof study.geologicalMa === "number" && study.geologicalMa > 0) {
    return `${study.geologicalMa} Ma (Era Geológica)`;
  }
  if (study.timelineStartYear === study.timelineEndYear) {
    return String(study.timelineStartYear);
  }
  return `${study.timelineStartYear}–${study.timelineEndYear}`;
}

function formatIndicatorValue(indicator: CountryIndicator): string {
  if (indicator.unit === "USD" || indicator.unit === "US$") {
    return `US$ ${indicator.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
  }
  if (indicator.unit === "%") {
    return `${indicator.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }
  return `${indicator.value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${indicator.unit}`.trim();
}

export function collectStudyPrimarySources(study: StudyRecord): PrimarySourceEntry[] {
  const byKey = new Map<string, PrimarySourceEntry>();
  const add = (source: string, url: string) => {
    const label = source.trim();
    if (!label) return;
    const key = `${label.toLowerCase()}|${url}`;
    if (!byKey.has(key)) {
      byKey.set(key, { source: label, url });
    }
  };

  for (const iso of study.selectedCountryIsos) {
    const country = getCountryData(iso);
    if (!country) continue;
    for (const ind of country.indicators) {
      add(
        `${ind.sourcePrimary} (${ind.indicatorCode})`,
        ind.sourceUrl || getSourceUrl(ind.sourcePrimary, ind.indicatorCode)
      );
    }
  }

  add("Natural Earth — Fronteiras Políticas 1:110m", "https://www.naturalearthdata.com/");
  add("Banco Mundial — World Development Indicators", "https://data.worldbank.org/");
  if (study.isCosmicMode) {
    add("NASA JPL / IAU — Efemérides e Parâmetros Planetários", "https://ssd.jpl.nasa.gov/");
  }

  return Array.from(byKey.values());
}

export function buildSafeExportFilename(slug: string, ext: "md" | "json"): string {
  const safe = (slug || "estudo")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `telluspedia-${safe || "estudo"}.${ext}`;
}

export function buildStudyCitations(study: StudyRecord, options: StudyExportOptions = {}) {
  const origin = normalizeOrigin(options.origin);
  const url = `${origin}/study/${encodeURIComponent(study.id)}`;
  const accessDate = options.accessDate ?? new Date();
  const createdYear = new Date(study.createdAt).getUTCFullYear();
  const publicationYear = Number.isFinite(createdYear) ? createdYear : accessDate.getUTCFullYear();
  const countryNames = study.selectedCountryIsos
    .map((iso) => getCountryData(iso)?.nameCommon ?? iso)
    .slice(0, 4);

  const citationParams = {
    title: study.title,
    countryName: countryNames.length > 0 ? countryNames.join(", ") : "Estudo Planetário",
    url,
    accessDate,
    publicationYear,
  };

  return {
    url,
    abnt: formatABNT(citationParams),
    apa: formatAPA(citationParams),
  };
}

export function buildStudyAcademicMarkdown(
  study: StudyRecord,
  options: StudyExportOptions = {}
): string {
  const origin = normalizeOrigin(options.origin);
  const { url, abnt, apa } = buildStudyCitations(study, options);
  const sources = collectStudyPrimarySources(study);
  const lineage = options.lineage;
  const eraLabel =
    study.historicalEra && Object.hasOwn(HISTORICAL_ERAS, study.historicalEra)
      ? HISTORICAL_ERAS[study.historicalEra as HistoricalEraId].label
      : study.historicalEra || "Contemporâneo";

  const lines: string[] = [
    `# ${study.title}`,
    "",
    "> Snapshot imutável exportado do **TellusPedia** (RN16 — rastreabilidade de fontes e linhagem de forks).",
    "",
    "## Metadados do Estudo",
    "",
    `- **ID imutável:** \`${study.id}\``,
    `- **Link permanente:** ${url}`,
    `- **Criado em:** ${study.createdAt}`,
    `- **Período analisado:** ${formatPeriod(study)}`,
    `- **Era histórica:** ${eraLabel}`,
    `- **Modo de visualização:** ${study.isCosmicMode ? `Cósmico / Sistema Solar${study.focusedCelestialBody ? ` (foco: ${study.focusedCelestialBody})` : ""}` : "Globo Terrestre 3D"}`,
    `- **Coordenadas da câmera:** (${study.cameraLat.toFixed(2)}°, ${study.cameraLng.toFixed(2)}°, altitude ${study.cameraAltitude.toFixed(2)})`,
  ];

  if (study.activeObservatoryLayers && study.activeObservatoryLayers.length > 0) {
    lines.push(`- **Camadas do Observatório:** ${study.activeObservatoryLayers.join(", ")}`);
  }
  if (study.activeCosmicLayers && study.activeCosmicLayers.length > 0) {
    lines.push(`- **Camadas Cósmicas:** ${study.activeCosmicLayers.join(", ")}`);
  }

  if (study.parentId || (lineage && (lineage.parent || lineage.forks.length > 0))) {
    lines.push("", "## Linhagem de Forks", "");
    if (lineage?.parent) {
      lines.push(
        `- **Derivado de:** [${lineage.parent.title}](${origin}/study/${encodeURIComponent(lineage.parent.id)}) (\`${lineage.parent.id}\`)`
      );
    } else if (study.parentId) {
      lines.push(
        `- **Derivado de:** [\`${study.parentId}\`](${origin}/study/${encodeURIComponent(study.parentId)})`
      );
    } else {
      lines.push("- **Origem:** Estudo original (raiz)");
    }

    if (lineage && lineage.forks.length > 0) {
      lines.push(`- **Forks derivados (${lineage.forkCount}):**`);
      for (const fork of lineage.forks) {
        lines.push(
          `  - [${fork.title}](${origin}/study/${encodeURIComponent(fork.id)}) (\`${fork.id}\`)`
        );
      }
    }
  }

  if (study.description?.trim()) {
    lines.push("", "## Descrição", "", study.description.trim());
  }

  if (study.markdownNotes?.trim()) {
    lines.push("", "## Anotações Científicas", "", study.markdownNotes.trim());
  }

  if (study.selectedCountryIsos.length > 0) {
    lines.push("", "## Países e Indicadores Auditados", "");
    for (const iso of study.selectedCountryIsos) {
      const country = getCountryData(iso);
      if (!country) {
        lines.push(`### ${iso}`, "", "- Dados detalhados indisponíveis no catálogo local.", "");
        continue;
      }
      lines.push(`### ${country.nameCommon} (${country.isoCode})`, "");
      lines.push(
        `- **Capital:** ${country.capital || "Não informada"} · **Continente:** ${country.continent || "Não informado"}`
      );
      if (country.indicators.length > 0) {
        for (const ind of country.indicators) {
          const indUrl = ind.sourceUrl || getSourceUrl(ind.sourcePrimary, ind.indicatorCode);
          lines.push(
            `- **${ind.indicatorName}** (\`${ind.indicatorCode}\`, ${ind.year}): ${formatIndicatorValue(ind)} — [${ind.sourcePrimary}](${indUrl})`
          );
        }
      } else {
        lines.push("- Sem séries quantitativas publicadas nas fontes auditadas.");
      }
      lines.push("");
    }
  }

  lines.push("## Fontes Primárias (RN02)", "");
  for (const item of sources) {
    lines.push(`- ${item.source}: ${item.url}`);
  }

  lines.push(
    "",
    "## Citações Acadêmicas",
    "",
    "### ABNT (NBR 6023)",
    "",
    abnt,
    "",
    "### APA 7",
    "",
    apa,
    ""
  );

  return lines.join("\n");
}

export function buildStudyPortableJson(
  study: StudyRecord,
  options: StudyExportOptions = {}
): string {
  const { url, abnt, apa } = buildStudyCitations(study, options);
  const sources = collectStudyPrimarySources(study);

  return JSON.stringify(
    {
      schemaVersion: "telluspedia.study.v1",
      exportedAt: (options.accessDate ?? new Date()).toISOString(),
      url,
      study,
      lineage: options.lineage ?? {
        parent: study.parentId ? { id: study.parentId, title: study.parentId, createdAt: "" } : null,
        forks: [],
        forkCount: 0,
      },
      primarySources: sources,
      citations: { abnt, apa },
    },
    null,
    2
  );
}
