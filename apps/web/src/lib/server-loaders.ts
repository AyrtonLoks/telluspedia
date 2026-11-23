import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { prisma } from "./prisma";
import {
  getMemoryStudyLineage,
  restoreStudyRecord,
  type StudyLineageInfo,
  type StudyRecord,
} from "./studies-store";
import { readDevelopmentStudy } from "./study-persistence";
import { getCountryData, type CountryData } from "./country-data";
import { formatCountryName } from "./i18n/format";
import type { Locale } from "./i18n/types";

const MAX_COMPARE_COUNTRIES = 4;
const SAFE_FLAG_FILENAME = /^[a-z0-9_-]+\.svg$/i;

function safeDbErrorSummary(error: unknown): string {
  if (error instanceof Error) {
    return error.message.split("\n")[0]?.trim() || error.name;
  }
  return String(error);
}

function logStudyDatabaseReadFailure(scope: string, slug: string, error: unknown): void {
  const reason = safeDbErrorSummary(error);
  if (process.env.NODE_ENV === "production") {
    console.error(`[ssr/study] Failed to load ${scope} from database`, { slug, reason });
    return;
  }
  // Em dev, evita console.error em Server Components para não disparar o overlay do Next.js 15
  // quando o fallback em memória está ativo sem PostgreSQL local.
  console.warn(`[ssr/study] Database unavailable in development (${scope}); falling back to memory`, {
    slug,
    reason,
  });
}

/**
 * Loads an immutable study snapshot on the server by its slug/ID.
 * Uses PostgreSQL (Prisma) first and only falls back to development memory storage
 * when `NODE_ENV !== "production"` (preserving T08 persistence semantics).
 */
export async function loadStudyBySlug(slug: string): Promise<StudyRecord | null> {
  const cleanSlug = (slug || "").trim();
  if (!cleanSlug || cleanSlug.length > 128) return null;

  try {
    const study = await prisma.study.findUnique({
      where: { id: cleanSlug },
    });
    if (study) {
      return restoreStudyRecord(study);
    }
  } catch (error) {
    logStudyDatabaseReadFailure("study", cleanSlug, error);
  }

  const devStudy = readDevelopmentStudy(cleanSlug, "read");
  return devStudy ? restoreStudyRecord(devStudy) : null;
}

export interface LoadedStudyWithLineage {
  study: StudyRecord;
  lineage: StudyLineageInfo;
}

/**
 * Loads an immutable study together with its parent reference and direct forks (`parentId`).
 * Preserves T08 semantics (PostgreSQL first, development memory fallback only when NODE_ENV !== "production").
 */
