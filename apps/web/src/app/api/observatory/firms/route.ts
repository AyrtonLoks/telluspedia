import { NextResponse } from "next/server";
import { getFirmsSource } from "@/lib/observatory-sources";
import { observatoryHeaders } from "@/lib/observatory-source";
import { parseFirmsConfidence, parseFirmsWindow } from "@/lib/firms-aggregate";

/**
 * Focos de calor do FIRMS.
 * Query: `days` = 1 | 2 | 5 (padrão 1; a API do FIRMS aceita no máximo 5) e
 * `confidence` = nominal (padrão, oculta baixa confiança) | all.
 * Resposta: envelope { data, meta } (T05) — `data` são os focos mais intensos (até 5.000) —
 * acrescido de `cells` (grade agregada de toda a janela), `total` e `window`.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const days = parseFirmsWindow(params.get("days"));
  const confidence = parseFirmsConfidence(params.get("confidence"));

  const result = await getFirmsSource(days, confidence).get();
  const { data, meta } = result.envelope;
  return NextResponse.json(
    {
      data: data.hotspots,
      meta,
      cells: data.cells,
      total: data.total,
      window: { days: data.days, confidence: data.confidence },
    },
    { headers: observatoryHeaders(result) }
  );
}
