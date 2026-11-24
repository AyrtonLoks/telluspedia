import { NextResponse } from "next/server";
import { satellitesSource } from "@/lib/observatory-sources";
import { observatoryHeaders } from "@/lib/observatory-source";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * TLEs dos satélites (D04): envelope { data, meta } (T05) com `data` = SatelliteTle[]
 * (nome, NORAD, categoria, linhas do TLE e época). A posição é propagada com SGP4 no cliente.
 */
export async function GET(request: Request) {
  const limit = await enforceRateLimit("observatory:satellites", request);
  if (limit.blocked) return limit.blocked;

  const result = await satellitesSource.get();
  return NextResponse.json(result.envelope, {
    headers: { ...observatoryHeaders(result), ...limit.headers },
  });
}
