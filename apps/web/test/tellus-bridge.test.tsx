import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CurriculumLinks } from "../src/components/tellus-bridge/StudyContext";
import { StudyHub } from "../src/components/tellus-bridge/StudyHub";
import { books, entities, manifest, nodes, registry, resolveLaunch, studyUrl } from "../src/lib/tellus-bridge/catalog";
import { findMilestoneById, NUMERIC_TO_ISO } from "../src/lib/country-data";
import { getPublishedDossier } from "../src/lib/dossiers-catalog";
import { HISTORICAL_ERAS } from "../src/lib/historical-entities";
import { isPlayableScene, PUBLISHED_SCENES } from "../src/lib/scenes/catalog";
import { ERA_STUDY_ENTITY_IDS } from "../src/lib/timeline/era-study";
import { parseLabLink, pediaUrl, summarize, validateRegistry, validateManifest, validateSnapshot } from "../src/lib/tellus-bridge/contract/index.mjs";
import type { TellusLabSnapshotV1 } from "../src/lib/tellus-bridge/contract/types.mjs";

const link = entities.get("observatory:COSMOS")!;
const nodeId = "DOM-PHYS:6.5";
const dueAt = "2026-11-18T18:00:00.000Z";

function progress(): TellusLabSnapshotV1 {
  const proficiency: TellusLabSnapshotV1["proficiency"] = Object.fromEntries([...nodes.keys()].map(id => [id, {
    state: id === nodeId ? "S6" : "S0",
    nextReviewAt: id === nodeId ? dueAt : null,
    stability: null, difficulty: null, sessions: 0, lastDiagnosis: null,
  }]));
  return { kind: "TellusLabSnapshotV1", schemaVersion: "1.0.0", sourceApp: "telluslab",
    exportedAt: "2026-11-19T18:00:00.000Z", proficiency, summary: summarize(registry, proficiency),
    overdue: [{ nodeId, dueAt, cards: 4 }], suggestions: [{ nodeId, reason: "review" }],
  };
}

test("catálogo espelhado tem 299 nós, 197 obras e DAGs íntegros", () => {
  assert.equal(validateRegistry(registry).domains.length, 8);
  assert.equal(nodes.size, 299);
  assert.equal(books.size, 197);
  const cycle = structuredClone(registry);
  cycle.domains[0].nodes[0].prerequisites.push(cycle.domains[0].nodes[0].id);
  assert.throws(() => validateRegistry(cycle), /ciclo/);
  cycle.domains[0].nodes[0].prerequisites = [];
  cycle.domains[0].nodes[0].crossPrerequisites.push("DOM-LIT:1.1");
  assert.throws(() => validateRegistry(cycle), /ciclo/);
  cycle.domains[0].nodes[0].crossPrerequisites = ["DOM-LIT:90.1"];
  assert.throws(() => validateRegistry(cycle), /ausente/);
});

test("manifesto cobre domínios e os eventos e países existem no TellusPedia", () => {
  assert.equal(new Set(validateManifest(manifest, registry).links.flatMap(entry =>
    entry.nodeIds.map(id => id.split(":")[0]))).size, 8);
  for (const entry of manifest.links) {
    const key = entry.entityId.split(":")[1];
    if (entry.kind === "event") assert(findMilestoneById(key), entry.entityId);
    if (entry.kind === "country") assert(Object.values(NUMERIC_TO_ISO).includes(key), entry.entityId);
  }
  const invalid = structuredClone(manifest);
  invalid.links[0].bookIds.push("BIB-MATH-99");
  assert.throws(() => validateManifest(invalid, registry), /vínculo/);
});

test("validação do snapshot e renderização com e sem proficiência", () => {
  const snapshot = validateSnapshot(progress(), registry);
  const none = renderToStaticMarkup(<CurriculumLinks link={link} snapshot={null} />);
  const loaded = renderToStaticMarkup(<CurriculumLinks link={link} snapshot={snapshot} />);
  for (const html of [none, loaded]) {
    assert.match(html, /Aprofundar no TellusLab/);
    assert.match(html, /Teoria da Difração/);
    assert.match(html, /BIB-PHYS-/);
    assert.match(html, /node=DOM-PHYS%3A6.5&amp;ref=telluspedia/);
  }
  assert.match(none, /DOM-PHYS:6.5 · S0/);
  assert.match(loaded, /DOM-PHYS:6.5 · S6/);
  assert.match(renderToStaticMarkup(<StudyHub />), /8 domínios · 197 obras · 299 macrotemas/);
  snapshot.overdue[0].cards = 0;
  assert.throws(() => validateSnapshot(snapshot, registry), /schema/);
});

