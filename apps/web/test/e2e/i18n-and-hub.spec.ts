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

test("T44: troca PT ↔ EN persiste após reload com país + camada ativa sem erro de hidratação e traduz /telluslab e /dossies", async ({
  page,
}) => {
  const errors = attachErrorCollector(page);

  await page.goto("/?visao=1&pais=BRA&observatorio=1&camadas=NASA_FIRMS");
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Brasil" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Observatório" })).toBeVisible();

  const switcher = page.getByTestId("locale-switcher");
  await expect(switcher).toHaveText("PT");

  // Troca para inglês na casca principal
  await switcher.click();
  await expect(switcher).toHaveText("EN");
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Brazil" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Observatory" })).toBeVisible();

  // Reload completo na mesma URL com país + Observatório + NASA_FIRMS: 0 erros de hidratação
  await page.reload();
  await expect(page.locator("canvas").first()).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("locale-switcher")).toHaveText("EN");
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Brazil" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Observatory" })).toBeVisible();
  await expect(page.getByTestId("top-nav-observatory-button")).toHaveAttribute("aria-pressed", "true");

  // Navegação para /telluslab em EN
  await page.goto("/telluslab");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByTestId("locale-switcher")).toHaveText("EN");
  await expect(page.getByRole("link", { name: "← TellusPedia Globe" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Progress by complexity" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dossiers & historical figures" })).toBeVisible();

  // Navegação para o dossiê /dossies/astronomia-optica em EN
  const dossierLink = page.getByRole("link", { name: "Astronomy, optics & telescopes" });
  await expect(dossierLink).toBeVisible();
  await dossierLink.click();
  await expect(page).toHaveURL(/\/dossies\/astronomia-optica$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Astronomy, optics & telescopes", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Globe", exact: true })).toBeVisible();

  // Alterna de volta para PT no Server Component (recarrega SSR em português)
  await Promise.all([
    page.waitForNavigation(),
    page.getByTestId("locale-switcher").click(),
  ]);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.getByTestId("locale-switcher")).toHaveText("PT");
  await expect(page.getByRole("heading", { name: "Astronomia, óptica e telescópios", level: 1 })).toBeVisible();

  errors.assertClean();
});
