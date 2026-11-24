import { NextRequest, NextResponse } from "next/server";
import { CACHE_POLICY, withCachePolicy } from "@/lib/http-cache";
import type { WeatherData } from "@/lib/api-client";
import { providerMetrics } from "@/lib/provider-metrics";
import { enforceRateLimit } from "@/lib/rate-limit";
import { serverLogger } from "@/lib/server-logger";

const COORDINATE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
const CURRENT_FIELDS = "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m";

function parseCoordinate(raw: string | null, limit: number): number | null {
  const text = raw?.trim();
  if (!text || !COORDINATE.test(text)) return null;

  const value = Number.parseFloat(text);
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function getHandler(req: NextRequest) {
  const limit = await enforceRateLimit("weather", req);
  if (limit.blocked) return limit.blocked;

  const searchParams = req.nextUrl.searchParams;
  const lat = parseCoordinate(searchParams.get("lat"), 90);
  const lng = parseCoordinate(searchParams.get("lng"), 180);

  if (lat === null || lng === null) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400, headers: limit.headers });
  }

  const pipelineUrl = process.env.DATA_PIPELINE_URL || "http://localhost:8000";
  const pipelineParams = new URLSearchParams({ lat: String(lat), lng: String(lng) });
  const startedAt = performance.now();

  // Try Python data-pipeline first.
  try {
    const pipelineRes = await fetch(
      `${pipelineUrl}/api/v1/weather?${pipelineParams}`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (pipelineRes.ok) {
      const data = await pipelineRes.json();
      const current = data.current ?? data;
      const cached = typeof data.cached === "boolean" ? data.cached : false;
      providerMetrics.record({
        id: "weather",
        provider: "Data Pipeline (Open-Meteo)",
        mode: "live",
        cacheHit: cached,
        durationMs: cached ? undefined : Math.max(0, Math.round(performance.now() - startedAt)),
      });
      return NextResponse.json(
        {
          temperature: numberOrNull(current.temperature),
          apparent_temperature: numberOrNull(current.apparent_temperature),
          relative_humidity: numberOrNull(current.relative_humidity),
          precipitation: numberOrNull(current.precipitation),
          weather_code: numberOrNull(current.weather_code),
          wind_speed: numberOrNull(current.wind_speed),
          reference_time: numberOrNull(current.reference_time),
          cached: typeof data.cached === "boolean" ? data.cached : undefined,
        } satisfies WeatherData,
        { headers: limit.headers }
      );
    }
  } catch {
    // Pipeline not reachable, fall back to direct Open-Meteo.
  }

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: CURRENT_FIELDS,
      timeformat: "unixtime",
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const raw = await res.json();
    const current = raw?.current ?? {};
    providerMetrics.record({
      id: "weather",
      provider: "Open-Meteo",
      mode: "live",
      cacheHit: false,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    });
    return NextResponse.json(
      {
        temperature: numberOrNull(current.temperature_2m),
        apparent_temperature: numberOrNull(current.apparent_temperature),
        relative_humidity: numberOrNull(current.relative_humidity_2m),
        precipitation: numberOrNull(current.precipitation),
        weather_code: numberOrNull(current.weather_code),
        wind_speed: numberOrNull(current.wind_speed_10m),
        reference_time: numberOrNull(current.time),
      } satisfies WeatherData,
      { headers: limit.headers }
    );
  } catch (error) {
    const durationMs = Math.max(0, Math.round(performance.now() - startedAt));
    providerMetrics.record({
      id: "weather",
      provider: "Open-Meteo",
      mode: "fallback",
      cacheHit: false,
      durationMs,
      reason: "Provedor meteorológico indisponível",
    });
    serverLogger.warn({
      route: "/api/weather",
      provider: "Open-Meteo",
      mode: "fallback",
      durationMs,
      status: 502,
      error,
      message: "Weather fetch failed",
    });
    return NextResponse.json({ error: "Weather fetch failed" }, { status: 502, headers: limit.headers });
  }
}

// T30: Cache-Control coerente (2xx pela política; erros e escrita sem cache).
export const GET = withCachePolicy(getHandler, CACHE_POLICY.weather);
