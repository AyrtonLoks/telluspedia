import { NextRequest, NextResponse } from "next/server";
import { getSpeciesOccurrencesEnvelope } from "@/lib/species-gbif";
import { observatoryHeaders } from "@/lib/observatory-source";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Proxy server-side para a GBIF Occurrence Search API v1 (D32 / RN13.7):
 * - Aceita `speciesId` validado contra o catálogo curado (evita abuso/SSRF).
 * - Aceita filtro opcional `country` (ISO 3166-1 alpha-2, ex.: `BR`).
 * - Aplica cache SWR de 30 min e contrato T05 honesto (sem ocorrências fabricadas).
 */
export async function GET(request: NextRequest) {
  const limit = await enforceRateLimit("observatory:species", request);
  if (limit.blocked) return limit.blocked;

  const { searchParams } = new URL(request.url);
  const speciesId = (searchParams.get("speciesId") ?? "panthera-onca").trim();
  const rawCountry = searchParams.get("country")?.trim().toUpperCase() ?? null;
  const countryIso2 = rawCountry && /^[A-Z]{2}$/.test(rawCountry) ? rawCountry : null;

  const result = await getSpeciesOccurrencesEnvelope(speciesId, countryIso2);
  if (!result) {
    return NextResponse.json(
      { error: "Espécie não encontrada no catálogo curado." },
      { status: 400, headers: limit.headers }
    );
  }

  return NextResponse.json(result.envelope, {
    headers: { ...observatoryHeaders(result), ...limit.headers },
  });
}
