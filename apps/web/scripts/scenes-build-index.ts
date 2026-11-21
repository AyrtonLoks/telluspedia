/**
 * Gera `src/data/scenes/scene-index.json` (D24): o índice leve das cenas carregadas sob demanda.
 * Rode depois de editar qualquer cena listada em `LAZY_SCENE_FILES` (o teste `scenes.test.ts`
 * falha se o índice estiver desatualizado).
 *
 * Uso (em apps/web): npx tsx scripts/scenes-build-index.ts
 */
import fs from "node:fs";
import path from "node:path";
import { LAZY_SCENE_FILES } from "../src/lib/scenes/lazy-files";
import { sceneIndexEntry } from "../src/lib/scenes/catalog-utils";

export function buildSceneIndex(dir: string): unknown[] {
  return LAZY_SCENE_FILES.map((file) => sceneIndexEntry(JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"))));
}

const DIR = path.resolve(__dirname, "../src/data/scenes");
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  const out = path.join(DIR, "scene-index.json");
  fs.writeFileSync(out, JSON.stringify(buildSceneIndex(DIR), null, 2) + "\n");
  console.log(`índice: ${LAZY_SCENE_FILES.length} cenas → ${path.relative(process.cwd(), out)}`);
}
