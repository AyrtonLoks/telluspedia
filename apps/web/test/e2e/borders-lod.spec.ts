import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.requestAnimationFrame = (draw) => window.setTimeout(() => draw(performance.now()), 250);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
  await page.route("**/api/weather?**", (route) =>
    route.fulfill({
      json: {
        temperature: 21,
        apparent_temperature: 21,
        relative_humidity: 55,
        precipitation: 0,
        weather_code: 0,
        wind_speed: 10,
        reference_time: Date.parse("2026-11-24T15:00:00Z") / 1000,
        cached: false,
      },
    })
  );
});

test("T49: LoD 1:50m carrega apenas no zoom aproximado e territórios disputados/autônomos exibem selo bilíngue", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  const requested50m: number[] = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("/data/countries-ne-50m.json")) {
      requested50m.push(response.status());
    }
  });

  // 1. Visão orbital padrão (altitude 2,5): não baixa 1:50m antes da aproximação
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
  await expect(page.locator("canvas").first()).toBeVisible();
  await page.waitForTimeout(800);
  expect(requested50m).toEqual([]);

  // 2. Aproximação em território disputado (/pais/ESH): dispara 1:50m sob demanda e exibe selo RN07 em PT
  const wait50m = page.waitForResponse(
    (res) => res.url().includes("/data/countries-ne-50m.json") && res.status() === 200
  );
  await page.goto("/pais/ESH");
  await wait50m;

  const disputedNote = page.getByTestId("territorial-status-note");
  await expect(disputedNote).toBeVisible();
  await expect(disputedNote).toHaveAttribute("data-territorial-kind", "disputed");
  await expect(disputedNote).toContainText("Território disputado");
  await expect(disputedNote).toContainText("ONU / Natural Earth");

  // 3. Troca de idioma para inglês traduz o selo RN07 sem erros
  await page.getByTestId("locale-switcher").click();
  await expect(disputedNote).toContainText("Disputed territory");
  await expect(disputedNote).toContainText("Source:");

  // 4. Território autônomo (/pais/GRL) exibe categoria distinta em EN
  await page.goto("/pais/GRL");
  const autonomousNote = page.getByTestId("territorial-status-note");
  await expect(autonomousNote).toBeVisible();
  await expect(autonomousNote).toHaveAttribute("data-territorial-kind", "autonomous");
  await expect(autonomousNote).toContainText("Autonomous territory");

  expect(pageErrors).toEqual([]);
});
