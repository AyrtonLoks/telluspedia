import type { CelestialBodyId } from "@/lib/astronomy-planets";
import { CURRENT_YEAR } from "@/lib/timeline/current-year";
import { ALL_CATEGORIES, type MilestoneCategoryType } from "@/stores/timelineStore";

export const COSMOS_MIN_YEAR = -3000;
export const COSMOS_MAX_YEAR = 3000;
export const TIMELINE_MIN_YEAR = -3000;
export const TIMELINE_MAX_YEAR = 3000;

export const VALID_CELESTIAL_BODIES: ReadonlySet<CelestialBodyId> = new Set<CelestialBodyId>([
  "SUN",
  "MERCURY",
  "VENUS",
  "EARTH",
  "MARS",
  "JUPITER",
  "SATURN",
  "URANUS",
  "NEPTUNE",
  "PLUTO",
  "MOON",
  "HALLEY",
]);

const VALID_TIMELINE_CATEGORIES: ReadonlySet<MilestoneCategoryType> = new Set<MilestoneCategoryType>(
  ALL_CATEGORIES
);

// Matches strict finite decimal or scientific-notation numbers without trailing garbage
const STRICT_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const STRICT_INTEGER_RE = /^[+-]?\d+$/;

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function parseCosmosYear(
  raw: string | null,
  fallbackYear: number = new Date().getUTCFullYear()
): ValidationResult<number> {
  if (raw === null) {
    const rounded = Math.round(fallbackYear * 100) / 100;
    return { ok: true, value: rounded === 0 ? 0 : rounded };
  }

  const trimmed = raw.trim();
  if (!trimmed || !STRICT_NUMBER_RE.test(trimmed)) {
    return {
      ok: false,
      error: `Invalid 'year' parameter. Expected a finite number between ${COSMOS_MIN_YEAR} and ${COSMOS_MAX_YEAR}.`,
    };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < COSMOS_MIN_YEAR || parsed > COSMOS_MAX_YEAR) {
    return {
      ok: false,
      error: `Invalid 'year' parameter. Must be between ${COSMOS_MIN_YEAR} and ${COSMOS_MAX_YEAR}.`,
    };
  }

  const rounded = Math.round(parsed * 100) / 100;
  return { ok: true, value: rounded === 0 ? 0 : rounded };
}

export function parseCosmosBody(
  raw: string | null
): ValidationResult<CelestialBodyId | undefined> {
  if (raw === null) {
    return { ok: true, value: undefined };
  }

  const normalized = raw.trim().toUpperCase();
  if (!normalized || !VALID_CELESTIAL_BODIES.has(normalized as CelestialBodyId)) {
    return {
      ok: false,
      error: "Invalid 'body' parameter. Expected a valid celestial body identifier.",
    };
  }

  return { ok: true, value: normalized as CelestialBodyId };
}

export interface TimelineQueryParams {
  startYear: number;
  endYear: number;
  categories: MilestoneCategoryType[] | null;
}

function parseTimelineYear(
  raw: string | null,
  fallback: number,
  name: string
): ValidationResult<number> {
  if (raw === null) {
    return { ok: true, value: fallback };
  }

  const trimmed = raw.trim();
  if (!trimmed || !STRICT_INTEGER_RE.test(trimmed)) {
    return {
      ok: false,
      error: `Invalid '${name}' parameter. Expected an integer between ${TIMELINE_MIN_YEAR} and ${TIMELINE_MAX_YEAR}.`,
    };
  }

  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < TIMELINE_MIN_YEAR || parsed > TIMELINE_MAX_YEAR) {
    return {
      ok: false,
      error: `Invalid '${name}' parameter. Must be an integer between ${TIMELINE_MIN_YEAR} and ${TIMELINE_MAX_YEAR}.`,
    };
  }

  return { ok: true, value: parsed };
}

export function parseTimelineQuery(
  searchParams: URLSearchParams
): ValidationResult<TimelineQueryParams> {
  const startResult = parseTimelineYear(searchParams.get("startYear"), 1900, "startYear");
  if (!startResult.ok) return startResult;

  const endResult = parseTimelineYear(searchParams.get("endYear"), CURRENT_YEAR, "endYear");
  if (!endResult.ok) return endResult;

  if (startResult.value > endResult.value) {
    return {
      ok: false,
      error: "Invalid year range: 'startYear' must be less than or equal to 'endYear'.",
    };
  }

  const categoriesRaw = searchParams.get("categories");
  if (categoriesRaw === null) {
    return {
      ok: true,
      value: {
        startYear: startResult.value,
        endYear: endResult.value,
        categories: null,
      },
    };
  }

  const trimmed = categoriesRaw.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: "Invalid 'categories' parameter. Must contain at least one valid category.",
    };
  }

  const tokens = trimmed.split(",");
  const deduped = new Set<MilestoneCategoryType>();
  for (const token of tokens) {
    const normalized = token.trim().toUpperCase();
    if (!normalized || !VALID_TIMELINE_CATEGORIES.has(normalized as MilestoneCategoryType)) {
      return {
        ok: false,
        error: "Invalid 'categories' parameter. Contains an unsupported milestone category.",
      };
    }
    deduped.add(normalized as MilestoneCategoryType);
  }

  return {
    ok: true,
    value: {
      startYear: startResult.value,
      endYear: endResult.value,
      categories: Array.from(deduped),
    },
  };
}