test("deep-links retornam ao nó e descartam uma origem incompatível", () => {
  const origin = { slug: "physics", nodeId } as const;
  const pedia = new URL(pediaUrl("http://127.0.0.1:3000", link, origin));
  assert.deepEqual(resolveLaunch(pedia.searchParams), { link, origin });
  const lab = new URL(studyUrl(origin.slug, origin.nodeId, link.entityId));
  assert.equal(lab.pathname, "/lab");
  assert.equal(parseLabLink(lab.search, registry, manifest).nodeId, nodeId);
  pedia.searchParams.set("fromDomain", "engineering");
  assert.deepEqual(resolveLaunch(pedia.searchParams), { link, origin: null });
  pedia.searchParams.set("entity", "observatory:invalid");
  assert.equal(resolveLaunch(pedia.searchParams), null);
});

test("D26 · cobertura curricular ≥ 85% dos 299 nós, todas as eras, cenas D24 e ≥ 20 países sem links quebrados", () => {
  const coveredNodes = new Set(manifest.links.flatMap((entry) => entry.nodeIds));
  const coverageRatio = coveredNodes.size / nodes.size;
  assert.ok(
    coverageRatio >= 0.85,
    `Cobertura curricular abaixo de 85%: ${coveredNodes.size}/${nodes.size} (${(coverageRatio * 100).toFixed(1)}%)`
  );

  // Todas as eras históricas (exceto contemporânea) devem estar mapeadas e presentes no manifesto
  const historicalEraIds = Object.keys(HISTORICAL_ERAS).filter((id) => id !== "CONTEMPORARY");
  for (const eraId of historicalEraIds) {
    const entityId = ERA_STUDY_ENTITY_IDS[eraId as keyof typeof ERA_STUDY_ENTITY_IDS];
    assert.ok(entityId, `Era ${eraId} deve estar em ERA_STUDY_ENTITY_IDS`);
    assert.ok(entities.has(entityId), `Entidade ${entityId} deve existir no manifesto`);
  }

  // Todas as 7 cenas históricas tocáveis (D24) devem ter vínculo no manifesto
  const playableScenes = PUBLISHED_SCENES.filter(isPlayableScene);
  assert.ok(playableScenes.length >= 7, `Esperava ≥ 7 cenas tocáveis, achou ${playableScenes.length}`);
  for (const scene of playableScenes) {
    const entityId = `event:${scene.id}`;
    assert.ok(entities.has(entityId), `Cena D24 ${entityId} deve estar vinculada no manifesto`);
    assert.ok(findMilestoneById(scene.id), `Marco ${scene.id} deve existir em findMilestoneById`);
  }

  // ≥ 20 países distintos com ISOs válidos e rotas /pais/<iso>
  const countryLinks = manifest.links.filter((entry) => entry.kind === "country");
  assert.ok(countryLinks.length >= 20, `Esperava ≥ 20 países no manifesto, achou ${countryLinks.length}`);
  const validIsos = new Set(Object.values(NUMERIC_TO_ISO));
  for (const entry of countryLinks) {
    const iso = entry.entityId.split(":")[1];
    assert.ok(validIsos.has(iso), `ISO inválido no manifesto: ${entry.entityId}`);
    assert.equal(entry.target, `/pais/${iso.toLowerCase()}`, `Target inválido para ${entry.entityId}`);
  }

  // Todos os dossiês e figuras históricas devem apontar para um dossiê publicado sem 404
  const dossierLinks = manifest.links.filter((entry) => entry.kind === "dossier" || entry.kind === "figure");
  for (const entry of dossierLinks) {
    const slug = entry.entityId.split(":")[1];
    assert.equal(entry.target, `/dossies/${slug}`, `Target inesperado para ${entry.entityId}`);
    assert.ok(getPublishedDossier(slug), `Dossiê publicado ausente para ${entry.entityId}`);
  }
});
