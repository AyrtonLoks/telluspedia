import { NextResponse } from "next/server";
import {
  computeAllPlanetaryPositions,
  calculateHalleyPosition,
  ASTROPHYSICAL_CATALOG,
} from "@/lib/astronomy-planets";
import { LruCache } from "@/lib/lru-cache";
import { parseCosmosBody, parseCosmosYear } from "@/lib/cosmos-validation";

const COSMOS_CACHE_MAX_ENTRIES = 500;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL for planetary telemetry

const cache = new LruCache<string, unknown>({
  maxEntries: COSMOS_CACHE_MAX_ENTRIES,
  ttlMs: CACHE_TTL_MS,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const yearResult = parseCosmosYear(searchParams.get("year"));
  if (!yearResult.ok) {
    return NextResponse.json({ error: yearResult.error }, { status: 400 });
  }

  const bodyResult = parseCosmosBody(searchParams.get("body"));
  if (!bodyResult.ok) {
    return NextResponse.json({ error: bodyResult.error }, { status: 400 });
  }

  const year = yearResult.value;
  const body = bodyResult.value;
  const cacheKey = `${year.toFixed(2)}_${body ?? "ALL"}`;

  const now = Date.now();
  const cached = cache.get(cacheKey, now);
  if (cached !== undefined) {
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "X-Cache": "HIT",
      },
    });
  }

  // Analytical computation via Standish/JPL Keplerian mechanics
  const planets = computeAllPlanetaryPositions(year);
  const halley = calculateHalleyPosition(year);

  let responseData: unknown;

  if (body === "HALLEY") {
    responseData = {
      body: "HALLEY",
      year,
      metadata: ASTROPHYSICAL_CATALOG.HALLEY,
      telemetry: halley,
    };
  } else if (body) {
    const isPlanet = Object.prototype.hasOwnProperty.call(planets, body);
    responseData = {
      body,
      year,
      metadata: ASTROPHYSICAL_CATALOG[body],
      telemetry: isPlanet ? planets[body as keyof typeof planets] : null,
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

  cache.set(cacheKey, responseData, now);

  return NextResponse.json(responseData, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Cache": "MISS",
    },
  });
}
