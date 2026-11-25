import { test, expect } from "@playwright/test";

test.describe("D31: Mapa dos Biomas (Global 14 WWF & Brasil 6 IBGE) + Desmatamento 6 Biomas", () => {
  test("carrega TopoJSON oficiais sob demanda, alterna chips sem bug, abre ficha flutuante e cruza com PRODES 6 biomas", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    const failedResponses: string[] = [];
    const biomeDataRequests: string[] = [];

    page.on("pageerror", (err) => pageErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("response", (res) => {
      const url = res.url();
      if (url.includes("/data/biomes/")) {
        biomeDataRequests.push(`${res.status()} ${new URL(url).pathname}`);
      }
      if (res.status() >= 400 && !url.includes("favicon")) {
        failedResponses.push(`${res.status()} ${url}`);
      }
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByTestId("top-nav-observatory-button")).toBeVisible({ timeout: 15000 });

    // Antes de ativar a camada, nenhum TopoJSON de biomas deve ser baixado (lazy-load).
    expect(biomeDataRequests).toEqual([]);

    // Abre o Observatório Planetário
    await page.getByTestId("top-nav-observatory-button").click();
    await expect(page.getByTestId("observatory-panel")).toBeVisible();

    // Liga a camada BIOMES_MAP e confirma o fetch sob demanda do TopoJSON global WWF/RESOLVE 2017
    const globalReqPromise = page.waitForResponse(
      (res) => res.url().includes("/data/biomes/global-biomes-wwf.json") && res.status() === 200
    );
    await page.getByTestId("layer-toggle-BIOMES_MAP").click();
    await globalReqPromise;

    // Expande as opções da camada de biomas
    await page.getByTestId("layer-options-toggle-BIOMES_MAP").click();
    await expect(page.getByTestId("biomes-layer-controls")).toBeVisible();
    await expect(page.getByTestId("biome-chip-WWF_01")).toBeVisible();
    await expect(page.getByTestId("biome-chip-WWF_14")).toBeVisible();

    // Alterna para o escopo Brasil (6 Biomas IBGE 2019) e confirma o carregamento sob demanda
    const brazilReqPromise = page.waitForResponse(
      (res) => res.url().includes("/data/biomes/brazil-biomes-ibge.json") && res.status() === 200
    );
    await page.getByTestId("biomes-scope-brazil").click();
    await brazilReqPromise;

    // Estado inicial: apenas "Todos" ativo
    const chipAll = page.getByTestId("biome-chip-ALL");
    const chipCerrado = page.getByTestId("biome-chip-BR_CERRADO");
    await expect(chipAll).toHaveAttribute("aria-pressed", "true");
    await expect(chipCerrado).toHaveAttribute("aria-pressed", "false");

    // Seleciona Cerrado: APENAS Cerrado fica ativo e o cartão ecológico flutuante abre
    await chipCerrado.click();
    await expect(chipAll).toHaveAttribute("aria-pressed", "false");
    await expect(chipCerrado).toHaveAttribute("aria-pressed", "true");

    const floatingCard = page.getByTestId("biome-floating-card");
    await expect(floatingCard).toBeVisible();
    await expect(floatingCard).toContainText("Cerrado");
    await expect(floatingCard).toContainText("IBGE-02");
    await expect(floatingCard).toContainText("Vegetação típica");

    // Clicar novamente no chip Cerrado deseleciona limpamente (volta para "Todos" sem duplo destaque)
    await chipCerrado.click();
    await expect(chipAll).toHaveAttribute("aria-pressed", "true");
    await expect(chipCerrado).toHaveAttribute("aria-pressed", "false");
    await expect(floatingCard).toBeHidden();

    // Seleciona Pantanal e cruza com INPE PRODES (agora suportando os 6 biomas + mapa de calor!)
    await page.getByTestId("biome-chip-BR_PANTANAL").click();
    await expect(floatingCard).toContainText("Pantanal");
    await page.getByTestId("biomes-cross-prodes").click();
    await expect(page.getByTestId("layer-toggle-INPE_DEFORESTATION")).toHaveAttribute(
      "aria-checked",
      "true"
    );
    await page.getByTestId("layer-options-toggle-INPE_DEFORESTATION").click();
    await expect(page.getByTestId("inpe-biome-pantanal")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("inpe-biome-caatinga")).toBeVisible();
    await expect(page.getByTestId("inpe-biome-mata_atlantica")).toBeVisible();
    await expect(page.getByTestId("inpe-biome-pampa")).toBeVisible();
    await expect(page.getByTestId("inpe-heatmap-legend")).toBeVisible();

    // Alterna idioma para inglês (en) e valida tradução da ficha flutuante e do mapa de calor
    await page.getByTestId("locale-switcher").click();
    await expect(floatingCard).toContainText("Typical vegetation");
    await expect(floatingCard).toContainText("Main threats");
    await expect(page.getByTestId("inpe-heatmap-legend")).toContainText("Deforestation heatmap");

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(failedResponses).toEqual([]);
  });
});
