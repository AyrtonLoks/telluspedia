import { NextRequest, NextResponse } from "next/server";
import { observatoryHeaders } from "@/lib/observatory-source";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getSeismicSource } from "@/lib/seismic-source";
import {
  DEFAULT_SEISMIC_MIN_MAGNITUDE,
  DEFAULT_SEISMIC_WINDOW,
  isSeismicMinMagnitude,
  isSeismicWindow,
} from "@/lib/seismic-types";

export async function GET(request: NextRequest) {
  const limit = await enforceRateLimit("observatory:earthquakes", request);
  if (limit.blocked) return limit.blocked;

  const params = request.nextUrl.searchParams;
  const rawWindow = params.get("window");
  const rawMinMag = params.get("minMag");

  const window = isSeismicWindow(rawWindow) ? rawWindow : DEFAULT_SEISMIC_WINDOW;
  const minMagnitude = isSeismicMinMagnitude(rawMinMag) ? rawMinMag : DEFAULT_SEISMIC_MIN_MAGNITUDE;

  const result = await getSeismicSource(window, minMagnitude).get();
  return NextResponse.json(result.envelope, {
    headers: { ...observatoryHeaders(result), ...limit.headers },
  });
}
