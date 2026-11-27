import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  attachErrorCollector,
  installDeterministicRoutes,
  paceSoftwareWebGL,
} from "./helpers/cycle2-fixtures";

test.beforeEach(async ({ page }) => {
  await paceSoftwareWebGL(page);
  await installDeterministicRoutes(page);
});

test("D42: ScenePlayerOverlay, entidades históricas e países-piloto renderizam 100% em EN sem erro de hidratação", async ({
  page,
}) => {
  const errors = attachErrorCollector(page);
  const shotDir = process.env.D42_SCREENSHOT_DIR;

  // 1) Cena histórica `magellan-1519` em EN
  await page.goto("/?visao=1&cena=magellan-1519");
  await expect(page.locator("canvas").first()).toBeVisible();

  const switcher = page.getByTestId("locale-switcher");
  await expect(switcher).toHaveText("PT");
  await switcher.click();
  await expect(switcher).toHaveText("EN");

  await expect(page.getByText("CIRCUMNAVIGATION", { exact: true })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByText("Nautical telemetry & shipboard log", { exact: true })
  ).toBeVisible();
  await expect(page.getByText(/Leagues sailed/i).first()).toBeVisible();
  await expect(page.getByText(/Shipboard Journal — Antonio Pigafetta/i).first()).toBeVisible();

  // Abre os detalhes (Participantes e Crônica) para verificar tradução profunda da cena
  const participantsSummary = page.locator("summary", { hasText: /Participants/i }).first();
  await expect(participantsSummary).toBeVisible();
  await participantsSummary.click();
  await expect(page.getByText(/Flagship carrack/i).first()).toBeVisible();

  if (shotDir) {
    await page.screenshot({
      path: path.join(shotDir, "d42-scene-magellan-en.png"),
    });
  }

  // 2) Entidade histórica `PRU` (Reino da Prússia, 1870) em EN: InspectorHUD + ReaderMode
  await page.goto("/?visao=1&ano=1870&pais=PRU");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Kingdom of Prussia" }).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText("Autocratic Constitutional Monarchy").first()).toBeVisible();
  await expect(page.getByText("King of Prussia / Imperial Chancellor").first()).toBeVisible();

  if (shotDir) {
    await page.screenshot({
      path: path.join(shotDir, "d42-hist-pru-inspector-en.png"),
    });
  }

  await page.getByRole("button", { name: /Deep Read/i }).click();
  const pruDialog = page.getByRole("dialog");
  await expect(pruDialog).toBeVisible({ timeout: 15_000 });
  await expect(pruDialog.getByRole("heading", { level: 1 })).toContainText(
    "The Rise of Prussia and German Unification"
  );
  expect(await pruDialog.locator("p div").count()).toBe(0);

  if (shotDir) {
    await page.screenshot({
      path: path.join(shotDir, "d42-hist-pru-reader-en.png"),
    });
  }

  // 3) País-piloto `BRA` em EN no ReaderMode
  await page.goto("/?visao=1&pais=BRA");
  await expect(page.getByRole("heading", { name: "Brazil" }).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.getByRole("button", { name: /Deep Read/i }).click();

  const braDialog = page.getByRole("dialog");
  await expect(braDialog).toBeVisible({ timeout: 15_000 });
  await expect(braDialog.getByRole("heading", { level: 1 })).toContainText(
    "Continental Dimensions, Biomes, and Natural Resources"
  );
  expect(await braDialog.locator("p div").count()).toBe(0);

  if (shotDir) {
    await page.screenshot({
      path: path.join(shotDir, "d42-pilot-bra-reader-en.png"),
    });
  }

  errors.assertClean();
});
