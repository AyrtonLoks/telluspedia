import { NextResponse } from "next/server";
import { parseGibsRequest } from "@/lib/gibs";
import { gibsEnvelope } from "@/lib/gibs-source";

/**
 * Camada NASA GIBS (D25). Query: `product` = ndvi | snow | seaice | lst (padrão ndvi) e `month` =
 * AAAA-MM (padrão: o último mês processado). Validação estrita: fora da lista ou do intervalo do
 * produto → 400 com o motivo.
 *
 * Resposta: envelope { data, meta } (T05). "live" quando o GIBS entregou a imagem do mês (servida em
 * `data.imageUrl` pelo próprio TellusPedia); "fallback" com a referência local quando o GIBS falhou
 * ou não tem dado na data — `meta.reason` diz por quê e `data.imageMonth` qual mês a imagem mostra.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const parsed = parseGibsRequest({ product: params.get("product"), month: params.get("month") });
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400, headers: { "Cache-Control": "no-store" } });

  const envelope = await gibsEnvelope(parsed.value);
  const live = envelope.meta.source === "live";
  return NextResponse.json(envelope, {
    // Mês passado ainda pode ser reprocessado: 1 h. Fallback: curto, para tentar o GIBS de novo logo.
    headers: { "Cache-Control": live ? "public, max-age=3600, s-maxage=3600" : "public, max-age=60" },
  });
}
