import { NextResponse } from "next/server";
import { inpeBdQueimadasSource } from "@/lib/inpe-sources";
import { observatoryHeaders } from "@/lib/observatory-source";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Focos de calor oficiais do INPE BDQueimadas (América do Sul / Brasil) com agregação
 * oficial pelos 6 Biomas Brasileiros (D30 / RN17 / T05).
 */
export async function GET(request: Request) {
  const limit = await enforceRateLimit("observatory:inpe-fires", request);
  if (limit.blocked) return limit.blocked;

  const result = await inpeBdQueimadasSource.get();
  return NextResponse.json(result.envelope, {
    headers: { ...observatoryHeaders(result), ...limit.headers },
  });
}
