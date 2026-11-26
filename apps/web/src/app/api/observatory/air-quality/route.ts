import { NextRequest, NextResponse } from "next/server";
import {
  getAirQualityPointSource,
  getAirQualityStationsSource,
} from "@/lib/air-quality-source";
import { observatoryHeaders } from "@/lib/observatory-source";
import { enforceRateLimit } from "@/lib/rate-limit";

const COORDINATE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

function parseCoordinate(raw: string | null, bound: number): number | null {
  const text = raw?.trim();
  if (!text || !COORDINATE.test(text)) return null;
  const value = Number.parseFloat(text);
  return Number.isFinite(value) && Math.abs(value) <= bound ? value : null;
}

export async function GET(request: NextRequest) {
  const limit = await enforceRateLimit("observatory:air-quality", request);
  if (limit.blocked) return limit.blocked;

  const params = request.nextUrl.searchParams;
  const hasLat = params.has("lat");
  const hasLng = params.has("lng");

  if (hasLat || hasLng) {
    const lat = parseCoordinate(params.get("lat"), 90);
    const lng = parseCoordinate(params.get("lng"), 180);
    if (lat === null || lng === null) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400, headers: { "Cache-Control": "no-store", ...limit.headers } }
      );
    }
    const pointResult = await getAirQualityPointSource(lat, lng).get();
    return NextResponse.json(pointResult.envelope, {
      headers: { ...observatoryHeaders(pointResult), ...limit.headers },
    });
  }

  const stationsResult = await getAirQualityStationsSource().get();
  return NextResponse.json(stationsResult.envelope, {
    headers: { ...observatoryHeaders(stationsResult), ...limit.headers },
  });
}
