import { NextResponse } from "next/server";
import {
  FALLBACK_AIRCRAFT_FLEET,
  FALLBACK_MARITIME_ROUTES,
  AircraftState,
  MaritimeRoute,
} from "@/lib/observatory-data";

interface CachedTraffic {
  aircraft: AircraftState[];
  maritimeRoutes: MaritimeRoute[];
  cachedAt: number;
}

let trafficCache: CachedTraffic | null = null;
const CACHE_TTL_MS = 120 * 1000; // 2 minutos

export async function GET() {
  const now = Date.now();

  if (trafficCache && now - trafficCache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(
      {
        aircraft: trafficCache.aircraft,
        maritimeRoutes: trafficCache.maritimeRoutes,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
          "X-Cache": "HIT",
        },
      }
    );
  }

  let aircraftFleet: AircraftState[] = FALLBACK_AIRCRAFT_FLEET;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // Consulta anônima restrita à área do Atlântico Norte e Europa Central
    const res = await fetch(
      "https://opensky-network.org/api/states/all?lamin=10&lomin=-80&lamax=60&lomax=20",
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json?.states) && json.states.length > 0) {
        const liveAircraft: AircraftState[] = [];
        for (const s of json.states.slice(0, 80)) {
          const icao24 = s[0];
          const callsign = (s[1] || "").trim();
          const originCountry = s[2] || "Internacional";
          const lng = s[5];
          const lat = s[6];
          const altitudeMeters = s[7] || s[13] || 10000;
          const velocityMs = s[9] || 240;
          const headingDeg = s[10] || 0;

          if (
            typeof lat === "number" &&
            typeof lng === "number" &&
            !isNaN(lat) &&
            !isNaN(lng)
          ) {
            liveAircraft.push({
              icao24,
              callsign: callsign || `FLIGHT-${icao24}`,
              originCountry,
              lat,
              lng,
              altitudeMeters: Math.round(altitudeMeters),
              velocityMs: Math.round(velocityMs),
              headingDeg: Math.round(headingDeg),
            });
          }
        }

        if (liveAircraft.length >= 10) {
          aircraftFleet = liveAircraft;
        }
      }
    }
  } catch {
    aircraftFleet = FALLBACK_AIRCRAFT_FLEET;
  }

  trafficCache = {
    aircraft: aircraftFleet,
    maritimeRoutes: FALLBACK_MARITIME_ROUTES,
    cachedAt: now,
  };

  return NextResponse.json(
    {
      aircraft: aircraftFleet,
      maritimeRoutes: FALLBACK_MARITIME_ROUTES,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=120, stale-while-revalidate=240",
        "X-Cache": "MISS",
      },
    }
  );
}
