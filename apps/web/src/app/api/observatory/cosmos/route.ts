import { NextResponse } from "next/server";
import {
  computeAllPlanetaryPositions,
  calculateHalleyPosition,
  ASTROPHYSICAL_CATALOG,
  CelestialBodyId,
} from "@/lib/astronomy-planets";

interface CachedCosmosData {
  timestamp: number;
  data: any;
}

const cache: Map<string, CachedCosmosData> = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL for planetary telemetry

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const bodyParam = searchParams.get("body")?.toUpperCase() as CelestialBodyId | undefined;

  const year = yearParam ? parseFloat(yearParam) : new Date().getUTCFullYear();
  const cacheKey = `${year}_${bodyParam || "ALL"}`;

  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Cache": "HIT",
      },
    });
  }

  // Analytical computation via Standish/JPL Keplerian mechanics
  const planets = computeAllPlanetaryPositions(year);
  const halley = calculateHalleyPosition(year);

  let responseData: any;

  if (bodyParam && bodyParam === "HALLEY") {
    responseData = {
      body: "HALLEY",
      year,
      metadata: ASTROPHYSICAL_CATALOG.HALLEY,
      telemetry: halley,
    };
  } else if (bodyParam && bodyParam in ASTROPHYSICAL_CATALOG) {
    const isPlanet = bodyParam in planets;
    responseData = {
      body: bodyParam,
      year,
      metadata: ASTROPHYSICAL_CATALOG[bodyParam],
      telemetry: isPlanet ? (planets as any)[bodyParam] : null,
    };
  } else {
    responseData = {
      year,
      planets,
      halley,
      metadata: ASTROPHYSICAL_CATALOG,
      source: "NASA JPL / Standish Analytical Ephemerides",
      citation: "E.M. Standish (JPL/Caltech) Planetary Keplerian Elements",
    };
  }

  cache.set(cacheKey, {
    timestamp: now,
    data: responseData,
  });

  return NextResponse.json(responseData, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Cache": "MISS",
    },
  });
}
