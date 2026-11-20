import { z } from "zod";
import {
  EONET_CATEGORIES,
  observationLocation,
  type EonetCategory,
  type EonetEvent,
  type EonetObservation,
} from "./observatory-data";

const coordinate = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)], z.number());
const observationFields = {
  date: z.string().refine((date) => Number.isFinite(Date.parse(date))),
  magnitudeValue: z.number().nullish(),
  magnitudeUnit: z.string().nullish(),
  magnitudeDescription: z.string().nullish(),
};
const observationSchema = z.union([
  z.object({ ...observationFields, type: z.literal("Point").optional(), coordinates: coordinate }),
  z.object({ ...observationFields, type: z.literal("Polygon"), coordinates: z.array(z.array(coordinate).min(4)).min(1) }),
]);
const eventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  link: z.string().optional(),
  categories: z.array(z.object({ id: z.string() })).optional(),
  geometry: z.array(z.unknown()),
  sources: z.array(z.unknown()).optional(),
});
const sourceSchema = z.object({ id: z.string().min(1), url: z.httpUrl() });

export function normalizeEonetEvents(payload: unknown): EonetEvent[] {
  const response = z.object({ events: z.array(z.unknown()) }).safeParse(payload);
  if (!response.success) return [];

  const events: EonetEvent[] = [];
  for (const raw of response.data.events) {
    const parsed = eventSchema.safeParse(raw);
    if (!parsed.success) continue;
    const item = parsed.data;
    const geometry: EonetObservation[] = [];
    for (const rawObservation of item.geometry) {
      const valid = observationSchema.safeParse(rawObservation);
      if (!valid.success) continue;
      const { magnitudeValue, magnitudeUnit, magnitudeDescription } = valid.data;
      geometry.push({
        ...valid.data,
        magnitudeValue: magnitudeValue ?? undefined,
        magnitudeUnit: magnitudeUnit ?? undefined,
        magnitudeDescription: magnitudeDescription ?? undefined,
        ...(valid.data.type === "Polygon"
          ? { type: "Polygon" as const, coordinates: valid.data.coordinates }
          : { type: "Point" as const, coordinates: valid.data.coordinates }),
      });
    }
    geometry.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const latest = geometry.at(-1);
    if (!latest) continue;
    const position = observationLocation(latest);
    if (!Number.isFinite(position.lat) || !Number.isFinite(position.lng)) continue;

    const rawCategory = item.categories?.[0]?.id ?? "";
    const category = Object.hasOwn(EONET_CATEGORIES, rawCategory) ? rawCategory as EonetCategory : "other";
    const sources = (item.sources ?? []).flatMap((rawSource) => {
      const source = sourceSchema.safeParse(rawSource);
      return source.success ? [source.data] : [];
    });
    const nasa = sourceSchema.safeParse({ id: "NASA EONET", url: item.link });
    if (nasa.success && !sources.some((source) => source.url === nasa.data.url)) sources.push(nasa.data);
    events.push({
      id: item.id, title: item.title, category, ...position, geometry, date: latest.date,
      magnitudeValue: latest.magnitudeValue, magnitudeUnit: latest.magnitudeUnit,
      magnitudeDescription: latest.magnitudeDescription, sources,
    });
  }
  return events;
}
