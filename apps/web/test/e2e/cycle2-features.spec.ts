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

test("T44: Modo Coroplético (D22) — ativação, legenda, seleção de país e troca de indicador", async ({
  page,
}) => {
  const errors = attachErrorCollector(page);

  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();

  // Abre o seletor coroplético na barra superior
  const choroplethButton = page.getByTestId("top-nav-choropleth-button");
  await choroplethButton.click();
  const selector = page.getByTestId("choropleth-selector");
  await expect(selector).toBeVisible();

  // Seleciona PIB per capita (World Bank)
  await selector.getByTestId("choropleth-option-NY.GDP.PCAP.CD").click();
  await expect(selector).toBeHidden();
  await expect(choroplethButton).toHaveAttribute("aria-pressed", "true");

  // Legenda contínua + swatch de dado indisponível + fonte primária
  const legend = page.getByTestId("choropleth-legend");
  await expect(legend).toBeVisible();
  await expect(legend.getByTestId("choropleth-gradient-bar")).toBeVisible();
  await expect(legend.getByTestId("choropleth-missing-swatch")).toBeVisible();
  await expect(legend.getByRole("link", { name: /Banco Mundial/i })).toBeVisible();

  // Seleciona Brasil via paleta de busca e verifica tooltip coroplético + painel do país
  await page.keyboard.press("Control+k");
  const searchDialog = page.getByRole("dialog", { name: "Buscar no TellusPedia" });
  await expect(searchDialog).toBeVisible();
  const combobox = searchDialog.getByRole("combobox");
  await combobox.fill("Brasil");
  await expect(searchDialog.getByRole("option", { name: /^Brasil\b/ })).toHaveAttribute("aria-selected", "true");
  await combobox.press("Enter");

  const tooltip = page.getByTestId("choropleth-tooltip");
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText("Brasil");
  await expect(tooltip).toContainText("BRA");
  await expect(tooltip.getByTestId("choropleth-tooltip-value")).toBeVisible();
  await expect(tooltip.getByTestId("choropleth-tooltip-rank")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brasil", exact: true })).toBeVisible();

  // Troca de indicador pela legenda e desativa o modo temático
  await legend.getByRole("button", { name: "Trocar indicador coroplético" }).click();
  await expect(selector).toBeVisible();
  await selector.getByTestId("choropleth-option-SP.DYN.LE00.IN").click();
  await expect(legend).toContainText(/Expectativa de vida/i);

  await legend.getByRole("button", { name: "Desativar mapa temático" }).click();
  await expect(legend).toBeHidden();
  await expect(tooltip).toBeHidden();

  errors.assertClean();
});

test("T44: Observatório com NASA GIBS (D25) e Ventos / Correntes / Ambos (D27)", async ({
  page,
}) => {
  const errors = attachErrorCollector(page);

  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();

  await page.getByTestId("top-nav-observatory-button").click();
  const panel = page.getByTestId("observatory-panel");
  await expect(panel).toBeVisible();

  // 1. Ativa NASA GIBS (D25), expande controles e alterna produto para LST (com nota de referência)
  const gibsSwitch = panel.getByTestId("layer-toggle-NASA_GIBS");
  await gibsSwitch.click();
  await expect(gibsSwitch).toHaveAttribute("aria-checked", "true");

  await panel.getByTestId("layer-options-toggle-NASA_GIBS").click();
  const gibsControls = panel.getByTestId("gibs-controls");
  await expect(gibsControls).toBeVisible();
  await expect(gibsControls.getByTestId("gibs-product-ndvi")).toHaveAttribute("aria-pressed", "true");
  await expect(gibsControls.getByTestId("gibs-month")).toBeVisible();

  await gibsControls.getByTestId("gibs-product-lst").click();
  await expect(gibsControls.getByTestId("gibs-product-lst")).toHaveAttribute("aria-pressed", "true");
  await expect(gibsControls.getByTestId("gibs-reference-note")).toBeVisible();

  // 2. Ativa Ventos & Correntes Oceânicas (D27), alterna altitude/unidades e modos Ventos → Correntes → Ambos
  const windsSwitch = panel.getByTestId("layer-toggle-GLOBAL_WINDS");
  await windsSwitch.click();
  await expect(windsSwitch).toHaveAttribute("aria-checked", "true");

  await panel.getByTestId("layer-options-toggle-GLOBAL_WINDS").click();
  const windsControls = panel.getByTestId("winds-controls");
  await expect(windsControls).toBeVisible();
  await expect(windsControls.getByTestId("flow-mode-winds")).toHaveAttribute("aria-pressed", "true");

  await windsControls.getByTestId("winds-altitude-jet250").click();
  await expect(windsControls.getByTestId("winds-altitude-jet250")).toHaveAttribute("aria-pressed", "true");
  await windsControls.getByTestId("winds-unit-knots").click();
  await expect(windsControls.getByTestId("winds-unit-knots")).toHaveAttribute("aria-pressed", "true");

  // Modo Correntes Oceânicas
  await windsControls.getByTestId("flow-mode-currents").click();
  await expect(windsControls.getByTestId("flow-mode-currents")).toHaveAttribute("aria-pressed", "true");
  await expect(windsControls.getByTestId("currents-unit-knots")).toBeVisible();
  await windsControls.getByTestId("currents-unit-knots").click();
  await expect(windsControls.getByTestId("currents-unit-knots")).toHaveAttribute("aria-pressed", "true");

  // Modo Ambos (ventos atmosféricos + correntes oceânicas simultâneos)
  await windsControls.getByTestId("flow-mode-both").click();
  await expect(windsControls.getByTestId("flow-mode-both")).toHaveAttribute("aria-pressed", "true");
  await expect(windsControls.getByTestId("winds-altitude-surface")).toBeVisible();
  await expect(windsControls.getByTestId("currents-unit-ms")).toBeVisible();

  // Limpa as 2 camadas ativas (resetObservatory limpa camadas e fecha o painel)
  await expect(panel).toContainText("2 camadas ativas");
  await panel.getByRole("button", { name: "Limpar Camadas" }).click();
  await expect(panel).toBeHidden();
  await expect(page.getByTestId("top-nav-observatory-button")).toHaveAttribute("aria-pressed", "false");
  await page.getByTestId("top-nav-observatory-button").click();
  await expect(panel).toContainText("0 camadas ativas");

  errors.assertClean();
});

test("T44: Galeria /studies (D23) — navegação, filtros, idioma e abertura de estudo compartilhado", async ({
  page,
}) => {
  const errors = attachErrorCollector(page);

  await page.goto("/");
  await page.getByTestId("top-nav-studies-link").click();
  await expect(page).toHaveURL(/\/studies$/);
  await expect(page.getByRole("heading", { name: "Galeria de Estudos Públicos", level: 1 })).toBeVisible();

  // Aplica filtros combinados via formulário GET e verifica sincronia da URL
  const form = page.getByTestId("studies-filter-form");
  await form.locator("#studies-q").fill("Guerra");
  await form.locator("#studies-era").selectOption("COLD_WAR_1969");
  await form.locator("#studies-country").selectOption("BRA");
  await form.locator("#studies-cosmic").selectOption("false");
  await form.getByRole("button", { name: "Filtrar estudos" }).click();

  await expect(page).toHaveURL(/\/studies\?/);
  const filteredUrl = new URL(page.url());
  expect(filteredUrl.searchParams.get("q")).toBe("Guerra");
  expect(filteredUrl.searchParams.get("era")).toBe("COLD_WAR_1969");
  expect(filteredUrl.searchParams.get("country")).toBe("BRA");
  expect(filteredUrl.searchParams.get("cosmic")).toBe("false");
  await expect(form.locator("#studies-q")).toHaveValue("Guerra");

  // Limpa os filtros
  await page.getByRole("link", { name: "Limpar filtros" }).click();
  await expect(page).toHaveURL(/\/studies$/);

  // Troca idioma na galeria SSR (PT → EN → PT) sem erros de hidratação
  await Promise.all([
    page.waitForNavigation(),
    page.getByTestId("locale-switcher").click(),
  ]);
  await expect(page.getByRole("heading", { name: "Public Studies Gallery", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Filter studies" })).toBeVisible();

  await Promise.all([
    page.waitForNavigation(),
    page.getByTestId("locale-switcher").click(),
  ]);
  await expect(page.getByRole("heading", { name: "Galeria de Estudos Públicos", level: 1 })).toBeVisible();

  // Abertura de estudo compartilhado:
  // Usa cartão existente ou cria um estudo via API quando PostgreSQL está disponível;
  // em ambiente stateless (ex.: job Web do CI sem banco), valida o estado degradado gracioso.
  let openLink = page.getByTestId("study-gallery-card").first().getByRole("link", { name: "Abrir estudo" });
  const hasExistingCard = (await page.getByTestId("study-gallery-card").count()) > 0;

  if (!hasExistingCard) {
    const createRes = await page.request.post("/api/studies", {
      data: {
        title: "Estudo E2E Ciclo 2 — Brasil 1969",
        description: "Snapshot determinístico da suíte T44.",
        timelineStartYear: 1969,
        timelineEndYear: 1969,
        selectedCountryIsos: ["BRA"],
        activeCategories: ["SCIENCE_SPACE"],
        historicalEra: "COLD_WAR_1969",
      },
    });

    if (createRes.status() === 200) {
      const created = (await createRes.json()) as { id: string };
      await page.goto(`/studies?q=${encodeURIComponent("Estudo E2E Ciclo 2")}`);
      openLink = page.locator(`a[href="/study/${encodeURIComponent(created.id)}"]`).first();
    }
  }

  if ((await openLink.count()) > 0) {
    await openLink.click();
    await expect(page).toHaveURL(/\/study\//);
    await expect(page.locator("canvas").first()).toBeVisible();
    await expect(page.getByTestId("fork-study-banner")).toBeVisible();
  } else {
    // Sem PostgreSQL em produção (ex.: CI sem serviço de banco): estado degradado íntegro sem erro de console.
    await expect(page.getByRole("alert")).toContainText(/indisponível/i);
  }

  errors.assertClean();
});
