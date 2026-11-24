import { expect, test } from "@playwright/test";
import {
  attachErrorCollector,
  installDeterministicRoutes,
  paceSoftwareWebGL,
} from "./helpers/cycle2-fixtures";

test.beforeEach(async ({ page }) => {
  await paceSoftwareWebGL(page);
  await installDeterministicRoutes(page);

  await page.route("**/api/observatory/inpe-fires", (route) =>
    route.fulfill({
      json: {
        data: {
          hotspots: [
            {
              id: "inpe-e2e-1",
              lat: -3.32,
              lng: -50.45,
              brightness: 365,
              frp: 73.6,
              confidence: "high",
              satellite: "VIIRS",
              acqDate: "2026-11-24",
              acqTime: "0000",
            },
          ],
          total: 42,
          referenceDate: "2026-11-24",
          byBiome: [
            { id: "amazonia", namePt: "Amazônia", nameEn: "Amazon", count: 24, totalFrp: 980, maxFrp: 73.6 },
            { id: "cerrado", namePt: "Cerrado", nameEn: "Cerrado", count: 12, totalFrp: 410, maxFrp: 48.2 },
            { id: "pantanal", namePt: "Pantanal", nameEn: "Pantanal", count: 6, totalFrp: 150, maxFrp: 29.0 },
          ],
          satellites: ["GOES-19", "AQUA_M-T"],
          scope: "America_Sul",
          sourceUrl: "https://queimadas.dgi.inpe.br/queimadas/dados-abertos",
        },
        meta: {
          source: "live",
          provider: "INPE BDQueimadas (Programa Queimadas)",
          fetchedAt: "2026-11-24T18:00:00.000Z",
          stale: false,
        },
      },
    })
  );

  await page.route("**/api/observatory/inpe-deforestation", (route) =>
    route.fulfill({
      json: {
        data: {
          prodes: {
            amazonia: [
              { year: 2023, km2: 9064, status: "consolidated" },
              { year: 2024, km2: 6518, status: "consolidated" },
              { year: 2025, km2: 5731, status: "estimated" },
            ],
            cerrado: [
              { year: 2023, km2: 11012, status: "consolidated" },
              { year: 2024, km2: 8174, status: "consolidated" },
              { year: 2025, km2: 7235, status: "estimated" },
            ],
          },
          prodesReferenceYear: 2025,
          prodesCitation: "INPE / MCTI · Programa PRODES & DETER / TerraBrasilis (2015–2025)",
          prodesSourceUrls: {
            amazonia: "https://terrabrasilis.dpi.inpe.br/app/dashboard/deforestation/biomes/legal_amazon/rates",
            cerrado: "https://terrabrasilis.dpi.inpe.br/app/dashboard/deforestation/biomes/cerrado/rates",
          },
          deterAlerts: [
            {
              id: "deter-e2e-1",
              lat: -6.2,
              lng: -55.1,
              biome: "amazonia",
              uf: "PA",
              municipality: "Altamira",
              areaKm2: 1.42,
              className: "DESMATAMENTO_CR",
              date: "2026-11-20",
            },
          ],
          deterWindowDays: 30,
          deterTotalKm2: 1.42,
          deterAvailable: true,
          deterPortalUrl: "https://terrabrasilis.dpi.inpe.br/",
        },
        meta: {
          source: "live",
          provider: "INPE TerraBrasilis (DETER + PRODES)",
          fetchedAt: "2026-11-24T18:00:00.000Z",
          stale: false,
        },
      },
    })
  );
});

test("D30: INPE BDQueimadas por bioma e TerraBrasilis DETER/PRODES funcionam em PT e EN no WebGL", async ({
  page,
}) => {
  const errors = attachErrorCollector(page);

  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();

  await page.getByTestId("top-nav-observatory-button").click();
  await expect(page.getByTestId("observatory-panel")).toBeVisible();

  // 1. Queimadas: alterna de NASA FIRMS para INPE BDQueimadas e confere agregação por bioma
  await page.getByTestId("layer-toggle-NASA_FIRMS").click();
  await page.getByTestId("layer-options-toggle-NASA_FIRMS").click();
  await page.getByTestId("fires-source-inpe").click();

  const biomeSummary = page.getByTestId("inpe-biome-summary");
  await expect(biomeSummary).toBeVisible();
  await expect(biomeSummary).toContainText("Amazônia");
  await expect(biomeSummary).toContainText("24");
  await expect(biomeSummary).toContainText("INPE / MCTI · BDQueimadas");

  // 2. Desmatamento INPE (DETER / PRODES): liga camada, confere gráfico PRODES e alterna Amazônia ↔ Cerrado
  await page.getByTestId("layer-toggle-INPE_DEFORESTATION").click();
  await page.getByTestId("layer-options-toggle-INPE_DEFORESTATION").click();

  const defControls = page.getByTestId("inpe-deforestation-controls");
  await expect(defControls).toBeVisible();
  await expect(page.getByTestId("prodes-chart")).toBeVisible();
  await expect(page.getByTestId("inpe-deter-status")).toContainText("1,42 km²");

  await page.getByTestId("inpe-biome-cerrado").click();
  await expect(page.getByTestId("inpe-biome-cerrado")).toHaveAttribute("aria-pressed", "true");
  await expect(defControls).toContainText("7.235 km²");

  // 3. Troca para EN sem erros
  await page.getByTestId("locale-switcher").click();
  await expect(biomeSummary).toContainText("Hotspots by Brazilian biome (INPE)");
  await expect(defControls).toContainText("Official PRODES series");

  errors.assertClean();
});
