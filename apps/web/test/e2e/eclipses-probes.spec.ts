import { test, expect } from "@playwright/test";

test.describe("D41 · Eclipses Solares/Lunares & Sondas do Espaço Profundo no Modo Cosmos", () => {
  test("Projeta eclipses (Sobral 1919 e Luxor 2027) sem bloquear cliques, inspeciona Voyager 1 e JWST no Cosmos e alterna PT ↔ EN", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    // 1. Iniciar na Terra, abrir Eclipses na Timeline e projetar Sobral 1919 + Luxor 2027
    await page.goto("/");
    await page.getByTestId("timeline-eclipses-button").click();
    await expect(page.getByTestId("eclipse-hud")).toBeVisible();

    await page.getByTestId("eclipse-option-sobral-1919").click();
    await expect(page.getByTestId("eclipse-offset-slider")).toBeVisible();
    await expect(page.getByTestId("eclipse-hud")).toContainText("Sobral");
    await expect(page.locator("a[href='/dossies/einstein']")).toBeVisible();

    await page.getByTestId("eclipse-option-luxor-2027").click();
    await expect.poll(() => page.url(), { timeout: 10000 }).toContain("eclipse=luxor-2027");
    await expect(page.getByTestId("eclipse-nasa-link")).toHaveAttribute(
      "href",
      /^https:\/\/science\.nasa\.gov\//
    );

    // 2. Transicionar para o Modo Cosmos e inspecionar sondas do espaço profundo (Voyager 1 e JWST L2)
    await page.getByTestId("eclipse-view-cosmos").click();
    await expect(page.getByTestId("cosmic-layers-toggle")).toBeVisible();
    await page.getByTestId("cosmic-layers-toggle").click();

    await page.getByTestId("cosmic-probe-btn-VOYAGER_1").click();
    await expect(page.getByTestId("cosmic-probe-inspector")).toBeVisible();
    await expect(page.getByTestId("cosmic-probe-inspector")).toContainText("Voyager 1");
    await expect(page.getByTestId("probe-light-time")).toContainText("h");
    await expect(page.getByTestId("probe-nasa-link")).toHaveAttribute(
      "href",
      /^https:\/\/science\.nasa\.gov\//
    );

    // Alternar para o Telescópio James Webb (L2) e verificar tempo-luz em segundos e URL
    await page.getByTestId("probe-switch-JWST").click();
    await expect(page.getByTestId("cosmic-probe-inspector")).toContainText("James Webb");
    await expect(page.getByTestId("probe-light-time")).toContainText("s-luz");
    await expect.poll(() => page.url(), { timeout: 10000 }).toContain("sonda=JWST");

    // 3. Alternar idioma para EN e validar traduções completas
    await page.getByTestId("locale-switcher").click();
    await expect(page.getByTestId("locale-switcher")).toHaveText("EN");
    await expect(page.getByTestId("probe-light-time")).toContainText("light-sec");
    await expect(page.getByTestId("eclipse-hud")).toContainText("Syzygy Ephemeris");

    expect(errors).toEqual([]);
  });
});
