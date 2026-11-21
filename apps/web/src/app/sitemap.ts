import type { MetadataRoute } from "next";
import { WORLD_BANK_METADATA, WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";
import { getPublishedDossierSlugs } from "@/lib/dossiers-catalog";
import { getSiteOrigin } from "@/lib/seo";

function parseSnapshotDate(raw?: string): Date {
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date("2026-11-21T00:00:00.000Z");
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin();
  const lastModified = parseSnapshotDate(WORLD_BANK_METADATA?.generatedAt);

  const coreRoutes: MetadataRoute.Sitemap = [
    {
      url: `${origin}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${origin}/compare`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${origin}/telluslab`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  const countryRoutes: MetadataRoute.Sitemap = Object.keys(WORLD_COUNTRIES_CATALOG)
    .sort()
    .map((iso) => ({
      url: `${origin}/pais/${encodeURIComponent(iso)}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  const dossierRoutes: MetadataRoute.Sitemap = getPublishedDossierSlugs()
    .sort()
    .map((slug) => ({
      url: `${origin}/dossies/${encodeURIComponent(slug)}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  return [...coreRoutes, ...countryRoutes, ...dossierRoutes];
}
