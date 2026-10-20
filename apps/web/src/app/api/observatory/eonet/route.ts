import { NextResponse } from "next/server";
import { FALLBACK_EONET_EVENTS, EonetEvent } from "@/lib/observatory-data";

interface CachedEonet {
  data: EonetEvent[];
  cachedAt: number;
}

let eonetCache: CachedEonet | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

export async function GET() {
  const now = Date.now();

  if (eonetCache && now - eonetCache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(eonetCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        "X-Cache": "HIT",
      },
    });
  }

  let fetchedData: EonetEvent[] = FALLBACK_EONET_EVENTS;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const url = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=30";
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.events) && json.events.length > 0) {
        const events: EonetEvent[] = [];
        for (const item of json.events) {
          const geometry = item.geometry?.[item.geometry.length - 1];
          if (geometry?.coordinates && geometry.coordinates.length >= 2) {
            const lng = geometry.coordinates[0];
            const lat = geometry.coordinates[1];
            const catId = item.categories?.[0]?.id || "wildfires";

            let normalizedCategory: EonetEvent["category"] = "wildfires";
            if (catId.toLowerCase().includes("storm")) normalizedCategory = "severeStorms";
            else if (catId.toLowerCase().includes("volcano")) normalizedCategory = "volcanoes";
            else if (catId.toLowerCase().includes("flood")) normalizedCategory = "floods";
            else if (catId.toLowerCase().includes("ice")) normalizedCategory = "seaLakeIce";

            events.push({
              id: item.id || `eonet-${Math.random().toString(36).substring(2, 7)}`,
              title: item.title,
              category: normalizedCategory,
              lat,
              lng,
              date: geometry.date || item.geometry?.[0]?.date || new Date().toISOString(),
              magnitudeValue: geometry.magnitudeValue,
              magnitudeUnit: geometry.magnitudeUnit,
              sources: (item.sources || []).map((s: any) => ({
                id: s.id,
                url: s.url,
              })),
            });
          }
        }
        if (events.length > 0) {
          fetchedData = events;
        }
      }
    }
  } catch {
    fetchedData = FALLBACK_EONET_EVENTS;
  }

  eonetCache = {
    data: fetchedData,
    cachedAt: now,
  };

  return NextResponse.json(fetchedData, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
      "X-Cache": "MISS",
    },
  });
}
