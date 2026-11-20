import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveEpoch, type EpochInput, type EpochState } from "../src/lib/epoch/resolveEpoch";

const DEFAULT: EpochInput = { startYear: 1974, endYear: 2024 };
const run = (over: EpochInput) => resolveEpoch({ ...DEFAULT, ...over });

type Case = [name: string, input: EpochInput, expected: Partial<EpochState>];

const CASES: Case[] = [
  // ---- Contemporâneo / ano
  ["estado inicial (1974–2024, nada selecionado)", {}, { mode: "CONTEMPORARY", effectiveYear: null, historicalEraId: "CONTEMPORARY", activeScene: null, isContemporary: true, geologicalMa: null }],
  ["ano 2010 selecionado", { selectedYear: 2010 }, { mode: "CONTEMPORARY", effectiveYear: 2010, isContemporary: true }],
  ["ano 1969 selecionado NÃO ativa Apollo (playback)", { selectedYear: 1969 }, { mode: "HISTORICAL", effectiveYear: 1969, historicalEraId: "COLD_WAR_1969", activeScene: null, isContemporary: true }],
  ["ano fracionário do playback 1969.37 não ativa Apollo", { selectedYear: 1969.37 }, { activeScene: null }],
  ["ano 1519 selecionado NÃO ativa Magalhães", { selectedYear: 1519 }, { activeScene: null, mode: "HISTORICAL", isContemporary: false }],
  ["ano 1956 é antes da Era Espacial", { selectedYear: 1956 }, { isContemporary: false }],
  ["ano 1957 já é Era Espacial", { selectedYear: 1957 }, { isContemporary: true }],
  ["ano 1914 → era WW1", { selectedYear: 1914 }, { historicalEraId: "WW1_1914", mode: "HISTORICAL", isContemporary: false }],
  ["ano 1880 → era Prússia", { selectedYear: 1880 }, { historicalEraId: "PRUSSIA_1870" }],
  ["ano 1991 → contemporâneo", { selectedYear: 1991 }, { historicalEraId: "CONTEMPORARY", mode: "CONTEMPORARY" }],
  ["intervalo Guerra Fria sem ano → 1969 representativo, sem Apollo", { startYear: 1947, endYear: 1991 }, { effectiveYear: 1969, historicalEraId: "COLD_WAR_1969", activeScene: null }],
  ["intervalo Guerras Mundiais sem ano → 1939, sem telemetria", { startYear: 1914, endYear: 1945 }, { effectiveYear: 1939, historicalEraId: "WW2_1939", isContemporary: false }],
  ["ano do marco vale quando não há ano selecionado", { selectedMilestoneId: "bra-1889", milestoneYear: 1889 }, { effectiveYear: 1889, historicalEraId: "PRUSSIA_1870" }],
  ["ano selecionado tem precedência sobre o ano do marco", { selectedYear: 2000, milestoneYear: 1889, selectedMilestoneId: "bra-1889" }, { effectiveYear: 2000 }],

  // ---- Cenas explícitas
  ["marco usa-1969 ativa Apollo", { selectedMilestoneId: "usa-1969", milestoneYear: 1969 }, { activeScene: "APOLLO11", isContemporary: true }],
  ["marco glo-1969 ativa Apollo", { selectedMilestoneId: "glo-1969", milestoneYear: 1969 }, { activeScene: "APOLLO11" }],
  ["rota de Magalhães no player ativa a cena", { activeRouteId: "magellan-1519", selectedYear: 1519 }, { activeScene: "MAGELLAN", mode: "HISTORICAL", isContemporary: false }],
  ["marco esp-1519 ativa Magalhães", { selectedMilestoneId: "esp-1519", milestoneYear: 1519 }, { activeScene: "MAGELLAN" }],
  ["Magalhães tem precedência sobre Apollo", { activeRouteId: "magellan-1519", selectedMilestoneId: "glo-1969" }, { activeScene: "MAGELLAN" }],
  ["Magalhães suprime telemetria mesmo com ano contemporâneo", { activeRouteId: "magellan-1519", selectedYear: 2020 }, { isContemporary: false }],
  ["rota desconhecida não ativa cena", { activeRouteId: "outra-rota" }, { activeScene: null }],

  // ---- Geológico (precedência máxima)
  ["selectedGeologicalMa 150", { geologicalMa: 150 }, { mode: "GEOLOGICAL", geologicalMa: 150 }],
  ["geologicalMa sem modo também ativa", { geologicalMa: 200 }, { mode: "GEOLOGICAL", geologicalMa: 200 }],
  ["marco pangea-250ma ativa geológico", { selectedMilestoneId: "pangea-250ma" }, { mode: "GEOLOGICAL", geologicalMa: 250 }],
  ["marco gondwana-150ma ativa geológico", { selectedMilestoneId: "gondwana-150ma" }, { geologicalMa: 150 }],
  ["marco kpg-66ma ativa geológico", { selectedMilestoneId: "kpg-66ma" }, { geologicalMa: 66 }],
  ["marco breakup-200ma ativa geológico", { selectedMilestoneId: "breakup-200ma" }, { geologicalMa: 200 }],
  ["marco contemporary-0ma NÃO ativa geológico", { selectedMilestoneId: "contemporary-0ma" }, { mode: "CONTEMPORARY", geologicalMa: null }],
  ["geológico vence rota de Magalhães", { geologicalMa: 250, activeRouteId: "magellan-1519" }, { mode: "GEOLOGICAL", activeScene: null }],
  ["geológico vence Apollo", { geologicalMa: 150, selectedMilestoneId: "glo-1969" }, { activeScene: null }],
  ["geológico vence ano contemporâneo", { geologicalMa: 66, selectedYear: 2024 }, { isContemporary: false, mode: "GEOLOGICAL" }],
  ["idade negativa é ignorada", { geologicalMa: -5 }, { mode: "CONTEMPORARY", geologicalMa: null }],
  ["idade NaN é ignorada", { geologicalMa: Number.NaN }, { geologicalMa: null }],
];

