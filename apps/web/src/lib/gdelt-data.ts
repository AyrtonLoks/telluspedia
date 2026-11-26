import type { CountryNewsPayload, GdeltNewsArticle } from "./gdelt-types";

export const GDELT_DOC_API_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";
const MAX_URL_LENGTH = 2048;
const MAX_HEADLINE_LENGTH = 240;

function isIpLiteral(hostname: string): boolean {
  if (hostname.startsWith("[") && hostname.endsWith("]")) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
  if (hostname.includes(":")) return true;
  return false;
}

/**
 * Sanitização estrita de URLs externas de notícias (D38 / mandatory-secure-web-skills):
 * - Exige protocolo `https:` explícito (rejeita `javascript:`, `data:`, `file:`, `http:`).
 * - Proíbe credenciais embutidas (`username` / `password`).
 * - Rejeita `localhost`, domínios internos e endereços IP literais (prevenção de SSRF/open-redirect local).
 * - Exige FQDN público com TLD alfabético de pelo menos 2 caracteres.
 */
export function sanitizeExternalNewsUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;

  const host = parsed.hostname.toLowerCase();
  if (!host || isIpLiteral(host)) return null;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".arpa")
  ) {
    return null;
  }

  const labels = host.split(".");
  if (labels.length < 2) return null;
  const tld = labels[labels.length - 1] ?? "";
  if (!/^[a-z]{2,24}$/.test(tld)) return null;
  if (labels.some((label) => !label || !/^[a-z0-9-]+$/.test(label) || label.startsWith("-") || label.endsWith("-"))) {
    return null;
  }

  parsed.hash = "";
  return parsed.toString();
}

const HTML_ENTITY_MAP: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&quot;": '"',
  "&#34;": '"',
  "&#39;": "'",
  "&#x27;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&ndash;": "–",
  "&mdash;": "—",
};

export function sanitizeHeadlineText(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const withoutTags = raw.replace(/<[^>]*>/g, " ");
  const decoded = withoutTags
    .replace(/&(amp|quot|#34|#39|#x27|apos|lt|gt|nbsp|ndash|mdash);/gi, (match) => {
      return HTML_ENTITY_MAP[match.toLowerCase()] ?? match;
    })
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (decoded.length <= MAX_HEADLINE_LENGTH) return decoded;
  return `${decoded.slice(0, MAX_HEADLINE_LENGTH - 1).trimEnd()}…`;
}

/**
 * Converte `seendate` do GDELT 2.0 (`YYYYMMDDTHHMMSSZ`) ou string ISO 8601 para UTC padronizado.
 */
export function parseGdeltSeenDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const compactMatch = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/i);
  if (compactMatch) {
    const [, y, m, d, hh, mm, ss] = compactMatch;
    const iso = `${y}-${m}-${d}T${hh}:${mm}:${ss}Z`;
    const ts = Date.parse(iso);
    return Number.isFinite(ts) ? new Date(ts).toISOString() : null;
  }

  const ts = Date.parse(trimmed);
  if (!Number.isFinite(ts)) return null;
  return new Date(ts).toISOString();
}

function cleanQueryTerm(term: string): string | null {
  const cleaned = term
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 3) return null;
  // GDELT 2.0 Doc API proíbe aspas em palavras únicas ("Phrases may only contain multiple words.")
  return cleaned.includes(" ") ? `"${cleaned}"` : cleaned;
}

