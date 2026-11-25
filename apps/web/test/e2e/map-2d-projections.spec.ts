import { expect, test, type Page } from "@playwright/test";

function attachErrorCollectors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  return { pageErrors, consoleErrors };
}

test.describe("D33: Modo 2D & Projeções Cartográficas Comparativas (d3-geo)", () => {
  test("alterna 3D ↔ 2D preservando país/Coroplético, troca 4 projeções, faz picking 2D e traduz pt-BR/en sem erros", async ({
    page,
  }) => {
    const { pageErrors, consoleErrors } = attachErrorCollectors(page);

    // 1. Abre com Brasil selecionado em 3D
    await page.goto("/?visao=1&pais=BRA");
    const rightDock = page.locator('[data-right-dock="true"]');
    await expect(page.getByTestId("map-mode-toggle")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId("map-mode-3d")).toHaveAttribute("aria-pressed", "true");
    await expect(rightDock).toBeVisible({ timeout: 15_000 });

    // 2. Liga Coroplético (PIB per capita) ainda em 3D
    await page.getByTestId("top-nav-choropleth-button").click();
    await page.getByTestId("choropleth-option-NY.GDP.PCAP.CD").click();
    await expect(page.getByTestId("choropleth-legend")).toBeVisible({ timeout: 15_000 });

    // 3. Alterna para Modo 2D — preserva Brasil + Coroplético + carrega FlatMapCanvas sob demanda
    await page.getByTestId("map-mode-2d").click();
    await expect(page.getByTestId("map-mode-2d")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("flat-map-viewport")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("flat-map-viewport")).toHaveAttribute("data-projection", "equal-earth");
    await expect(page.getByTestId("projection-didactic-card")).toContainText("Equal Earth");
    await expect(page.getByTestId("choropleth-legend")).toBeVisible();
    await expect(rightDock).toContainText("Brasil");

    // Verifica que o canvas 2D realmente desenhou pixels válidos (não branco/vazio)
    const nonTransparentPixels = await page.evaluate(() => {
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="flat-map-canvas"]');
      if (!canvas || canvas.width === 0 || canvas.height === 0) return 0;
      const ctx = canvas.getContext("2d");
      if (!ctx) return 0;
      const sample = ctx.getImageData(
        Math.floor(canvas.width * 0.25),
        Math.floor(canvas.height * 0.25),
        Math.floor(canvas.width * 0.5),
        Math.floor(canvas.height * 0.5)
      ).data;
      let nonDark = 0;
      for (let i = 0; i < sample.length; i += 40) {
        if (sample[i] > 20 || sample[i + 1] > 25 || sample[i + 2] > 40) nonDark++;
      }
      return nonDark;
    });
    expect(nonTransparentPixels).toBeGreaterThan(20);

    // 4. Alterna pelas 4 projeções: Mercator → Natural Earth → Azimutal → Equal Earth
    await page.getByTestId("projection-option-mercator").click();
    await expect(page.getByTestId("flat-map-viewport")).toHaveAttribute("data-projection", "mercator");
    await expect(page.getByTestId("projection-didactic-card")).toContainText("Groenlândia");

    await page.getByTestId("projection-option-natural-earth").click();
    await expect(page.getByTestId("flat-map-viewport")).toHaveAttribute("data-projection", "natural-earth");
    await expect(page.getByTestId("projection-didactic-card")).toContainText("Natural Earth");

    await page.getByTestId("projection-option-azimuthal").click();
    await expect(page.getByTestId("flat-map-viewport")).toHaveAttribute("data-projection", "azimuthal");
    await expect(page.getByTestId("azimuthal-center-toggle")).toBeVisible();

    await page.getByTestId("projection-option-equal-earth").click();
    await expect(page.getByTestId("flat-map-viewport")).toHaveAttribute("data-projection", "equal-earth");

    // 5. Testa gratícula e zoom + URL sincronizada (mapa=2d)
    await page.getByTestId("map-2d-graticule-toggle").click();
    await expect(page.getByTestId("map-2d-graticule-toggle")).toHaveAttribute("aria-pressed", "false");
    await page.getByTestId("map-2d-graticule-toggle").click();
    await expect(page.getByTestId("map-2d-graticule-toggle")).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: "Aproximar mapa 2D" }).click();
    await expect(page.getByTestId("map-2d-zoom-level")).not.toHaveText("1.0×");
    await page.getByRole("button", { name: "Enquadrar mapa completo" }).click();
    await expect(page.getByTestId("map-2d-zoom-level")).toHaveText("1.0×");

    await expect(page).toHaveURL(/mapa=2d/);

    // 6. Tradução EN no Modo 2D
    await page.getByTestId("locale-switcher").click();
    await expect(page.getByTestId("projection-didactic-card")).toContainText("Equal-area");
    await expect(page.getByTestId("map-2d-graticule-toggle")).toContainText("Graticule");
    await page.getByTestId("locale-switcher").click();
    await expect(page.getByTestId("projection-didactic-card")).toContainText("Equivalente");

    // 7. Volta para Globo 3D preservando Brasil e Coroplético
    await page.getByTestId("map-mode-3d").click();
    await expect(page.getByTestId("map-mode-3d")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("flat-map-viewport")).toHaveCount(0);
    await expect(page.getByTestId("choropleth-legend")).toBeVisible();
    await expect(rightDock).toContainText("Brasil");

    // 8. Recarrega direto via URL compartilhável em 2D + projeção Mercator
    await page.goto("/?visao=1&mapa=2d&proj=mercator&pais=GRL");
    await expect(page.getByTestId("flat-map-viewport")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByTestId("flat-map-viewport")).toHaveAttribute("data-projection", "mercator");
    await expect(rightDock).toContainText("Groenlândia");

    // 9. Ativa múltiplas camadas do Observatório diretamente no Modo 2D (Queimadas, Ventos, Lixo Marítimo e Espécies)
    await page.getByTestId("top-nav-observatory-button").click();
    await expect(page.getByTestId("observatory-panel")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("layer-toggle-NASA_FIRMS").click();
    await page.getByTestId("layer-toggle-GLOBAL_WINDS").click();
    await page.getByTestId("layer-toggle-MARINE_DEBRIS").click();
    await page.getByTestId("layer-toggle-SPECIES_MAP").click();
    await page.getByTestId("layer-options-toggle-SPECIES_MAP").click();
    await expect(page.getByTestId("species-layer-controls")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("species-item-panthera-onca").click();
    await expect(page.getByTestId("species-floating-card")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("species-floating-card")).toContainText("Panthera onca");

    expect(pageErrors, `Page errors: ${pageErrors.join("; ")}`).toEqual([]);
    expect(consoleErrors, `Console errors: ${consoleErrors.join("; ")}`).toEqual([]);
  });
});
