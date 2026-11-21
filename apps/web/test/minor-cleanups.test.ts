import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { resolveEpoch } from "../src/lib/epoch/resolveEpoch";
import { ERA_STUDY_ENTITY_IDS, resolveEraStudyEntityId } from "../src/lib/timeline/era-study";
import { entities } from "../src/lib/tellus-bridge/catalog";

const webRoot = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(webRoot, rel), "utf-8");

describe("T23 · Limpezas menores (contexto de era, api-client, shader e ISS)", () => {
  test("1. TimelineBar deriva contexto de era via useEpochState/resolveEraStudyEntityId sem anos fixos", () => {
    const coldWarPreset = resolveEpoch({ startYear: 1947, endYear: 1991 });
    assert.equal(resolveEraStudyEntityId(coldWarPreset), "era:COLD_WAR");

    const coldWarYear = resolveEpoch({ startYear: 1974, endYear: 2024, selectedYear: 1969 });
    assert.equal(resolveEraStudyEntityId(coldWarYear), "era:COLD_WAR");

    const contemporary = resolveEpoch({ startYear: 1974, endYear: 2024 });
    assert.equal(resolveEraStudyEntityId(contemporary), null);

    const geological = resolveEpoch({ startYear: 1947, endYear: 1991, geologicalMa: 250 });
    assert.equal(resolveEraStudyEntityId(geological), null);

    const ww2 = resolveEpoch({ startYear: 1914, endYear: 1945 });
    assert.equal(resolveEraStudyEntityId(ww2), null);

    // Todos os IDs de era mapeados devem existir no manifesto do TellusBridge
    for (const [eraId, entityId] of Object.entries(ERA_STUDY_ENTITY_IDS)) {
      assert.ok(entityId && entities.has(entityId), `${eraId} → ${entityId} deve existir no manifesto do TellusBridge`);
    }

    const timelineBar = read("src/components/timeline/TimelineBar.tsx");
    assert.doesNotMatch(
      timelineBar,
      /startYear\s*===\s*1947\s*&&\s*endYear\s*===\s*1991/,
      "TimelineBar não deve mais usar condição fixa startYear === 1947 && endYear === 1991"
    );
    assert.match(timelineBar, /resolveEraStudyEntityId/);
  });

  test("2. lib/api-client.ts não passa opção server-only next.revalidate em fetch de cliente", () => {
    const apiClient = read("src/lib/api-client.ts");
    assert.doesNotMatch(
      apiClient,
      /\bnext\s*:\s*\{[^}]*revalidate/,
      "fetch de cliente não deve usar next: { revalidate }"
    );
  });

  test("3. EarthShaderMaterial.ts não mantém variáveis GLSL mortas dayLit/paleoLit", () => {
    const shader = read("src/components/globe/EarthShaderMaterial.ts");
    assert.doesNotMatch(shader, /\b(dayLit|paleoLit)\b/);
  });

  test("4. IssOrbitLayer.tsx não aloca new THREE.Vector3/Matrix4 dentro do useFrame", () => {
    const iss = read("src/components/globe/IssOrbitLayer.tsx");
    const useFrameStart = iss.indexOf("useFrame(");
    assert.ok(useFrameStart >= 0, "IssOrbitLayer deve usar useFrame");
    const useFrameEnd = iss.indexOf("});", useFrameStart);
    assert.ok(useFrameEnd > useFrameStart);
    const body = iss.slice(useFrameStart, useFrameEnd);
    assert.doesNotMatch(
      body,
      /new\s+THREE\.(Vector3|Matrix4)\b/,
      "useFrame em IssOrbitLayer não deve alocar Vector3/Matrix4 por quadro"
    );
  });
});
