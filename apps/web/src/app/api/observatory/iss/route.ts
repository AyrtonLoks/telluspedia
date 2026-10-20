import { NextResponse } from "next/server";
import { calculateIssPosition, IssTelemetryData } from "@/lib/observatory-data";

interface CachedIss {
  data: IssTelemetryData;
  cachedAt: number;
}

let issCache: CachedIss | null = null;
const CACHE_TTL_MS = 15 * 1000; // 15 segundos para satélite em tempo real

export async function GET() {
  const now = Date.now();

  if (issCache && now - issCache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(issCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        "X-Cache": "HIT",
      },
    });
  }

  // Base calculada via mecânica orbital estrita
  let telemetry = calculateIssPosition(now);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544", {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const live = await res.json();
      if (typeof live.latitude === "number" && typeof live.longitude === "number") {
        telemetry = {
          ...telemetry,
          latitude: Number(live.latitude.toFixed(4)),
          longitude: Number(live.longitude.toFixed(4)),
          altitudeKm: Number(live.altitude.toFixed(1)),
          velocityKmh: Number(live.velocity.toFixed(0)),
          visibility: live.visibility === "daylight" ? "daylight" : "eclipsed",
          timestamp: live.timestamp ? live.timestamp * 1000 : now,
        };
      }
    }
  } catch {
    // Mantém a telemetria analítica precisa de calculateIssPosition()
  }

  issCache = {
    data: telemetry,
    cachedAt: now,
  };

  return NextResponse.json(telemetry, {
    headers: {
      "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      "X-Cache": "MISS",
    },
  });
}
