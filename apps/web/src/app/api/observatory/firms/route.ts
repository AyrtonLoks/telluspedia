import { NextResponse } from "next/server";
import { getFirmsSource } from "@/lib/observatory-sources";
import { observatoryHeaders } from "@/lib/observatory-source";
import {
  FIRMS_SCHEMA,
  encodeFirmsColumns,
  parseFirmsConfidence,
  parseFirmsWindow,
} from "@/lib/firms-aggregate";

/**
 * Focos de calor do FIRMS — TODOS os focos da janela (cada ponto do globo = um foco detectado).
 * Query: `days` = 1 | 2 | 5 (padrão 1; a API do FIRMS aceita no máximo 5),
 * `confidence` = nominal (padrão, oculta baixa confiança) | all, e `schema` (versão do formato,
 * usada pelo cliente para não reaproveitar respostas antigas do cache HTTP).
 *
 * Resposta: envelope { data, meta } (T05), com `data` no formato colunar `firms-columns-v1`
 * (lib/firms-aggregate.ts), mais `total`, `byCountry` (ISO alfa-3 → contagem/FRP), `window` e `schema`.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const days = parseFirmsWindow(params.get("days"));
  const confidence = parseFirmsConfidence(params.get("confidence"));

  const result = await getFirmsSource(days, confidence).get();
  const { data, meta } = result.envelope;
  return NextResponse.json(
    {
      data: encodeFirmsColumns(data.hotspots),
      meta,
      total: data.total,
      byCountry: data.byCountry,
      window: { days: data.days, confidence: data.confidence },
      schema: FIRMS_SCHEMA,
    },
    { headers: observatoryHeaders(result) }
  );
}
