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

test("D29: Lixo Marítimo, 5 giros oceânicos e simulador de deriva funcionam no WebGL em PT e EN", async ({
  page,
}) => {
  const errors = attachErrorCollector(page);

  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();

  // Abre painel do Observatório e liga a camada Lixo Marítimo & Giros Oceânicos
  await page.getByTestId("top-nav-observatory-button").click();
  await expect(page.getByTestId("observatory-panel")).toBeVisible();

  await page.getByTestId("layer-toggle-MARINE_DEBRIS").click();
  await page.getByTestId("layer-options-toggle-MARINE_DEBRIS").click();

  await expect(page.getByTestId("marine-debris-controls")).toBeVisible();
  await expect(page.getByTestId("debris-provenance-note")).toContainText("Giros observados:");
  await expect(page.getByTestId("debris-provenance-note")).toContainText("Advecção Lagrangiana:");

  // Seleciona o Giro do Atlântico Sul e verifica a ficha científica
  await page.getByTestId("gyre-btn-south-atlantic").click();
  await expect(page.getByTestId("debris-gyre-card")).toContainText("Giro do Atlântico Sul");

  // Lança traçadores a partir do preset costeiro de Santos e confere convergência
  await page.getByTestId("debris-preset-santos").click();
  const simResult = page.getByTestId("debris-simulation-result");
  await expect(simResult).toBeVisible();
  await expect(simResult).toContainText("Giro do Atlântico Sul");
  await expect(simResult).toContainText("km");

  // Alterna windage (3%) e horizonte (36m)
  await page.getByTestId("debris-windage-3").click();
  await expect(page.getByTestId("debris-windage-3")).toHaveAttribute("aria-pressed", "true");
  await page.getByTestId("debris-horizon-36").click();
  await expect(page.getByTestId("debris-horizon-36")).toHaveAttribute("aria-pressed", "true");

  // Tradução instantânea PT → EN sem erros
  await page.getByTestId("locale-switcher").click();
  await expect(page.getByTestId("debris-provenance-note")).toContainText("Observed gyres:");
  await expect(page.getByTestId("debris-gyre-card")).toContainText("South Atlantic Gyre");
  await expect(simResult).toContainText("South Atlantic Gyre");

  errors.assertClean();
});
