import { NextResponse } from "next/server";
import { FALLBACK_FIRMS_HOTSPOTS, FirmsHotspot } from "@/lib/observatory-data";

interface CachedFirms {
  data: FirmsHotspot[];
  cachedAt: number;
}

let firmsCache: CachedFirms | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos

export async function GET() {
  const now = Date.now();

  if (firmsCache && now - firmsCache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(firmsCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        "X-Cache": "HIT",
      },
    });
  }

  // Tentativa de ingestão externa com fallback resiliente
  let fetchedData: FirmsHotspot[] = FALLBACK_FIRMS_HOTSPOTS;

  try {
    const apiKey = process.env.NASA_FIRMS_MAP_KEY;
    if (apiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/world/1`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const csvText = await res.text();
        const lines = csvText.trim().split("\n");
        if (lines.length > 1) {
          const parsed: FirmsHotspot[] = [];
          for (let i = 1; i < Math.min(lines.length, 250); i++) {
            const cols = lines[i].split(",");
            if (cols.length >= 9) {
              const lat = parseFloat(cols[0]);
              const lng = parseFloat(cols[1]);
              const brightness = parseFloat(cols[2]);
              const frp = parseFloat(cols[10] || cols[4] || "50");
              if (!isNaN(lat) && !isNaN(lng)) {
                parsed.push({
                  id: `firms-live-${i}`,
                  lat,
                  lng,
                  brightness: isNaN(brightness) ? 350 : brightness,
                  frp: isNaN(frp) ? 80 : frp,
                  confidence: "high",
                  satellite: "VIIRS",
                  acqDate: cols[5] || new Date().toISOString().split("T")[0],
                });
              }
            }
          }
          if (parsed.length > 0) {
            fetchedData = parsed;
          }
        }
      }
    }
  } catch {
    // Graceful fallback to verified scientific dataset
    fetchedData = FALLBACK_FIRMS_HOTSPOTS;
  }

  firmsCache = {
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
