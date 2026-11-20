import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { prisma } from "./prisma";
import { restoreStudyRecord, type StudyRecord } from "./studies-store";
import { readDevelopmentStudy } from "./study-persistence";
import { getCountryData, type CountryData } from "./country-data";

const MAX_COMPARE_COUNTRIES = 4;
const SAFE_FLAG_FILENAME = /^[a-z0-9_-]+\.svg$/i;

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
    console.error("[ssr/study] Failed to load study from database", { slug: cleanSlug, error });
  }

  const devStudy = readDevelopmentStudy(cleanSlug, "read");
  return devStudy ? restoreStudyRecord(devStudy) : null;
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

export function formatStudyPeriod(study: Pick<StudyRecord, "timelineStartYear" | "timelineEndYear" | "geologicalMa">): string {
  if (typeof study.geologicalMa === "number" && study.geologicalMa > 0) {
    return `${study.geologicalMa} Ma (Era Geológica)`;
  }
  if (study.timelineStartYear === study.timelineEndYear) {
    return String(study.timelineStartYear);
  }
  return `${study.timelineStartYear}–${study.timelineEndYear}`;
}

export function buildStudyMetadata(study: StudyRecord | null, slug: string): Metadata {
  if (!study) {
    return {
      title: "Estudo não encontrado — TellusPedia",
      description: `O estudo "${slug}" não foi encontrado na TellusPedia.`,
      robots: { index: false, follow: false },
    };
  }

  const period = formatStudyPeriod(study);
  const countryNames = study.selectedCountryIsos
    .map((iso) => loadCountryByIso(iso)?.nameCommon ?? iso)
    .slice(0, 4);

  const fallbackDescription =
    countryNames.length > 0
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
      locale: "pt_BR",
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

export function buildCountryMetadata(country: CountryData | null, iso: string): Metadata {
  if (!country) {
    return {
      title: "País não encontrado — TellusPedia",
      description: `Nenhum país ou entidade histórica encontrado para o código "${iso}".`,
      robots: { index: false, follow: false },
    };
  }

  const details = [
    country.nameOfficial && country.nameOfficial !== country.nameCommon ? country.nameOfficial : null,
    country.capital ? `Capital: ${country.capital}` : null,
    country.continent,
  ].filter(Boolean);

  const fallbackDescription =
    details.length > 0
      ? `${details.join(" · ")}. Dados geopolíticos, linha do tempo histórica e indicadores na TellusPedia.`
      : `Perfil geopolítico e histórico de ${country.nameCommon} (${country.isoCode}) na TellusPedia.`;

  const description = (country.summary?.trim() || fallbackDescription).slice(0, 200);
  const ogTitle = `${country.nameCommon} (${country.isoCode}) — TellusPedia`;

  return {
    title: ogTitle,
    description,
    openGraph: {
      title: ogTitle,
      description,
      type: "website",
      locale: "pt_BR",
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

export function buildCompareMetadata(isos: string[]): Metadata {
  const names = isos
    .map((iso) => loadCountryByIso(iso)?.nameCommon ?? iso)
    .slice(0, MAX_COMPARE_COUNTRIES);

  const title =
    names.length > 0
      ? `Comparador: ${names.join(" vs ")} — TellusPedia`
      : "Comparador Multidisciplinar de Países — TellusPedia";

  const description =
    names.length > 0
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
      locale: "pt_BR",
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
