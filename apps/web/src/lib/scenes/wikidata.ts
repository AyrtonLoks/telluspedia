/**
 * Ingestão de eventos do Wikidata (D12e) — parte pura, testável sem rede.
 *
 * `buildSparqlQuery` monta a consulta (por lista de QIDs ou por classe + período) e
 * `bindingsToDrafts` converte a resposta SPARQL em rascunhos de cena (`published: false`), com QID,
 * datas e precisão, coordenadas, países (ISO 3166-1 alfa-3) e fontes citáveis (Wikidata e, quando
 * existir, o artigo da Wikipédia em português). Nada é inventado: o que falta no Wikidata vira uma
 * nota em `facts.aRevisar` e o rascunho só é publicado depois da revisão humana (docs/SCENES.md).
 *
 * Não é importado pelo cliente: usado por `scripts/ingest-wikidata.ts` e pelos testes.
 */
import type { SceneInput } from "./schema";

export const WIKIDATA_SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";

/** Chave dos fatos com as pendências da revisão; uma cena publicada não pode tê-la (teste). */
export const REVIEW_FACT = "aRevisar";

export type DraftCategory = SceneInput["category"];
type Precision = SceneInput["date"]["precision"];

export interface SparqlQueryOptions {
  /** QIDs específicos (ex.: ["Q5086"]). */
  qids?: string[];
  /** Classe (P31), ex.: "Q178561" (batalha). Usada quando não há `qids`. */
  classQid?: string;
  /** Período (anos, inclusive) para a busca por classe. */
  fromYear?: number;
  toYear?: number;
  limit?: number;
}

const QID = /^Q\d+$/;

export function buildSparqlQuery(opts: SparqlQueryOptions): string {
  const qids = (opts.qids ?? []).filter((q) => QID.test(q));
  let selector: string;
  if (qids.length > 0) {
    selector = `VALUES ?item { ${qids.map((q) => `wd:${q}`).join(" ")} }`;
  } else if (opts.classQid && QID.test(opts.classQid)) {
    selector = `?item wdt:P31 wd:${opts.classQid} .`;
  } else {
    throw new Error("informe QIDs ou uma classe (QID) válidos");
  }
  const range: string[] = [];
  if (qids.length === 0) {
    range.push("BIND(COALESCE(?time, ?start) AS ?when) FILTER(BOUND(?when))");
    if (Number.isInteger(opts.fromYear)) range.push(`FILTER(YEAR(?when) >= ${opts.fromYear})`);
    if (Number.isInteger(opts.toYear)) range.push(`FILTER(YEAR(?when) <= ${opts.toYear})`);
  }
  const limit = qids.length > 0 ? "" : `LIMIT ${Math.max(1, Math.min(500, opts.limit ?? 50))}`;
  return `SELECT ?item ?ptLabel ?enLabel ?ptDesc ?time ?timePrecision ?start ?startPrecision ?end ?endPrecision ?coord ?countryIso ?article WHERE {
  ${selector}
  OPTIONAL { ?item p:P585/psv:P585 [ wikibase:timeValue ?time; wikibase:timePrecision ?timePrecision ] }
  OPTIONAL { ?item p:P580/psv:P580 [ wikibase:timeValue ?start; wikibase:timePrecision ?startPrecision ] }
  OPTIONAL { ?item p:P582/psv:P582 [ wikibase:timeValue ?end; wikibase:timePrecision ?endPrecision ] }
  OPTIONAL { ?item wdt:P625 ?coord }
  OPTIONAL { ?item wdt:P17 ?country . ?country wdt:P298 ?countryIso }
  OPTIONAL { ?item rdfs:label ?ptLabel FILTER(LANG(?ptLabel) = "pt") }
  OPTIONAL { ?item rdfs:label ?enLabel FILTER(LANG(?enLabel) = "en") }
  OPTIONAL { ?item schema:description ?ptDesc FILTER(LANG(?ptDesc) = "pt") }
  OPTIONAL { ?article schema:about ?item; schema:isPartOf <https://pt.wikipedia.org/> }
  ${range.join("\n  ")}
}
${limit}`.trim();
}

