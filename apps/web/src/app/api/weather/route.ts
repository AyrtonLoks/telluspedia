import { NextRequest, NextResponse } from "next/server";
import type { WeatherData } from "@/lib/api-client";

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

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const lat = parseCoordinate(searchParams.get("lat"), 90);
  const lng = parseCoordinate(searchParams.get("lng"), 180);

  if (lat === null || lng === null) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }

  const pipelineUrl = process.env.DATA_PIPELINE_URL || "http://localhost:8000";
  const pipelineParams = new URLSearchParams({ lat: String(lat), lng: String(lng) });

  // Try Python data-pipeline first.
  try {
    const pipelineRes = await fetch(
      `${pipelineUrl}/api/v1/weather?${pipelineParams}`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (pipelineRes.ok) {
      const data = await pipelineRes.json();
      const current = data.current ?? data;
      return NextResponse.json({
        temperature: numberOrNull(current.temperature),
        apparent_temperature: numberOrNull(current.apparent_temperature),
        relative_humidity: numberOrNull(current.relative_humidity),
        precipitation: numberOrNull(current.precipitation),
        weather_code: numberOrNull(current.weather_code),
        wind_speed: numberOrNull(current.wind_speed),
        cached: typeof data.cached === "boolean" ? data.cached : undefined,
      } satisfies WeatherData);
    }
  } catch {
    // Pipeline not reachable, fall back to direct Open-Meteo.
  }

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      current: CURRENT_FIELDS,
    });
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("Open-Meteo error");
    const raw = await res.json();
    const current = raw?.current ?? {};
    return NextResponse.json({
      temperature: numberOrNull(current.temperature_2m),
      apparent_temperature: numberOrNull(current.apparent_temperature),
      relative_humidity: numberOrNull(current.relative_humidity_2m),
      precipitation: numberOrNull(current.precipitation),
      weather_code: numberOrNull(current.weather_code),
      wind_speed: numberOrNull(current.wind_speed_10m),
    } satisfies WeatherData);
  } catch {
    return NextResponse.json({ error: "Weather fetch failed" }, { status: 502 });
  }
}
