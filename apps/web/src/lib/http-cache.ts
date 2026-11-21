/**
 * Políticas de `Cache-Control` das rotas `/api/*` (T30). Rotas do Observatório usam
 * `observatoryHeaders` (TTL de cada fonte); as demais, estas.
 */
export const CACHE_POLICY = {
  /** Escrita, erro, ou resposta temporária: nunca em cache. */
  noStore: "no-store",
  /** Dados versionados no repositório (países, marcos): mudam a cada deploy. */
  staticData: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  /**
   * Estudo publicado: o registro é imutável (RN16), mas a resposta lista os forks, que crescem —
   * então cache curto no navegador e mais longo na CDN, com revalidação.
   */
  study: "public, max-age=60, s-maxage=600, stale-while-revalidate=86400",
  /** Clima atual: estimativa que muda devagar. */
  weather: "public, max-age=600, s-maxage=600, stale-while-revalidate=1800",
  /** Posição do Sol num instante dado (`?dt=`): determinística. */
  astronomyAt: "public, max-age=86400, s-maxage=31536000, immutable",
  /** Posição do Sol "agora". */
  astronomyNow: "public, max-age=60, s-maxage=60",
} as const;

type Handler<A extends unknown[]> = (...args: A) => Response | Promise<Response>;

/**
 * Envolve um handler: respostas 2xx recebem a política (fixa ou calculada pela requisição); as
 * demais, `no-store`. Um `Cache-Control` que o handler já definiu é mantido (ex.: estudo temporário).
 */
export function withCachePolicy<A extends unknown[]>(
  handler: Handler<A>,
  policy: string | ((...args: A) => string)
): Handler<A> {
  return async (...args: A) => {
    const res = await handler(...args);
    if (!res.headers.has("Cache-Control")) {
      const ok = res.status >= 200 && res.status < 300;
      res.headers.set("Cache-Control", ok ? (typeof policy === "function" ? policy(...args) : policy) : CACHE_POLICY.noStore);
    }
    return res;
  };
}
