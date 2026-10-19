import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 });
  }

  const pipelineUrl = process.env.DATA_PIPELINE_URL || "http://localhost:8000";

  // Try Python data-pipeline first
  try {
    const pipelineRes = await fetch(
      `${pipelineUrl}/api/v1/weather?lat=${lat}&lng=${lng}`,
      { signal: AbortSignal.timeout(2000) }
    );
    if (pipelineRes.ok) {
      const data = await pipelineRes.json();
      return NextResponse.json(data.current || data);
    }
  } catch {
    // Pipeline not reachable, fall back to direct Open-Meteo
  }

  // Direct Open-Meteo fallback
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error("Open-Meteo error");
    const raw = await res.json();
    const cur = raw.current || {};
    return NextResponse.json({
      temperature: cur.temperature_2m ?? 22.0,
      apparent_temperature: cur.apparent_temperature ?? 22.0,
      relative_humidity: cur.relative_humidity_2m ?? 50.0,
      precipitation: cur.precipitation ?? 0.0,
      weather_code: cur.weather_code ?? 0,
      wind_speed: cur.wind_speed_10m ?? 5.0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Weather fetch failed", detail: err?.message },
      { status: 502 }
    );
  }
}
