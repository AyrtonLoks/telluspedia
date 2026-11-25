import { test, expect } from "@playwright/test";

test.describe("D32: Mapa de Espécies Animais & Biodiversidade (GBIF + IUCN Red List)", () => {
  test("filtra fauna por IUCN/bioma, consulta ocorrências GBIF, abre ficha flutuante e integra com biomas D31", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const failedResponses: string[] = [];

    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("response", (res) => {
      const url = res.url();
      if (res.status() >= 400 && !url.includes("favicon")) {
        failedResponses.push(`${res.status()} ${url}`);
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("top-nav-observatory-button")).toBeVisible({ timeout: 15000 });

    // Abre o Observatório e liga a camada SPECIES_MAP
    await page.getByTestId("top-nav-observatory-button").click();
    await expect(page.getByTestId("observatory-panel")).toBeVisible();
    await page.getByTestId("layer-toggle-SPECIES_MAP").click();
    await page.getByTestId("layer-options-toggle-SPECIES_MAP").click();
    await expect(page.getByTestId("species-layer-controls")).toBeVisible();

    // Filtra por bioma brasileiro Pantanal (D31) e seleciona a Arara-azul-grande
    await page.getByTestId("species-biome-select").selectOption("BR_PANTANAL");
    const macawItem = page.getByTestId("species-item-anodorhynchus-hyacinthinus");
    await expect(macawItem).toBeVisible();

    const gbifResPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/observatory/species") &&
        res.url().includes("anodorhynchus-hyacinthinus") &&
        res.status() === 200
    );
    await macawItem.click();
    await gbifResPromise;

    // Confirma ficha biológica flutuante com status IUCN, selo T05 do GBIF e link para o bioma
    const card = page.getByTestId("species-floating-card");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Arara-azul-grande");
    await expect(card).toContainText("Anodorhynchus hyacinthinus");
    await expect(card).toContainText("IUCN VU");
    await expect(page.getByTestId("species-gbif-status")).toBeVisible();

    // Integração D31: clicar no bioma Pantanal na ficha liga BIOMES_MAP
    await page.getByTestId("species-open-biome-BR_PANTANAL").click();
    await expect(page.getByTestId("layer-toggle-BIOMES_MAP")).toHaveAttribute(
      "aria-checked",
      "true"
    );

    // Alterna idioma para inglês (en) e valida ficha bilíngue
    await page.getByTestId("locale-switcher").click();
    await expect(card).toContainText("Hyacinth Macaw");
    await expect(card).toContainText("Georeferenced records (GBIF)");
    await expect(card).toContainText("Main threats");

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(failedResponses).toEqual([]);
  });
});
