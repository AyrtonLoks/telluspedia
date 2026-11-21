#!/usr/bin/env -S npx tsx
/**
 * D12e — Ingestão de eventos do Wikidata (SPARQL) como RASCUNHOS de cena.
 *
 * Gera/atualiza `src/data/scenes/drafts/wikidata.json` com cenas `published: false`, cada uma com
 * QID, datas (na precisão do Wikidata), coordenadas (P625), países (P17 → ISO alfa-3, P298) e fontes
 * (Wikidata e, quando houver, o artigo da Wikipédia em português). Os rascunhos NÃO entram no
 * catálogo do site: só depois da revisão humana são movidos para uma cena publicada
 * (docs/SCENES.md, "Importar do Wikidata"). QIDs que já existem em qualquer cena são ignorados.
 *
 * Uso (de apps/web):
 *   pnpm scenes:wikidata --qids Q5086,Q8676 --category POLITICS_REGIMES
 *   pnpm scenes:wikidata --class Q178561 --from 1914 --to 1918 --limit 30 --category WAR_MILITARY
 *   pnpm scenes:wikidata ... --dry-run            # só mostra o que seria gravado
 *   pnpm scenes:wikidata ... --input resposta.json  # usa uma resposta SPARQL salva (sem rede)
 *   pnpm scenes:wikidata ... --print-query          # imprime a consulta e sai
 *
 * Política de uso do Wikidata: User-Agent identificado e uma consulta por execução.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SCENE_CATEGORIES, SceneSchema, type SceneInput } from "../src/lib/scenes/schema";
import {
  WIKIDATA_SPARQL_ENDPOINT,
  bindingsToDrafts,
  buildSparqlQuery,
  type DraftCategory,
  type SparqlBinding,
} from "../src/lib/scenes/wikidata";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCENES_DIR = path.resolve(__dirname, "../src/data/scenes");
const DRAFTS_PATH = path.join(SCENES_DIR, "drafts/wikidata.json");
const USER_AGENT = "TellusPediaSceneIngest/1.0 (https://github.com/AyrtonLoks/telluspedia)";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);
const fail = (msg: string): never => {
  console.error(`erro: ${msg}`);
  process.exit(1);
};

/** Todas as cenas já versionadas (publicadas e rascunhos), para não importar QID/id repetido. */
function loadExisting(): { scenes: Array<{ id: string; wikidata?: string }>; drafts: SceneInput[] } {
  const read = (file: string): unknown[] => {
    const data = JSON.parse(readFileSync(file, "utf-8"));
    return Array.isArray(data) ? data : [data];
  };
  const scenes = readdirSync(SCENES_DIR)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => read(path.join(SCENES_DIR, f))) as Array<{ id: string; wikidata?: string }>;
  const drafts = existsSync(DRAFTS_PATH) ? (read(DRAFTS_PATH) as SceneInput[]) : [];
  return { scenes, drafts };
}

async function main() {
  const input = arg("input");
  const query = () =>
    buildSparqlQuery({
      qids: arg("qids")?.split(",").map((q) => q.trim()).filter(Boolean),
      classQid: arg("class"),
      fromYear: arg("from") ? Number(arg("from")) : undefined,
      toYear: arg("to") ? Number(arg("to")) : undefined,
      limit: arg("limit") ? Number(arg("limit")) : undefined,
    });
  if (flag("print-query")) {
    console.log(query());
    return;
  }

  const category = arg("category") as DraftCategory | undefined;
  if (!category || !(SCENE_CATEGORIES as readonly string[]).includes(category)) {
    fail(`--category obrigatório: ${SCENE_CATEGORIES.join(", ")}`);
  }

  let response: { results?: { bindings?: SparqlBinding[] } };
  if (input) {
    response = JSON.parse(readFileSync(path.resolve(process.cwd(), input), "utf-8"));
  } else {
    const url = `${WIKIDATA_SPARQL_ENDPOINT}?format=json&query=${encodeURIComponent(query())}`;
    const res = await fetch(url, { headers: { Accept: "application/sparql-results+json", "User-Agent": USER_AGENT } });
    if (!res.ok) fail(`Wikidata respondeu ${res.status} ${res.statusText}`);
    response = await res.json();
  }
  const bindings = response.results?.bindings;
  if (!Array.isArray(bindings)) fail("resposta sem results.bindings (formato SPARQL JSON)");

  const { scenes, drafts: current } = loadExisting();
  const all = [...scenes, ...current];
  const { drafts, skipped } = bindingsToDrafts(bindings!, {
    category: category!,
    retrievedAt: new Date().toISOString().slice(0, 10),
    existingQids: all.map((s) => s.wikidata).filter((q): q is string => !!q),
    existingIds: all.map((s) => s.id),
  });

  // Todo rascunho tem de passar no schema antes de ser gravado.
  for (const d of drafts) {
    const ok = SceneSchema.safeParse(d);
    if (!ok.success) fail(`${d.wikidata} (${d.id}) não passa no schema: ${ok.error.issues[0].path.join(".")} — ${ok.error.issues[0].message}`);
  }

  for (const d of drafts) console.log(`+ ${d.wikidata}  ${d.id}  (${d.date.start})`);
  for (const s of skipped) console.log(`- ${s.qid}  ignorado: ${s.reason}`);
  console.log(`${drafts.length} rascunho(s) novo(s), ${skipped.length} ignorado(s).`);

  if (flag("dry-run") || drafts.length === 0) return;
  mkdirSync(path.dirname(DRAFTS_PATH), { recursive: true });
  writeFileSync(DRAFTS_PATH, `${JSON.stringify([...current, ...drafts], null, 2)}\n`);
  console.log(`gravado em ${path.relative(process.cwd(), DRAFTS_PATH)} — revise antes de publicar (docs/SCENES.md).`);
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
