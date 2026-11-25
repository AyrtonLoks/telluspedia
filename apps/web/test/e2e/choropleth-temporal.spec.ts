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

test.describe("D34: Coroplético Temporal Animado (1990–2024) + CO₂ per capita & Energia Renovável %", () => {
  test("seleciona CO₂ e Renováveis, anima 1990→2024, sincroniza URL/Timeline e funciona em 3D e 2D sem erros", async ({
    page,
  }) => {
    const { pageErrors, consoleErrors } = attachErrorCollectors(page);

    await page.goto("/?visao=1&pais=BRA");
    await expect(page.getByTestId("top-nav-choropleth-button")).toBeVisible({ timeout: 25_000 });

    // 1. Abre o seletor e confirma os 2 novos indicadores reais (CO₂ per capita e Energia renovável %)
    await page.getByTestId("top-nav-choropleth-button").click();
    await expect(page.getByTestId("choropleth-option-EN.GHG.CO2.PC.CE.AR5")).toBeVisible();
    await expect(page.getByTestId("choropleth-option-EG.FEC.RNEW.ZS")).toBeVisible();

    await page.getByTestId("choropleth-option-EN.GHG.CO2.PC.CE.AR5").click();
    await expect(page.getByTestId("choropleth-legend")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("choropleth-temporal-controls")).toBeVisible();
    await expect(page.getByTestId("choropleth-year-display")).toHaveText("Mais recente");

    // 2. Inicia animação temporal (carrega worldbank-timeseries.json sob demanda e avança anos)
    const tsPromise = page.waitForResponse(
      (res) => res.url().includes("worldbank-timeseries.json") && res.status() === 200
    );
    await page.getByTestId("choropleth-play-toggle").click();
    await tsPromise;
    await expect(page.getByTestId("choropleth-play-toggle")).toHaveAttribute("aria-pressed", "true");

    // Aguarda avançar ao menos 1 ano a partir de 1990 e pausa
    await expect(page.getByTestId("choropleth-year-display")).toHaveText(/199[1-9]|20\d\d/, {
      timeout: 8_000,
    });
    await page.getByTestId("choropleth-play-toggle").click();
    await expect(page.getByTestId("choropleth-play-toggle")).toHaveAttribute("aria-pressed", "false");

    // 3. Ajusta o slider manualmente para 2005 e ativa sincronia com a Timeline
    const slider = page.getByTestId("choropleth-year-slider");
    await slider.fill("2005");
    await expect(page.getByTestId("choropleth-year-display")).toHaveText("2005");
    await page.getByTestId("choropleth-sync-timeline").click();
    await expect(page.getByTestId("choropleth-sync-timeline")).toHaveAttribute("aria-pressed", "true");
    await expect(page).toHaveURL(/coropletico=EN\.GHG\.CO2\.PC\.CE\.AR5/);
    await expect(page).toHaveURL(/coropleticoAno=2005/);

    // 4. Alterna para Energia Renovável (%) mantendo o ano 2005 e verifica em Modo 2D
    await page.getByRole("button", { name: "Trocar indicador coroplético" }).click();
    await page.getByTestId("choropleth-option-EG.FEC.RNEW.ZS").click();
    await expect(page.getByTestId("choropleth-year-display")).toHaveText("2005");

    await page.getByTestId("map-mode-2d").click();
    await expect(page.getByTestId("flat-map-viewport")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("choropleth-year-display")).toHaveText("2005");

    // 5. Tradução EN
    await page.getByTestId("locale-switcher").click();
    await expect(page.getByTestId("choropleth-legend")).toContainText("Renewable energy");
    await expect(page.getByTestId("choropleth-temporal-controls")).toContainText("Fixed 1990–2024 scale");
    await page.getByTestId("locale-switcher").click();

    // 6. Restauração direta via URL compartilhável
    await page.goto("/?visao=1&coropletico=EN.GHG.CO2.PC.CE.AR5&coropleticoAno=1995&pais=BRA");
    await expect(page.getByTestId("choropleth-year-display")).toHaveText("1995", {
      timeout: 25_000,
    });

    expect(pageErrors, `Page errors: ${pageErrors.join("; ")}`).toEqual([]);
    expect(consoleErrors, `Console errors: ${consoleErrors.join("; ")}`).toEqual([]);
  });
});
