import type { CountryData } from "@/lib/country-data";
import type { PublishedDossier } from "@/lib/dossiers-catalog";

const DEFAULT_SITE_ORIGIN = "http://localhost:3000";

export function getSiteOrigin(rawUrl = process.env.NEXT_PUBLIC_APP_URL): string {
  const candidate = rawUrl?.trim();
  if (!candidate) return DEFAULT_SITE_ORIGIN;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return DEFAULT_SITE_ORIGIN;
    }
    return parsed.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

/**
 * Serializa objetos JSON-LD escapando caracteres que poderiam fechar a tag `<script>`
 * ou injetar HTML/JS (`<`, `>`, `&`, U+2028, U+2029).
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function buildWebApplicationJsonLd(origin = getSiteOrigin()): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "TellusPedia",
    alternateName: "TellusPedia — Enciclopédia Geopolítica e Observatório Planetário",
    url: origin,
    description:
      "Enciclopédia geopolítica e observatório planetário em 3D com efemérides solares reais, linha do tempo histórica, comparador de 177 países e citações acadêmicas padronizadas.",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Any",
    inLanguage: "pt-BR",
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BRL",
    },
  };
}

export function buildCountryJsonLd(
  country: CountryData,
  origin = getSiteOrigin()
): Record<string, unknown> {
  const url = `${origin}/pais/${encodeURIComponent(country.isoCode)}`;
  const additionalProperty: Array<Record<string, unknown>> = [];

  if (country.capital) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "Capital",
      value: country.capital,
    });
  }
  if (country.continent) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "Continente",
      value: country.continent,
    });
  }
  if (typeof country.population === "number" && country.population > 0) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "População",
      value: country.population,
      unitText: "habitantes",
    });
  }
  if (typeof country.areaKm2 === "number" && country.areaKm2 > 0) {
    additionalProperty.push({
      "@type": "PropertyValue",
      name: "Área",
      value: country.areaKm2,
      unitCode: "KMK",
    });
  }

  const descriptionParts = [
    country.nameOfficial && country.nameOfficial !== country.nameCommon ? country.nameOfficial : null,
    country.capital ? `Capital: ${country.capital}` : null,
    country.continent,
  ].filter(Boolean);

  return {
    "@context": "https://schema.org",
    "@type": ["Country", "Place"],
    name: country.nameCommon,
    ...(country.nameOfficial && country.nameOfficial !== country.nameCommon
      ? { alternateName: country.nameOfficial }
      : {}),
    identifier: country.isoCode,
    url,
    inLanguage: "pt-BR",
    description:
      country.summary?.trim() ||
      (descriptionParts.length > 0
        ? `${descriptionParts.join(" · ")}. Dados geopolíticos e indicadores auditados na TellusPedia.`
        : `Perfil geopolítico e histórico de ${country.nameCommon} (${country.isoCode}) na TellusPedia.`),
    ...(Number.isFinite(country.latitude) && Number.isFinite(country.longitude)
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: country.latitude,
            longitude: country.longitude,
          },
        }
      : {}),
    ...(additionalProperty.length > 0 ? { additionalProperty } : {}),
    isPartOf: {
      "@type": "WebSite",
      name: "TellusPedia",
      url: origin,
    },
  };
}

export function buildDossierArticleJsonLd(
  dossier: PublishedDossier,
  origin = getSiteOrigin()
): Record<string, unknown> {
  const url = `${origin}/dossies/${encodeURIComponent(dossier.slug)}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: dossier.title,
    description: dossier.introduction,
    url,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    inLanguage: "pt-BR",
    publisher: {
      "@type": "Organization",
      name: "TellusPedia",
      url: origin,
    },
    isPartOf: {
      "@type": "WebSite",
      name: "TellusPedia",
      url: origin,
    },
  };
}