describe("T12: resolveEpoch (tabela de casos)", () => {
  for (const [name, input, expected] of CASES) {
    test(name, () => {
      const out = run(input);
      for (const [k, v] of Object.entries(expected)) {
        assert.deepEqual(out[k as keyof EpochState], v, `${k}: esperado ${String(v)}, obtido ${String(out[k as keyof EpochState])}`);
      }
    });
  }

  test("é pura: mesma entrada → mesma saída, sem mutar a entrada", () => {
    const input: EpochInput = { ...DEFAULT, selectedYear: 1969, activeRouteId: "x", geologicalMa: null };
    const frozen = JSON.stringify(input);
    assert.deepEqual(resolveEpoch(input), resolveEpoch(input));
    assert.equal(JSON.stringify(input), frozen);
  });

  test("playback varrendo 1960–1975 nunca liga a cena Apollo", () => {
    for (let y = 1960; y <= 1975; y += 0.015) {
      assert.equal(run({ selectedYear: Number(y.toFixed(3)) }).activeScene, null, `ano ${y}`);
    }
  });
});

// Critério de aceite: componentes não calculam o modo localmente nem usam IDs mágicos.
describe("T12: componentes usam o seletor único", () => {
  const root = path.resolve(__dirname, "..");
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
      const p = path.join(dir, d.name);
      return d.isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
    });
  const files = [...walk(path.join(root, "src/components")), ...walk(path.join(root, "src/app"))];

  test("nenhum .tsx usa os IDs especiais como string literal", () => {
    const re = /"(pangea-250ma|gondwana-150ma|kpg-66ma|breakup-200ma|contemporary-0ma|magellan-1519|esp-1519|usa-1969|glo-1969)"/;
    const hits = files.filter((f) => re.test(fs.readFileSync(f, "utf-8"))).map((f) => path.relative(root, f));
    assert.deepEqual(hits, []);
  });

  test("nenhum .tsx calcula isGeologicalActive/isApolloActive/isMagellanActive localmente", () => {
    const re = /\b(?:const|let)\s+(isGeologicalActive|isApolloActive|isMagellanActive)\s*=/;
    const hits = files.filter((f) => re.test(fs.readFileSync(f, "utf-8"))).map((f) => path.relative(root, f));
    assert.deepEqual(hits, []);
  });

  test("nenhum .tsx ativa cena pelo ano (=== 1969 / === 1519)", () => {
    const re = /===\s*(1969|1519)\b/;
    const hits = files.filter((f) => re.test(fs.readFileSync(f, "utf-8"))).map((f) => path.relative(root, f));
    assert.deepEqual(hits, []);
  });
});
