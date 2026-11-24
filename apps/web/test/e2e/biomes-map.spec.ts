import { test, expect } from "@playwright/test";

test.describe("D31: Mapa dos Biomas (Global 14 WWF & Brasil 6 IBGE)", () => {
  test("carrega TopoJSON sob demanda, filtra biomas, exibe ficha bilíngue e cruza com INPE PRODES", async ({
    page,
  }) => {
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

    // Liga a camada BIOMES_MAP e confirma o fetch sob demanda do TopoJSON global WWF
    const globalReqPromise = page.waitForResponse(
      (res) => res.url().includes("/data/biomes/global-biomes-wwf.json") && res.status() === 200
    );
    await page.getByTestId("layer-toggle-BIOMES_MAP").click();
    await globalReqPromise;

    // Expande as opções da camada de biomas
    await page.getByTestId("layer-options-toggle-BIOMES_MAP").click();
    await expect(page.getByTestId("biomes-layer-controls")).toBeVisible();
    await expect(page.getByTestId("biome-ecological-card")).toBeVisible();
    await expect(page.getByTestId("biome-chip-WWF_01")).toBeVisible();
    await expect(page.getByTestId("biome-chip-WWF_14")).toBeVisible();

    // Alterna para o escopo Brasil (6 Biomas IBGE) e confirma o carregamento sob demanda
    const brazilReqPromise = page.waitForResponse(
      (res) => res.url().includes("/data/biomes/brazil-biomes-ibge.json") && res.status() === 200
    );
    await page.getByTestId("biomes-scope-brazil").click();
    await brazilReqPromise;

    // Filtra o Cerrado e valida a ficha ecológica em pt-BR
    await page.getByTestId("biome-chip-BR_CERRADO").click();
    const card = page.getByTestId("biome-ecological-card");
    await expect(card).toContainText("Cerrado");
    await expect(card).toContainText("IBGE-02");
    await expect(card).toContainText("Vegetação típica");
    await expect(card).toContainText("IBGE");

    // Aciona o cruzamento ambiental com INPE PRODES
    await page.getByTestId("biomes-cross-prodes").click();
    await expect(page.getByTestId("layer-toggle-INPE_DEFORESTATION")).toHaveAttribute(
      "aria-checked",
      "true"
    );

    // Alterna idioma para inglês (en) e valida ficha bilíngue
    await page.getByTestId("locale-switcher").click();
    await expect(card).toContainText("Typical vegetation");
    await expect(card).toContainText("Main threats");

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(failedResponses).toEqual([]);
  });
});
