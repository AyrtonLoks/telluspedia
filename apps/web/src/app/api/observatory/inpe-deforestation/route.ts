import { NextResponse } from "next/server";
import { inpeTerraBrasilisSource } from "@/lib/inpe-sources";
import { observatoryHeaders } from "@/lib/observatory-source";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Monitoramento oficial de desmatamento INPE TerraBrasilis:
 * - Série histórica anual oficial PRODES (2015–2025) para Amazônia Legal e Cerrado (T03).
 * - Alertas recentes DETER via WFS GeoServer quando disponível (T05 honesto).
 */
export async function GET(request: Request) {
  const limit = await enforceRateLimit("observatory:inpe-deforestation", request);
  if (limit.blocked) return limit.blocked;

  const result = await inpeTerraBrasilisSource.get();
  return NextResponse.json(result.envelope, {
    headers: { ...observatoryHeaders(result), ...limit.headers },
  });
}
