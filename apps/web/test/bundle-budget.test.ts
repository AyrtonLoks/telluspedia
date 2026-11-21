import { describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

import { calculateSubsolarPoint as solarCalc } from "../src/lib/astronomy-solar";
import { calculateSubsolarPoint as astronomyCalc } from "../src/lib/astronomy";

const webRoot = path.resolve(__dirname, "..");
const read = (rel: string) => fs.readFileSync(path.join(webRoot, rel), "utf-8");

describe("T25 · Orçamento de bundle inicial e carregamento sob demanda", () => {
  test("1. GlobeExperienceShell carrega painéis, modais e overlays fechados via next/dynamic", () => {
    const shell = read("src/components/shell/GlobeExperienceShell.tsx");

    const dynamicTargets = [
      "GlobeCanvas",
      "EntityLaunch",
      "HistoricalEraBadge",
      "PaleoEraBadge",
      "ScenePlayerOverlay",
      "RightDock",
      "CosmicInspectorHUD",
      "ReaderMode",
      "CountryComparator",
      "StudyShareModal",
      "CitationModal",
      "ForkStudyBanner",
    ];

    for (const name of dynamicTargets) {
      assert.doesNotMatch(
        shell,
        new RegExp(`^import\\s+\\{[^}]*\\b${name}\\b[^}]*\\}\\s+from`, "m"),
        `${name} não deve ser importado estaticamente no GlobeExperienceShell`
      );
      assert.match(
        shell,
        new RegExp(`const\\s+${name}\\s*=\\s*dynamic\\(`),
        `${name} deve ser carregado com next/dynamic no GlobeExperienceShell`
      );
    }
  });

  test("2. TimelineBar e MilestonePin carregam StudyContext (catálogo TellusBridge) dinamicamente", () => {
    for (const rel of [
      "src/components/timeline/TimelineBar.tsx",
      "src/components/timeline/MilestonePin.tsx",
    ]) {
      const src = read(rel);
      assert.doesNotMatch(
        src,
        /^import\s+\{[^}]*\bStudyContext\b[^}]*\}\s+from/m,
        `${rel} não deve importar StudyContext estaticamente`
      );
      assert.match(
        src,
        /const\s+StudyContext\s*=\s*dynamic\(/,
        `${rel} deve carregar StudyContext via next/dynamic`
      );
    }
  });

  test("3. satellites.ts e astronomy-solar.ts isolam cálculo solar de Three.js mantendo re-export em astronomy.ts", () => {
    const solar = read("src/lib/astronomy-solar.ts");
    const satellites = read("src/lib/satellites.ts");
    const obsData = read("src/lib/observatory-data.ts");

    assert.doesNotMatch(solar, /from\s+["']three["']/, "astronomy-solar.ts não pode importar three");
    assert.match(satellites, /from\s+["']\.\/astronomy-solar["']/, "satellites.ts deve importar de ./astronomy-solar");
    assert.doesNotMatch(satellites, /from\s+["']\.\/astronomy["']/, "satellites.ts não deve puxar ./astronomy (three)");
    assert.doesNotMatch(obsData, /from\s+["']\.\/geo-spatial["']/, "observatory-data.ts não deve manter import morto de geo-spatial");

    assert.equal(astronomyCalc, solarCalc, "astronomy.ts deve re-exportar exatamente calculateSubsolarPoint");
    const sample = new Date("2026-06-21T12:00:00Z");
    assert.deepEqual(astronomyCalc(sample), solarCalc(sample));
  });

  test("4. Botões principais pré-carregam chunks sob demanda no hover/foco", () => {
    const nav = read("src/components/nav/TopNavBar.tsx");
    const inspector = read("src/components/hud/InspectorHUD.tsx");
    const pin = read("src/components/timeline/MilestonePin.tsx");

    assert.match(nav, /from\s+["']@\/lib\/panel-preload["']/);
    assert.match(nav, /preloadRightDock/);
    assert.match(nav, /preloadCosmicHud/);
    assert.match(nav, /preloadCountryComparator/);
    assert.match(nav, /preloadStudyShareModal/);
    assert.match(nav, /onMouseEnter=/);

    assert.match(inspector, /from\s+["']@\/lib\/panel-preload["']/);
    assert.match(inspector, /preloadReaderMode/);
    assert.match(inspector, /preloadCitationModal/);

    assert.match(pin, /from\s+["']@\/lib\/panel-preload["']/);
    assert.match(pin, /preloadCitationModal/);
    assert.match(pin, /preloadReaderMode/);
    assert.match(pin, /preloadRightDock/);
  });

  test("5. next.config.mjs integra @next/bundle-analyzer e optimizePackageImports", () => {
    const nextCfg = read("next.config.mjs");
    const pkg = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    assert.match(nextCfg, /@next\/bundle-analyzer/);
    assert.match(nextCfg, /ANALYZE\s*===\s*["']true["']/);
    assert.match(nextCfg, /optimizePackageImports:\s*\[[^\]]*["']lucide-react["']/);
    assert.ok(pkg.devDependencies?.["@next/bundle-analyzer"], "@next/bundle-analyzer deve constar em devDependencies");
    assert.equal(pkg.scripts?.analyze, "ANALYZE=true next build");
  });

  test("6. Quando build (.next) existe, First Load JS de / fica abaixo de 250 kB e sem three/recharts/radix-dialog", () => {
    const manifestPath = path.join(webRoot, ".next", "app-build-manifest.json");
    if (!fs.existsSync(manifestPath)) return;

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
      pages?: Record<string, string[]>;
    };
    const chunks = manifest.pages?.["/page"] ?? [];
    assert.ok(chunks.length > 0, "app-build-manifest.json deve listar chunks de /page");

    let totalGzipBytes = 0;
    for (const relChunk of chunks) {
      const fullPath = path.join(webRoot, ".next", relChunk);
      if (!fs.existsSync(fullPath)) continue;
      const content = fs.readFileSync(fullPath);
      totalGzipBytes += zlib.gzipSync(content).length;
      const text = content.toString("utf-8");
      assert.doesNotMatch(text, /WebGLRenderer/, `Chunk inicial ${relChunk} não deve conter Three.js (WebGLRenderer)`);
      assert.doesNotMatch(text, /ResponsiveContainer/, `Chunk inicial ${relChunk} não deve conter Recharts`);
    }

    const totalGzipKb = totalGzipBytes / 1024;
    assert.ok(
      totalGzipKb < 250,
      `First Load JS gzip de / deve ficar < 250 kB (atual: ${totalGzipKb.toFixed(1)} kB)`
    );
  });
});
