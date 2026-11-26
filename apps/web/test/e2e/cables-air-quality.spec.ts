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

    await page.goto("/?visao=1&pais=BRA&painel=country");
    // 1. Validar exibição de PM2.5 + AQI no LiveWeatherWidget do país selecionado
    const weatherAqi = page.getByTestId("live-weather-aqi");
    await expect(weatherAqi).toBeVisible({ timeout: 20000 });
    await expect(weatherAqi).toContainText("AQI 39");
    await expect(weatherAqi).toContainText("PM2.5 9.4");

    // 2. Abrir Observatório e ativar Cabos Submarinos + Qualidade do Ar
    await page.getByTestId("top-nav-observatory-button").click();
    await expect(page.getByTestId("observatory-panel")).toBeVisible();

    await page.getByTestId("layer-toggle-SUBMARINE_CABLES").click();
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
