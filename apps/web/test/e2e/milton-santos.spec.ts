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

test.describe("D36: Geografia Crítica & Legado de Milton Santos", () => {
  test("renderiza /dossies/milton-santos com citações e ativa as 3 lentes espaciais no globo 3D e 2D sem erros", async ({
    page,
  }) => {
    test.setTimeout(150_000);
    const { pageErrors, consoleErrors } = attachErrorCollectors(page);

    // 1. Dossiê dedicado /dossies/milton-santos (Centenário 1926–2026 + scroll real + citações ABNT/APA/BibTeX)
    await page.goto("/dossies/milton-santos");
    await expect(page.getByTestId("milton-santos-dossier")).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Milton Santos/i);
    await expect(page.getByTestId("milton-santos-dossier")).toContainText("Centenário 1926–2026");

    // Garante que páginas de dossiê/estudos rolam normalmente (sem overflow: hidden travando o body)
    const scrolledY = await page.evaluate(() => {
      window.scrollTo(0, 400);
      return window.scrollY;
    });
    expect(scrolledY).toBeGreaterThan(100);
    await page.evaluate(() => window.scrollTo(0, 0));

    // Alterna aba de citação para BibTeX
    await page.getByTestId("milton-cite-tab-bibtex").click();
    await expect(page.getByTestId("milton-bibliography-section")).toContainText("@book{santos1996natureza");

    // 2. Lança a lente Os Quatro Brasis diretamente no Globo a partir do dossiê
    const fourBrazilsReq = page.waitForResponse(
      (res) => res.url().includes("/data/four-brazils.json") && res.status() === 200
    );
    await page.getByTestId("milton-launch-FOUR_BRAZILS").click();
    await fourBrazilsReq;

    await expect(page.getByTestId("critical-geo-hud")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("critical-geo-four-brazils-panel")).toBeVisible();
    await expect(page.getByTestId("four-brazils-region-card")).toContainText("Região Concentrada");

    // Seleciona Centro-Oeste e verifica contraste com IBGE (Tocantins)
    await page.getByTestId("four-brazils-btn-CENTRO_OESTE").click();
    await expect(page.getByTestId("four-brazils-region-card")).toContainText("Tocantins");

    // Alterna para MTCI e Verticalidades no HUD
    await page.getByTestId("critical-geo-tab-MTCI").click();
    await expect(page.getByTestId("critical-geo-mtci-panel")).toBeVisible();
    await expect(page.getByTestId("critical-geo-mtci-panel")).toContainText("Espaços luminosos");

    await page.getByTestId("critical-geo-tab-VERTICALITIES").click();
    await expect(page.getByTestId("critical-geo-verticalities-panel")).toBeVisible();

    // Testa alternância interativa Horizontalidades <-> Verticalidades <-> Ambos
    await page.getByTestId("verticalities-mode-horizontalities").click();
    await expect(page.getByTestId("verticalities-mode-horizontalities")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("horizontalities-zones-legend")).toBeVisible();

    await page.getByTestId("verticalities-mode-verticalities").click();
    await expect(page.getByTestId("verticalities-mode-verticalities")).toHaveAttribute("aria-pressed", "true");

    await page.getByTestId("verticalities-mode-both").click();
    await expect(page.getByTestId("verticalities-mode-both")).toHaveAttribute("aria-pressed", "true");

    // Verifica modo 2D e tradução EN
    await page.getByTestId("map-mode-2d").click();
    await expect(page.getByTestId("flat-map-viewport")).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("locale-switcher").click();
    await expect(page.getByTestId("critical-geo-hud")).toContainText("Critical Geography");
    await expect(page.getByTestId("critical-geo-title")).toContainText("Horizontalities vs. Verticalities");

    expect(pageErrors, `Page errors: ${pageErrors.join("; ")}`).toEqual([]);
    expect(consoleErrors, `Console errors: ${consoleErrors.join("; ")}`).toEqual([]);
  });
});
