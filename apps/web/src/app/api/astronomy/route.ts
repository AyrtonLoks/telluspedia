import { NextRequest, NextResponse } from "next/server";
import { CACHE_POLICY, withCachePolicy } from "@/lib/http-cache";
import { calculateSubsolarPoint, getSunDirectionVector } from "@/lib/astronomy";

async function getHandler(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const dtStr = searchParams.get("dt");
  const date = dtStr ? new Date(dtStr) : new Date();

  const subsolar = calculateSubsolarPoint(date);
  const sunDir = getSunDirectionVector(subsolar.latitude, subsolar.longitude);

  return NextResponse.json({
    subsolar_latitude: subsolar.latitude,
    subsolar_longitude: subsolar.longitude,
    timestamp: subsolar.timestamp,
    sun_direction: [sunDir.x, sunDir.y, sunDir.z],
  });
}

// T30: Cache-Control coerente (2xx pela política; erros e escrita sem cache).
export const GET = withCachePolicy(getHandler, (req: NextRequest) => (req.nextUrl.searchParams.get("dt") ? CACHE_POLICY.astronomyAt : CACHE_POLICY.astronomyNow));