export async function loadStudyWithLineage(slug: string): Promise<LoadedStudyWithLineage | null> {
  const cleanSlug = (slug || "").trim();
  if (!cleanSlug || cleanSlug.length > 128) return null;

  try {
    const row = await prisma.study.findUnique({
      where: { id: cleanSlug },
      include: {
        parent: { select: { id: true, title: true, createdAt: true } },
        forks: {
          select: { id: true, title: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        _count: { select: { forks: true } },
      },
    });
    if (row) {
      return {
        study: restoreStudyRecord(row),
        lineage: {
          parent: row.parent
            ? {
                id: row.parent.id,
                title: row.parent.title,
                createdAt: row.parent.createdAt.toISOString(),
              }
            : null,
          forks: row.forks.map((fork) => ({
            id: fork.id,
            title: fork.title,
            createdAt: fork.createdAt.toISOString(),
          })),
          forkCount: row._count.forks,
        },
      };
    }
  } catch (error) {
    logStudyDatabaseReadFailure("study lineage", cleanSlug, error);
  }

  const devStudy = readDevelopmentStudy(cleanSlug, "read");
  if (!devStudy) return null;
  return {
    study: restoreStudyRecord(devStudy),
    lineage: getMemoryStudyLineage(cleanSlug),
  };
}

/**
 * Loads canonical country or historical-entity data on the server by ISO code.
 * Returns `null` for unknown or malformed codes so callers can invoke `notFound()`.
 */
export function loadCountryByIso(iso: string): CountryData | null {
  const cleanIso = (iso || "").trim().toUpperCase();
  if (!cleanIso || !/^[A-Z0-9_-]{2,24}$/.test(cleanIso)) return null;
  return getCountryData(cleanIso);
}

/**
 * Parses and validates up to 4 country ISO codes from `/compare?c=BRA,DEU,...`.
 */
export function parseCompareIsos(raw?: string | string[]): string[] {
  const joined = Array.isArray(raw) ? raw.join(",") : raw ?? "";
  if (!joined.trim()) return [];

  const seen = new Set<string>();
  const valid: string[] = [];

  for (const token of joined.split(",")) {
    const country = loadCountryByIso(token);
    if (!country) continue;
    if (seen.has(country.isoCode)) continue;
    seen.add(country.isoCode);
    valid.push(country.isoCode);
    if (valid.length >= MAX_COMPARE_COUNTRIES) break;
  }

  return valid;
}

/**
 * Safely reads a local SVG flag from `public/flags/` and returns a base64 data URI
 * suitable for Next.js `ImageResponse` Open Graph cards.
 */
export function readFlagDataUri(flagSvgUrl?: string | null): string | null {
  if (!flagSvgUrl || !flagSvgUrl.startsWith("/flags/")) return null;
  const filename = path.basename(flagSvgUrl);
  if (!SAFE_FLAG_FILENAME.test(filename)) return null;

  const candidateDirs = [
    path.resolve(process.cwd(), "public/flags"),
    path.resolve(process.cwd(), "apps/web/public/flags"),
  ];

  for (const flagsDir of candidateDirs) {
    const targetPath = path.resolve(flagsDir, filename);
    if (!targetPath.startsWith(flagsDir + path.sep)) continue;
    if (fs.existsSync(targetPath)) {
      const svg = fs.readFileSync(targetPath, "utf-8");
      return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
    }
  }

  return null;
}

export function formatStudyPeriod(
  study: Pick<StudyRecord, "timelineStartYear" | "timelineEndYear" | "geologicalMa">,
  locale: Locale = "pt-BR"
): string {
  if (typeof study.geologicalMa === "number" && study.geologicalMa > 0) {
    return locale === "en"
      ? `${study.geologicalMa} Ma (Geological Era)`
      : `${study.geologicalMa} Ma (Era Geológica)`;
  }
  if (study.timelineStartYear === study.timelineEndYear) {
    return String(study.timelineStartYear);
  }
  return `${study.timelineStartYear}–${study.timelineEndYear}`;
}

export function buildRootMetadata(locale: Locale = "pt-BR", appUrl = "http://localhost:3000"): Metadata {
  const isEn = locale === "en";
  const title = isEn
    ? "TellusPedia — Geopolitical Encyclopedia & Planetary Observatory"
    : "TellusPedia — Enciclopédia Geopolítica e Observatório Planetário";
  const description = isEn
    ? "High-density encyclopedia combining a real-time 3D globe with NOAA solar ephemerides, semantic timeline, multidimensional country comparator, and standardized academic citations."
    : "Enciclopédia de alta densidade integrando globo 3D em tempo real com efemérides solares NOAA, linha do tempo semântica, comparador multidisciplinar e citações acadêmicas padronizadas.";
  const shortDesc = isEn
    ? "Real-time 3D globe, historical timeline, country comparator, and shareable studies."
    : "Globo 3D em tempo real, linha do tempo histórica, comparador de países e estudos compartilháveis.";

  return {
    metadataBase: new URL(appUrl),
    title,
    description,
    openGraph: {
      title,
      description: shortDesc,
      type: "website",
      locale: isEn ? "en_US" : "pt_BR",
      siteName: "TellusPedia",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: shortDesc,
    },
  };
}

export function buildStudiesMetadata(locale: Locale = "pt-BR"): Metadata {
  const isEn = locale === "en";
  const title = isEn
    ? "Public Studies Gallery — TellusPedia"
    : "Galeria de Estudos Públicos — TellusPedia";
  const description = isEn
    ? "Explore geopolitical, historical, and cosmic studies shared on TellusPedia, filter by era, country, or view mode, browse the fork tree, and export as academic Markdown or JSON."
    : "Explore estudos geopolíticos, históricos e cósmicos compartilhados na TellusPedia, filtre por era, país ou modo de visualização, navegue pela árvore de forks e exporte em Markdown acadêmico ou JSON.";
  const ogDesc = isEn
    ? "Discover immutable studies, fork lineage, and academic export (ABNT/APA) on TellusPedia."
    : "Descoberta de estudos imutáveis, linhagem de forks e exportação acadêmica (ABNT/APA) na TellusPedia.";

  return {
    title,
    description,
    openGraph: {
      title,
      description: ogDesc,
      type: "website",
      locale: isEn ? "en_US" : "pt_BR",
      siteName: "TellusPedia",
      url: "/studies",
    },
  };
}

export function buildStudyMetadata(
  study: StudyRecord | null,
  slug: string,
  locale: Locale = "pt-BR"
): Metadata {
  const isEn = locale === "en";
  if (!study) {
    return {
      title: isEn ? "Study not found — TellusPedia" : "Estudo não encontrado — TellusPedia",
      description: isEn
        ? `The study "${slug}" was not found on TellusPedia.`
        : `O estudo "${slug}" não foi encontrado na TellusPedia.`,
      robots: { index: false, follow: false },
    };
  }

  const period = formatStudyPeriod(study, locale);
  const countryNames = study.selectedCountryIsos
    .map((iso) => {
      const c = loadCountryByIso(iso);
      return c ? formatCountryName(c.iso2, c.nameCommon, locale) : iso;
    })
    .slice(0, 4);

  const fallbackDescription = isEn
    ? countryNames.length > 0
      ? `Immutable geopolitical study (${period}) analyzing ${countryNames.join(", ")} on TellusPedia.`
      : `Immutable geopolitical and historical study (${period}) on TellusPedia.`
    : countryNames.length > 0
      ? `Estudo geopolítico imutável (${period}) analisando ${countryNames.join(", ")} na TellusPedia.`
      : `Estudo geopolítico e histórico imutável (${period}) na TellusPedia.`;

  const description = (study.description?.trim() || fallbackDescription).slice(0, 200);
  const pageTitle = `${study.title} — TellusPedia`;

  return {
    title: pageTitle,
    description,
    openGraph: {
      title: study.title,
      description,
      type: "article",
      locale: isEn ? "en_US" : "pt_BR",
      siteName: "TellusPedia",
      url: `/study/${encodeURIComponent(study.id)}`,
    },
    twitter: {
      card: "summary_large_image",
      title: study.title,
      description,
    },
  };
}

export function buildCountryMetadata(
  country: CountryData | null,
  iso: string,
  locale: Locale = "pt-BR"
): Metadata {
  const isEn = locale === "en";
  if (!country) {
    return {
      title: isEn ? "Country not found — TellusPedia" : "País não encontrado — TellusPedia",
      description: isEn
        ? `No country or historical entity found for code "${iso}".`
        : `Nenhum país ou entidade histórica encontrado para o código "${iso}".`,
      robots: { index: false, follow: false },
    };
  }

  const displayName = formatCountryName(country.iso2, country.nameCommon, locale);
  const details = [
    !isEn && country.nameOfficial && country.nameOfficial !== country.nameCommon
      ? country.nameOfficial
      : null,
    country.capital ? `Capital: ${country.capital}` : null,
    country.continent,
  ].filter(Boolean);

  const fallbackDescription = isEn
    ? details.length > 0
      ? `${details.join(" · ")}. Geopolitical data, historical timeline, and official indicators on TellusPedia.`
      : `Geopolitical and historical profile of ${displayName} (${country.isoCode}) on TellusPedia.`
    : details.length > 0
      ? `${details.join(" · ")}. Dados geopolíticos, linha do tempo histórica e indicadores na TellusPedia.`
      : `Perfil geopolítico e histórico de ${displayName} (${country.isoCode}) na TellusPedia.`;

  const description = (isEn ? fallbackDescription : country.summary?.trim() || fallbackDescription).slice(0, 200);
  const ogTitle = `${displayName} (${country.isoCode}) — TellusPedia`;

  return {
    title: ogTitle,
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      locale: isEn ? "en_US" : "pt_BR",
      siteName: "TellusPedia",
      url: `/pais/${encodeURIComponent(country.isoCode)}`,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export function buildCompareMetadata(isos: string[], locale: Locale = "pt-BR"): Metadata {
  const isEn = locale === "en";
  const names = isos
    .map((iso) => {
      const c = loadCountryByIso(iso);
      return c ? formatCountryName(c.iso2, c.nameCommon, locale) : iso;
    })
    .slice(0, MAX_COMPARE_COUNTRIES);

  const title = isEn
    ? names.length > 0
      ? `Comparator: ${names.join(" vs ")} — TellusPedia`
      : "Multidimensional Country Comparator — TellusPedia"
    : names.length > 0
      ? `Comparador: ${names.join(" vs ")} — TellusPedia`
      : "Comparador Multidisciplinar de Países — TellusPedia";

  const description = isEn
    ? names.length > 0
      ? `Multidimensional comparison of indicators, demographics, and historical timeline between ${names.join(", ")} on TellusPedia.`
      : "Compare up to 4 nations side by side with socioeconomic, demographic indicators, and historical context on TellusPedia."
    : names.length > 0
      ? `Comparação multidimensional de indicadores, demografia e linha do tempo entre ${names.join(", ")} na TellusPedia.`
      : "Compare até 4 nações lado a lado com indicadores socioeconômicos, demográficos e contexto histórico na TellusPedia.";

  const canonicalQuery = isos.length > 0 ? `?c=${encodeURIComponent(isos.join(","))}` : "";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: isEn ? "en_US" : "pt_BR",
      siteName: "TellusPedia",
      url: `/compare${canonicalQuery}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
