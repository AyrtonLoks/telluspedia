import { test, expect } from "@playwright/test";

test.describe("D40 · Cabos Submarinos (TeleGeography) & Qualidade do Ar PM2.5/AQI (Open-Meteo)", () => {
  test("Ativa cabos submarinos e qualidade do ar no Observatório, abre fichas de telemetria, exibe AQI no país e alterna PT ↔ EN", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.route("**/api/observatory/air-quality?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            pm25: 9.4,
            pm10: 16.2,
            usAqi: 39,
            europeanAqi: 19,
            nitrogenDioxide: 8.1,
            ozone: 42.0,
            observedAt: "2026-11-26T14:00:00.000Z",
          },
          meta: {
            source: "live",
            provider: "Open-Meteo Air Quality API (CAMS)",
            fetchedAt: "2026-11-26T14:00:00.000Z",
            stale: false,
          },
        }),
      });
    });

    // 1. Iniciar sem país selecionado com Observatório aberto e câmera 3D apontando para o Brasil,
    //    ligar Cabos Submarinos e clicar diretamente no globo 3D sobre o país: deve abrir a ficha do Brasil!
    await page.goto("/?visao=1&observatorio=1&camera=1.3851,-0.4782,1.7728");
    await expect(page.getByTestId("observatory-panel")).toBeVisible({ timeout: 20000 });

    await page.getByTestId("layer-toggle-SUBMARINE_CABLES").click();
    await page.getByTestId("layer-options-toggle-SUBMARINE_CABLES").click();
    await expect(page.getByTestId("submarine-cables-controls")).toBeVisible();

    // Aguardar o dataset TeleGeography montar os 16 cabos no canvas 3D e clicar no centro do globo (1366x850 -> 683, 425 = Brasil)
    const globeCanvas = page.locator("canvas").first();
    await expect(globeCanvas).toBeVisible();
    await page.waitForTimeout(700);
    await globeCanvas.click({ position: { x: 683, y: 425 } });

    // O clique sobre o país com SUBMARINE_CABLES ativa DEVE selecionar BRA e trazer a aba do país para frente no RightDock
    await expect.poll(() => page.url(), { timeout: 10000 }).toContain("pais=BRA");
    await expect(page.locator("[data-inspector-hud='true']")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("submarine-cable-telemetry")).toHaveCount(0);

    // Validar exibição de PM2.5 + AQI no LiveWeatherWidget do país recém-clicado
    const weatherAqi = page.getByTestId("live-weather-aqi");
    await expect(weatherAqi).toBeVisible({ timeout: 20000 });
    await expect(weatherAqi).toContainText("AQI 39");
    await expect(weatherAqi).toContainText("PM2.5 9.4");

    // 2. Reabrir a aba Observatório e exercitar controles de Cabos Submarinos + Qualidade do Ar
    await page.getByTestId("top-nav-observatory-button").click();
    await expect(page.getByTestId("observatory-panel")).toBeVisible();
    await page.getByTestId("layer-options-toggle-SUBMARINE_CABLES").click();
    await expect(page.getByTestId("submarine-cables-controls")).toBeVisible();

    await page.getByTestId("cables-basin-atlantic").click();
    await page.getByTestId("cables-focus-highest").click();
    await expect(page.getByTestId("observatory-telemetry-hud")).toBeVisible();
    await expect(page.getByTestId("submarine-cable-telemetry")).toBeVisible();
    await expect(page.getByTestId("submarine-cable-source-link")).toHaveAttribute(
      "href",
      /^https:\/\/www\.submarinecablemap\.com\//
    );

    await page.getByTestId("layer-toggle-AIR_QUALITY").click();
    await page.getByTestId("layer-options-toggle-AIR_QUALITY").click();
    await expect(page.getByTestId("air-quality-controls")).toBeVisible();
    await page.getByTestId("aqi-scale-european_aqi").click();
    await page.getByTestId("aqi-focus-worst").click();
    await expect(page.getByTestId("air-quality-telemetry")).toBeVisible();

    await expect
      .poll(() => page.url(), { timeout: 10000 })
      .toContain("SUBMARINE_CABLES");
    await expect
      .poll(() => page.url(), { timeout: 10000 })
      .toContain("aqi=european_aqi");

    // 3. Alternar para EN e validar traduções
    await page.getByTestId("locale-switcher").click();
    await expect(page.getByTestId("locale-switcher")).toHaveText("EN");
    await expect(page.getByTestId("observatory-telemetry-hud")).toContainText(
      "Air Quality Bulletin (Open-Meteo)"
    );
    await expect(page.getByTestId("submarine-cables-controls")).toContainText(
      "Strategic geopolitical choke points"
    );

    expect(errors).toEqual([]);
  });
});
