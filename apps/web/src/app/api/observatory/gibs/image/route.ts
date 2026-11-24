import { NextResponse } from "next/server";
import { parseGibsRequest } from "@/lib/gibs";
import { fetchGibsImage } from "@/lib/gibs-source";
import { SourceUnavailableError } from "@/lib/observatory-source";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Imagem da camada NASA GIBS (D25), servida pela própria origem (a CSP só permite imagens dela).
 * Mesmos parâmetros e validação de `/api/observatory/gibs`. 502 quando o GIBS não tem a imagem — o
 * cliente usa a URL que o envelope indicou, que já é a referência local nesse caso.
 */
export async function GET(request: Request) {
  const limit = await enforceRateLimit("observatory:gibs-image", request);
  if (limit.blocked) return limit.blocked;

  const params = new URL(request.url).searchParams;
  const parsed = parseGibsRequest({ product: params.get("product"), month: params.get("month") });
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: { "Cache-Control": "no-store", ...limit.headers } }
    );
  }

  try {
    const { bytes } = await fetchGibsImage(parsed.value);
    return new NextResponse(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "image/png" }), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(bytes.byteLength),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
        "X-Data-Source": "live",
        "X-Data-Provider": "NASA GIBS",
        ...limit.headers,
      },
    });
  } catch (err) {
    const reason = err instanceof SourceUnavailableError ? err.message : "NASA GIBS indisponível";
    return NextResponse.json(
      { error: reason },
      { status: 502, headers: { "Cache-Control": "no-store", ...limit.headers } }
    );
  }
}
