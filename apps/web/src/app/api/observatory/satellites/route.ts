import { NextResponse } from "next/server";
import { satellitesSource } from "@/lib/observatory-sources";
import { observatoryHeaders } from "@/lib/observatory-source";

/**
 * TLEs dos satélites (D04): envelope { data, meta } (T05) com `data` = SatelliteTle[]
 * (nome, NORAD, categoria, linhas do TLE e época). A posição é propagada com SGP4 no cliente.
 */
export async function GET() {
  const result = await satellitesSource.get();
  return NextResponse.json(result.envelope, { headers: observatoryHeaders(result) });
}
