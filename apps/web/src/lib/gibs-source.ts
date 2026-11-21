/* Só servidor: importado apenas pelas rotas de /api/observatory/gibs. */
import { GIBS_PROVIDER, gibsGetMapUrl, gibsImagePath, isBlankGibsImage, type GibsLayerData, type GibsRequest } from "./gibs";
import { SourceUnavailableError, type ObservatoryEnvelope } from "./observatory-source";

/**
 * Proxy da camada NASA GIBS (D25). O envelope T05 (`/api/observatory/gibs`) e a imagem
 * (`/api/observatory/gibs/image`) compartilham esta busca e o cache: a rota do envelope já baixa a
 * imagem para saber se há dado ("live") ou não ("fallback", com a referência local), e a rota da
 * imagem a serve da memória.
 */
const TIMEOUT_MS = 15_000;
/** Imagens em memória (cada uma tem de ~0,1 a ~0,7 MB). */
const MAX_CACHED = 12;
/** Falhas também ficam em cache por pouco tempo, para não martelar o GIBS. */
const FAILURE_TTL_MS = 60_000;

type Entry = { bytes: Uint8Array; fetchedAt: number } | { error: string; until: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<{ bytes: Uint8Array; fetchedAt: number }>>();

const keyOf = (req: GibsRequest) => `${req.product.gibsLayer}|${req.time}`;

function remember(key: string, entry: Entry) {
  cache.delete(key);
  cache.set(key, entry);
  while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value!);
}

/** Baixa a imagem do GIBS (ou da memória). Lança `SourceUnavailableError` com motivo exibível. */
export async function fetchGibsImage(
  req: GibsRequest,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now
): Promise<{ bytes: Uint8Array; fetchedAt: number }> {
  const key = keyOf(req);
  const hit = cache.get(key);
  if (hit && "bytes" in hit) {
    remember(key, hit); // LRU: usado agora
    return hit;
  }
  if (hit && "error" in hit && now() < hit.until) throw new SourceUnavailableError(hit.error);

  let p = inflight.get(key);
  if (!p) {
    p = (async () => {
      let res: Response;
      try {
        res = await fetchImpl(gibsGetMapUrl(req.product, req.time), {
          signal: AbortSignal.timeout(TIMEOUT_MS),
          headers: { Accept: "image/png" },
        });
      } catch (err) {
        const reason = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
          ? "Tempo limite excedido ao contatar o NASA GIBS"
          : "NASA GIBS indisponível";
        throw new SourceUnavailableError(reason);
      }
      if (!res.ok) throw new SourceUnavailableError(`NASA GIBS respondeu HTTP ${res.status}`);
      if (!(res.headers.get("content-type") ?? "").startsWith("image/png")) {
        throw new SourceUnavailableError("NASA GIBS não devolveu uma imagem (possível erro do serviço)");
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (isBlankGibsImage(bytes.byteLength)) {
        throw new SourceUnavailableError(`Sem imagem do NASA GIBS para ${req.product.shortName.toLowerCase()} nesta data`);
      }
      const entry = { bytes, fetchedAt: now() };
      remember(key, entry);
      return entry;
    })()
      .catch((err) => {
        const reason = err instanceof SourceUnavailableError ? err.message : "NASA GIBS indisponível";
        remember(key, { error: reason, until: now() + FAILURE_TTL_MS });
        throw new SourceUnavailableError(reason);
      })
      .finally(() => inflight.delete(key));
    inflight.set(key, p);
  }
  return p;
}

/** Envelope T05 da camada: "live" com a imagem do GIBS ou "fallback" com a referência local. */
export async function gibsEnvelope(
  req: GibsRequest,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now
): Promise<ObservatoryEnvelope<GibsLayerData>> {
  const { product, month, time } = req;
  try {
    const { fetchedAt } = await fetchGibsImage(req, fetchImpl, now);
    return {
      data: { product: product.id, month, imageMonth: month, imageUrl: gibsImagePath(product.id, month), gibsLayer: product.gibsLayer, time },
      meta: { source: "live", provider: `${GIBS_PROVIDER} — ${product.composite}`, fetchedAt: new Date(fetchedAt).toISOString(), stale: false },
    };
  } catch (err) {
    const reason = err instanceof SourceUnavailableError ? err.message : "NASA GIBS indisponível";
    return {
      data: {
        product: product.id,
        month,
        imageMonth: product.fallbackMonth,
        imageUrl: product.fallbackImage,
        gibsLayer: product.gibsLayer,
        time: `${product.fallbackMonth}-${String(product.day).padStart(2, "0")}`,
      },
      meta: {
        source: "fallback",
        provider: `Referência local (NASA GIBS, ${product.fallbackMonth})`,
        fetchedAt: new Date(now()).toISOString(),
        stale: false,
        reason: `${reason}. Mostrando a referência local de ${product.fallbackMonth}.`,
      },
    };
  }
}

/** Só para testes. */
export function __resetGibsCache() {
  cache.clear();
  inflight.clear();
}
