/**
 * Identificadores e instantes UTC exatos de máximo eclipse (NASA GSFC Five Millennium Canon).
 * Módulo mínimo sem dependências pesadas para consumo seguro em `cosmicStore.ts` e `useSunDirection.ts` (T25/T35).
 */

export const ECLIPSE_IDS = [
  "sobral-1919",
  "north-america-2024",
  "blood-moon-2025",
  "arctic-spain-2026",
  "luxor-2027",
] as const;

export type EclipseId = (typeof ECLIPSE_IDS)[number];

export type EclipseKind = "solar_total" | "lunar_total";

export const ECLIPSE_GREATEST_UTC_ISO: Readonly<Record<EclipseId, string>> = {
  "sobral-1919": "1919-05-29T13:08:55Z",
  "north-america-2024": "2024-04-08T18:18:29Z",
  "blood-moon-2025": "2025-03-14T06:58:45Z",
  "arctic-spain-2026": "2026-08-12T17:47:06Z",
  "luxor-2027": "2027-08-02T10:07:50Z",
};

export const ECLIPSE_KIND_BY_ID: Readonly<Record<EclipseId, EclipseKind>> = {
  "sobral-1919": "solar_total",
  "north-america-2024": "solar_total",
  "blood-moon-2025": "lunar_total",
  "arctic-spain-2026": "solar_total",
  "luxor-2027": "solar_total",
};

export const ECLIPSE_YEAR_BY_ID: Readonly<Record<EclipseId, number>> = {
  "sobral-1919": 1919,
  "north-america-2024": 2024,
  "blood-moon-2025": 2025,
  "arctic-spain-2026": 2026,
  "luxor-2027": 2027,
};

export const MAX_ECLIPSE_OFFSET_MINUTES = 120;

export function isEclipseId(value: unknown): value is EclipseId {
  return typeof value === "string" && (ECLIPSE_IDS as readonly string[]).includes(value);
}

export function clampEclipseOffsetMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return 0;
  return Math.max(-MAX_ECLIPSE_OFFSET_MINUTES, Math.min(MAX_ECLIPSE_OFFSET_MINUTES, minutes));
}

export function resolveEclipseTargetDate(eclipseId: EclipseId, offsetMinutes = 0): Date {
  const baseMs = Date.parse(ECLIPSE_GREATEST_UTC_ISO[eclipseId]);
  const safeOffsetMs = clampEclipseOffsetMinutes(offsetMinutes) * 60_000;
  return new Date(baseMs + safeOffsetMs);
}
