import { NextRequest, NextResponse } from "next/server";
import { WORLD_COUNTRIES_CATALOG } from "@/lib/country-data";
import { getCountryNewsSource } from "@/lib/gdelt-source";
import { observatoryHeaders } from "@/lib/observatory-source";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ iso: string }> }
) {
  const { iso } = await params;
  const upperIso = (iso || "").trim().toUpperCase();

  if (!upperIso || !Object.hasOwn(WORLD_COUNTRIES_CATALOG, upperIso)) {
    return NextResponse.json(
      { error: "Country not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const limit = await enforceRateLimit("country:news", request);
  if (limit.blocked) return limit.blocked;

  const result = await getCountryNewsSource(upperIso).get();
  return NextResponse.json(result.envelope, {
    headers: { ...observatoryHeaders(result), ...limit.headers },
  });
}