/** Linha da resposta SPARQL JSON (`results.bindings[i]`). */
export type SparqlBinding = Record<string, { type: string; value: string } | undefined>;

const PRECISION: Record<number, Precision> = { 11: "day", 10: "month", 9: "year", 8: "decade", 7: "century" };

/**
 * Data do Wikidata Query Service (`xsd:dateTime`: "1989-11-09T00:00:00Z", "-0047-08-07T00:00:00Z")
 * → data parcial ISO do schema, cortada na precisão informada. Precisão abaixo de século → null.
 *
 * O serviço usa a numeração astronômica (ano 0 = 1 a.C.; "-0047" = 48 a.C.); o projeto usa anos
 * negativos históricos (sem ano zero), então anos ≤ 0 descem um. Datas a.C. vêm no calendário
 * juliano proléptico, como no Wikidata.
 */
export function wikidataTimeToPartial(value: string, precisionCode: number): { date: string; precision: Precision } | null {
  const precision = PRECISION[precisionCode];
  const m = /^([+-]?)(\d+)-(\d{2})-(\d{2})T/.exec(value);
  if (!precision || !m) return null;
  const astronomical = (m[1] === "-" ? -1 : 1) * parseInt(m[2], 10);
  const year = astronomical <= 0 ? astronomical - 1 : astronomical;
  if (!Number.isFinite(year) || Math.abs(year) > 9999) return null;
  const y = String(year);
  if (precision === "day" && m[3] !== "00" && m[4] !== "00") return { date: `${y}-${m[3]}-${m[4]}`, precision };
  if ((precision === "day" || precision === "month") && m[3] !== "00") return { date: `${y}-${m[3]}`, precision: "month" };
  return { date: y, precision: precision === "day" || precision === "month" ? "year" : precision };
}

/** "Point(13.4 52.5)" → { lat, lng }. */
export function parseWktPoint(wkt: string): { lat: number; lng: number } | null {
  const m = /^Point\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)$/i.exec(wkt.trim());
  if (!m) return null;
  const lng = Number(m[1]);
  const lat = Number(m[2]);
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return null;
  return { lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) };
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

export interface DraftOptions {
  category: DraftCategory;
  /** Data da consulta (AAAA-MM-DD), registrada na fonte. */
  retrievedAt: string;
  /** QIDs já presentes nas cenas (publicadas ou rascunhos): não são importados de novo. */
  existingQids?: Iterable<string>;
  /** Ids já usados: o novo id ganha o QID como sufixo em caso de colisão. */
  existingIds?: Iterable<string>;
}

export interface DraftResult {
  drafts: SceneInput[];
  skipped: Array<{ qid: string; reason: string }>;
}

const val = (b: SparqlBinding, k: string) => b[k]?.value;