const enRegionNames =
  typeof Intl !== "undefined" && typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export function buildGdeltCountryQuery(
  isoCode: string,
  countryNamePt: string,
  iso2?: string | null,
  naturalEarthName?: string | null
): string {
  const candidates: string[] = [];
  if (iso2 && /^[A-Z]{2}$/i.test(iso2) && enRegionNames) {
    try {
      const enName = enRegionNames.of(iso2.toUpperCase());
      if (enName && enName.toUpperCase() !== iso2.toUpperCase()) {
        candidates.push(enName);
      }
    } catch {
      // Fallback para nomes do catálogo
    }
  }
  if (naturalEarthName) candidates.push(naturalEarthName);
  if (countryNamePt) candidates.push(countryNamePt);

  const seenNormalized = new Set<string>();
  const terms: string[] = [];

  for (const candidate of candidates) {
    const formatted = cleanQueryTerm(candidate);
    if (!formatted) continue;
    const norm = formatted
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    if (seenNormalized.has(norm)) continue;
    seenNormalized.add(norm);
    terms.push(formatted);
    if (terms.length >= 2) break;
  }

  if (terms.length === 0) {
    const fallbackIso = isoCode.replace(/[^A-Z]/gi, "").toUpperCase();
    terms.push(fallbackIso.length >= 3 ? fallbackIso : "World");
  }

  const subjectClause = terms.length === 1 ? terms[0]! : `(${terms.join(" OR ")})`;
  return `${subjectClause} (sourcelang:por OR sourcelang:eng OR sourcelang:spa OR sourcelang:fra)`;
}

export function buildGdeltFeedUrl(query: string, maxRecords = 10): string {
  const params = new URLSearchParams({
    query,
    mode: "ArtList",
    maxrecords: String(Math.max(1, Math.min(25, maxRecords))),
    timespan: "7d",
    sort: "DateDesc",
    format: "json",
  });
  return `${GDELT_DOC_API_ENDPOINT}?${params.toString()}`;
}

export function buildGdeltPortalUrl(countryName: string): string {
  const safe = countryName.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  const params = new URLSearchParams({ query: safe || "world" });
  return `https://api.gdeltproject.org/api/v2/doc/doc?${params.toString()}&mode=ArtList&timespan=7d`;
}

export function buildFallbackCountryNewsPayload(
  isoCode: string,
  countryName: string,
  query: string
): CountryNewsPayload {
  // T03 / D38: NUNCA fabricar manchetes sintéticas quando o provedor estiver indisponível.
  return {
    isoCode,
    countryName,
    query,
    gdeltPortalUrl: buildGdeltPortalUrl(countryName),
    articles: [],
  };
}

export function parseGdeltDocResponse(
  raw: unknown,
  isoCode: string,
  countryName: string,
  query: string,
  limit = 8
): CountryNewsPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Envelope JSON inválido da GDELT 2.0 Doc API");
  }

  const record = raw as { articles?: unknown };
  if (record.articles !== undefined && !Array.isArray(record.articles)) {
    throw new Error("Campo articles malformado na resposta GDELT 2.0");
  }

  const rawArticles = record.articles ?? [];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const articles: GdeltNewsArticle[] = [];

  for (const item of rawArticles) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;

    const safeUrl = sanitizeExternalNewsUrl(entry.url);
    if (!safeUrl || seenUrls.has(safeUrl)) continue;

    const safeTitle = sanitizeHeadlineText(entry.title);
    if (safeTitle.length < 8) continue;

    const titleKey = safeTitle.toLowerCase();
    if (seenTitles.has(titleKey)) continue;

    let domain = "";
    try {
      domain = new URL(safeUrl).hostname.replace(/^www\./i, "").toLowerCase();
    } catch {
      continue;
    }
    if (!domain) continue;

    const seenAt = parseGdeltSeenDate(entry.seendate) ?? new Date().toISOString();
    const language =
      typeof entry.language === "string" && entry.language.trim()
        ? sanitizeHeadlineText(entry.language).slice(0, 32)
        : undefined;
    const sourceCountry =
      typeof entry.sourcecountry === "string" && entry.sourcecountry.trim()
        ? sanitizeHeadlineText(entry.sourcecountry).slice(0, 48)
        : undefined;

    seenUrls.add(safeUrl);
    seenTitles.add(titleKey);

    articles.push({
      id: `gdelt-${isoCode.toLowerCase()}-${articles.length + 1}`,
      title: safeTitle,
      url: safeUrl,
      domain,
      seenAt,
      ...(language ? { language } : {}),
      ...(sourceCountry ? { sourceCountry } : {}),
    });

    if (articles.length >= limit) break;
  }

  articles.sort((a, b) => Date.parse(b.seenAt) - Date.parse(a.seenAt));

  return {
    isoCode,
    countryName,
    query,
    gdeltPortalUrl: buildGdeltPortalUrl(countryName),
    articles,
  };
}
