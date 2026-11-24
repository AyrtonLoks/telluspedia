import { NextResponse } from "next/server";
import { observatoryHeaders } from "@/lib/observatory-source";
import { enforceRateLimit } from "@/lib/rate-limit";
import { windsSource } from "@/lib/winds-source";

/**
 * Camada de Ventos Globais (D27a).
 * Retorna grade UV compacta (9 × 16 = 144 pontos globais) para Superfície (10 m) e Corrente de Jato (250 hPa)
 * a partir do modelo NOAA GFS via Open-Meteo, no envelope padrão `{ data, meta }` da T05 com fallback
 * climatológico explícito quando o provedor estiver indisponível.
 */
export async function GET(request: Request) {
  const limit = await enforceRateLimit("observatory:winds", request);
  if (limit.blocked) return limit.blocked;

  const result = await windsSource.get();
  return NextResponse.json(result.envelope, {
    headers: { ...observatoryHeaders(result), ...limit.headers },
  });
}