/** Agrupa as linhas por item (uma linha por combinação de país/data) e gera os rascunhos. */
export function bindingsToDrafts(bindings: SparqlBinding[], opts: DraftOptions): DraftResult {
  const byQid = new Map<string, SparqlBinding[]>();
  for (const b of bindings) {
    const qid = val(b, "item")?.split("/").pop();
    if (!qid || !QID.test(qid)) continue;
    const rows = byQid.get(qid) ?? [];
    rows.push(b);
    byQid.set(qid, rows);
  }

  const existingQids = new Set(opts.existingQids ?? []);
  const usedIds = new Set(opts.existingIds ?? []);
  const year = parseInt(opts.retrievedAt.slice(0, 4), 10);
  const drafts: SceneInput[] = [];
  const skipped: DraftResult["skipped"] = [];

  for (const [qid, rows] of byQid) {
    if (existingQids.has(qid)) {
      skipped.push({ qid, reason: "já existe uma cena com este QID" });
      continue;
    }
    const first = (k: string) => rows.map((r) => val(r, k)).find((v) => v !== undefined);
    const review: string[] = [];

    const ptLabel = first("ptLabel");
    const title = ptLabel ?? first("enLabel");
    if (!title || title.length < 3) {
      skipped.push({ qid, reason: "sem rótulo em português ou inglês" });
      continue;
    }
    if (!ptLabel) review.push("título em inglês (sem rótulo em português)");

    // Data: momento (P585) ou início/fim (P580/P582), na precisão do Wikidata. Com os dois, vale
    // o mais preciso (empate: o intervalo). Valores divergentes ficam anotados para a revisão.
    const dates = (k: "time" | "start" | "end", pk: string) =>
      [...new Map(rows.filter((r) => val(r, k)).map((r) => [val(r, k)!, wikidataTimeToPartial(val(r, k)!, Number(val(r, pk)))])).values()]
        .filter((d): d is NonNullable<typeof d> => d !== null);
    const points = dates("time", "timePrecision");
    const starts = dates("start", "startPrecision");
    const ends = dates("end", "endPrecision");
    const rank = (d?: { precision: Precision }) => (d ? ["century", "decade", "year", "month", "day"].indexOf(d.precision) : -1);
    const useRange = starts.length > 0 && rank(starts[0]) >= rank(points[0]);
    const candidates = useRange ? starts : points;
    const start = candidates[0];
    if (!start) {
      const hasRaw = rows.some((r) => val(r, "time") || val(r, "start"));
      skipped.push({ qid, reason: hasRaw ? "data com precisão abaixo de século" : "sem data (P585/P580)" });
      continue;
    }
    const distinct = (ds: Array<{ date: string }>) => [...new Set(ds.map((d) => d.date))];
    if (distinct(candidates).length > 1) review.push(`datas divergentes no Wikidata (${distinct(candidates).join(", ")})`);
    if (useRange && points.length > 0 && !distinct(points).every((d) => d === start.date)) {
      review.push(`P585 diferente do início (${distinct(points).join(", ")})`);
    }
    const end = useRange ? ends[0] ?? null : null;

    const ptDesc = first("ptDesc");
    let summary = ptDesc && ptDesc.length >= 10 ? ptDesc : "";
    if (!summary) {
      summary = `Rascunho importado do Wikidata (${qid}); resumo a escrever na revisão.`;
      review.push("resumo (sem descrição em português no Wikidata)");
    }
    review.push(`categoria (${opts.category}, definida na importação)`);

    const countries = [...new Set(rows.map((r) => val(r, "countryIso")).filter((c): c is string => !!c && /^[A-Z]{3}$/.test(c)))].sort();
    // P17 é o país atual do local: para eventos antigos a entidade histórica precisa ser conferida.
    if (countries.length > 0) review.push(`país (${countries.join(", ")}: país atual pelo P17; conferir a entidade da época)`);
    else review.push("país (sem P17 com código ISO)");
    const coord = first("coord");
    const location = coord ? parseWktPoint(coord) : null;
    if (!location) review.push("coordenadas (sem P625)");

    const startYear = parseInt(start.date, 10);
    const base = slugify(title) || qid.toLowerCase();
    let id = `${base}-${startYear < 0 ? `${-startYear}ac` : startYear}`;
    if (usedIds.has(id)) id = `${id}-${qid.toLowerCase()}`;
    usedIds.add(id);

    const article = first("article");
    const sources: SceneInput["sources"] = [
      { label: `Wikidata — ${qid}`, url: `https://www.wikidata.org/wiki/${qid}`, title, publication: "Wikidata", year },
    ];
    if (article) sources.push({ label: "Wikipédia (pt)", url: article, title, publication: "Wikipédia", year });

    drafts.push({
      id,
      title,
      summary,
      category: opts.category,
      date: { start: start.date, ...(end && end.date >= start.date ? { end: end.date } : {}), precision: start.precision },
      ...(countries.length === 1 ? { country: countries[0] } : {}),
      ...(countries.length > 1 ? { countries } : {}),
      timelineScope: "global",
      ...(location ? { location } : {}),
      sources,
      facts: { [REVIEW_FACT]: review.join("; ") },
      published: false,
      wikidata: qid,
    });
  }
  return { drafts, skipped };
}
