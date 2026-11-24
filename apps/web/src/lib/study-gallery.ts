import type { Prisma } from "@prisma/client";
import { PILOT_COUNTRIES, WORLD_COUNTRIES_CATALOG } from "./country-data";
import { HISTORICAL_ENTITIES, HISTORICAL_ERAS } from "./historical-entities";
import { prisma } from "./prisma";
import { serverLogger } from "./server-logger";
import {
  listMemoryStudies,
  restoreStudyRecord,
  type StudyListItem,
  type StudyRecord,
} from "./studies-store";

export const DEFAULT_STUDIES_PAGE_SIZE = 12;
export const MAX_STUDIES_PAGE_SIZE = 24;
const MAX_SEARCH_LENGTH = 100;
const MAX_PAGE_NUMBER = 1000;

const VALID_ERAS = new Set(Object.keys(HISTORICAL_ERAS));
const VALID_COUNTRIES = new Set([
  ...Object.keys(WORLD_COUNTRIES_CATALOG),
  ...Object.keys(PILOT_COUNTRIES),
  ...Object.keys(HISTORICAL_ENTITIES),
]);

export interface StudyListQuery {
  q: string;
  era: string | null;
  country: string | null;
  cosmic: boolean | null;
  page: number;
  pageSize: number;
}

export interface StudyListResult {
  items: StudyListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    q: string;
    era: string | null;
    country: string | null;
    cosmic: boolean | null;
  };
  persistence: "database" | "memory" | "unavailable";
}

type RawParams = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(params: RawParams, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined;
  }
  const value = params[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function parseStudyListQuery(params: RawParams): StudyListQuery {
  const rawQ = (readParam(params, "q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);
  const rawEra = (readParam(params, "era") ?? "").trim();
  const era = rawEra && VALID_ERAS.has(rawEra) ? rawEra : null;

  const rawCountry = (readParam(params, "country") ?? "").trim().toUpperCase();
  const country = rawCountry && VALID_COUNTRIES.has(rawCountry) ? rawCountry : null;

  const rawCosmic = (readParam(params, "cosmic") ?? "").trim().toLowerCase();
  const cosmic = rawCosmic === "true" ? true : rawCosmic === "false" ? false : null;

  const rawPage = Number.parseInt(readParam(params, "page") ?? "1", 10);
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? Math.min(rawPage, MAX_PAGE_NUMBER) : 1;

  const rawPageSize = Number.parseInt(
    readParam(params, "pageSize") ?? String(DEFAULT_STUDIES_PAGE_SIZE),
    10
  );
  const pageSize =
    Number.isInteger(rawPageSize) && rawPageSize >= 1
      ? Math.min(rawPageSize, MAX_STUDIES_PAGE_SIZE)
      : DEFAULT_STUDIES_PAGE_SIZE;

  return { q: rawQ, era, country, cosmic, page, pageSize };
}

function memoryAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

function matchesFilter(study: StudyRecord, query: StudyListQuery): boolean {
  if (query.q) {
    const needle = query.q.toLowerCase();
    const haystack = `${study.title} ${study.description ?? ""}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  if (query.era && study.historicalEra !== query.era) {
    return false;
  }
  if (query.country && !study.selectedCountryIsos.includes(query.country)) {
    return false;
  }
  if (query.cosmic !== null && Boolean(study.isCosmicMode) !== query.cosmic) {
    return false;
  }
  return true;
}

function listFromMemory(query: StudyListQuery): StudyListResult {
  const all = listMemoryStudies().map((item) => restoreStudyRecord(item));
  const titleById = new Map(all.map((s) => [s.id, s.title]));
  const forkCounts = new Map<string, number>();
  for (const s of all) {
    if (s.parentId) {
      forkCounts.set(s.parentId, (forkCounts.get(s.parentId) ?? 0) + 1);
    }
  }

  const filtered = all.filter((study) => matchesFilter(study, query));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const safePage = Math.min(query.page, totalPages);
  const start = (safePage - 1) * query.pageSize;
  const items: StudyListItem[] = filtered.slice(start, start + query.pageSize).map((study) => ({
    ...study,
    parentTitle: study.parentId ? titleById.get(study.parentId) ?? null : null,
    forkCount: forkCounts.get(study.id) ?? 0,
  }));

  return {
    items,
    pagination: { page: safePage, pageSize: query.pageSize, total, totalPages },
    filters: { q: query.q, era: query.era, country: query.country, cosmic: query.cosmic },
    persistence: "memory",
  };
}

export function buildStudyWhereInput(query: StudyListQuery): Prisma.StudyWhereInput {
  const where: Prisma.StudyWhereInput = {};

  if (query.q) {
    where.OR = [
      { title: { contains: query.q, mode: "insensitive" } },
      { description: { contains: query.q, mode: "insensitive" } },
    ];
  }
  if (query.era) {
    where.historicalEra = query.era;
  }
  if (query.country) {
    where.selectedCountryIsos = { has: query.country };
  }
  if (query.cosmic !== null) {
    where.isCosmicMode = query.cosmic;
  }

  return where;
}

function safeErrorSummary(error: unknown): string {
  if (error instanceof Error) {
    return error.message.split("\n")[0]?.trim() || error.name;
  }
  return String(error);
}

export async function listStudies(query: StudyListQuery): Promise<StudyListResult> {
  const where = buildStudyWhereInput(query);

  try {
    const total = await prisma.study.count({ where });
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const safePage = Math.min(query.page, totalPages);
    const rows = await prisma.study.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        parent: { select: { id: true, title: true } },
        _count: { select: { forks: true } },
      },
    });

    const items: StudyListItem[] = rows.map((row) => ({
      ...restoreStudyRecord(row),
      parentTitle: row.parent?.title ?? null,
      forkCount: row._count.forks,
    }));

    return {
      items,
      pagination: { page: safePage, pageSize: query.pageSize, total, totalPages },
      filters: { q: query.q, era: query.era, country: query.country, cosmic: query.cosmic },
      persistence: "database",
    };
  } catch (error) {
    const reason = safeErrorSummary(error);
    if (!memoryAllowed()) {
      serverLogger.error({
        route: "/api/studies",
        provider: "postgresql",
        status: 503,
        reason,
        message: "Database operation failed",
        meta: { operation: "list" },
      });
      return {
        items: [],
        pagination: { page: query.page, pageSize: query.pageSize, total: 0, totalPages: 1 },
        filters: { q: query.q, era: query.era, country: query.country, cosmic: query.cosmic },
        persistence: "unavailable",
      };
    }

    // Em dev, evitar console.error no Server Component (dispara o overlay de erro do Next.js 15).
    serverLogger.warn({
      route: "/api/studies",
      provider: "memory-store",
      mode: "fallback",
      reason,
      message: "Using temporary in-memory storage",
      meta: { operation: "list" },
    });
    return listFromMemory(query);
  }
}

export function buildStudiesGalleryHref(
  filters: Partial<StudyListQuery> & { page?: number }
): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.era) params.set("era", filters.era);
  if (filters.country) params.set("country", filters.country);
  if (filters.cosmic === true) params.set("cosmic", "true");
  if (filters.cosmic === false) params.set("cosmic", "false");
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const qs = params.toString();
  return qs ? `/studies?${qs}` : "/studies";
}
