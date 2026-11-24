#!/usr/bin/env node
/**
 * Gera `public/data/countries-ne-50m.json` a partir do Natural Earth 1:50m empacotado
 * em `world-atlas/countries-50m.json` (T49 / RN21).
 *
 * - Remove o objeto `land` redundante, mantendo apenas `objects.countries` quantizado.
 * - Aplica zero-padding ISO 3166-1 (`String(id).padStart(3, "0")`) em todos os IDs numéricos
 *   para cumprir `AGENTS.md` §2.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(webRoot, "node_modules/world-atlas/countries-50m.json");
const outputPath = path.join(webRoot, "public/data/countries-ne-50m.json");

const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const geometries = raw.objects.countries.geometries.map((geometry) => {
  if (geometry.id === undefined || geometry.id === null) return geometry;
  const rawId = String(geometry.id).trim();
  const normalizedId = /^\d+$/.test(rawId) ? rawId.padStart(3, "0") : rawId;
  return { ...geometry, id: normalizedId };
});

const output = {
  type: raw.type,
  transform: raw.transform,
  objects: {
    countries: {
      type: raw.objects.countries.type,
      geometries,
    },
  },
  arcs: raw.arcs,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output), "utf8");

const bytes = fs.statSync(outputPath).size;
console.log(
  `[T49] Gerado ${path.relative(webRoot, outputPath)} (${geometries.length} geometrias, ${raw.arcs.length} arcos, ${(bytes / 1024).toFixed(1)} KiB)`
);
