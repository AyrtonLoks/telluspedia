import { NextResponse } from "next/server";
import { getFirmsSource } from "@/lib/observatory-sources";
import { observatoryHeaders } from "@/lib/observatory-source";
import {
  parseFirmsBbox,
  parseFirmsConfidence,
  parseFirmsWindow,
  selectFirmsInBbox,
} from "@/lib/firms-aggregate";

/**
 * Focos de calor do FIRMS.
 * Query: `days` = 1 | 2 | 5 (padrão 1; a API do FIRMS aceita no máximo 5) e
 * `confidence` = nominal (padrão, oculta baixa confiança) | all.
 *
 * Visão global (sem `bbox`): envelope { data, meta } (T05) — `data` são os focos mais intensos
 * (até 5.000) — acrescido de `cells` (grade agregada da janela), `byCountry`, `total` e `window`.
 *
 * Detalhe da área visível (`bbox=minLng,minLat,maxLng,maxLat`): `data` = todos os focos do recorte
 * (até 12.000, os de maior FRP), `total` = focos no recorte, `bbox` ecoado.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const days = parseFirmsWindow(params.get("days"));
  const confidence = parseFirmsConfidence(params.get("confidence"));
  const rawBbox = params.get("bbox");
  const bbox = parseFirmsBbox(rawBbox);
  if (rawBbox !== null && !bbox) {
    return NextResponse.json(
      { error: "bbox inválido: use minLng,minLat,maxLng,maxLat em graus" },
      { status: 400 }
    );
  }

  const result = await getFirmsSource(days, confidence).get();
  const { data, meta } = result.envelope;
  const window = { days: data.days, confidence: data.confidence };
  const headers = observatoryHeaders(result);

  if (bbox) {
    const { hotspots, total } = selectFirmsInBbox(data.all, bbox);
    return NextResponse.json({ data: hotspots, meta, total, window, bbox }, { headers });
  }

  return NextResponse.json(
    { data: data.hotspots, meta, cells: data.cells, byCountry: data.byCountry, total: data.total, window },
    { headers }
  );
}
