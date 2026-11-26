import { test, expect } from "@playwright/test";

test.describe("D38 · Linha do Tempo Transversal (RN14/RN04) & Atualidades GDELT 2.0 (RN13.8)", () => {
  test("Ativa personalidade transversal, navega entre países gerando trilha RN04, exibe GDELT no país/Reader e alterna PT ↔ EN", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.route("**/api/countries/BRA/news", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            isoCode: "BRA",
            countryName: "Brasil",
            query: "(Brazil OR Brasil)",
            gdeltPortalUrl: "https://api.gdeltproject.org/api/v2/doc/doc?query=Brazil&mode=ArtList&timespan=7d",
            articles: [
              {
                id: "gdelt-bra-1",
                title: "Brazil advances tropical forest satellite monitoring cooperation",
                url: "https://www.reuters.com/world/americas/brazil-satellite-monitoring-2026/",
                domain: "reuters.com",
                seenAt: "2026-11-25T16:00:00.000Z",
                language: "English",
                sourceCountry: "United Kingdom",
              },
            ],
          },
          meta: {
            source: "live",
            provider: "GDELT 2.0 Doc API",
            fetchedAt: "2026-11-25T16:05:00.000Z",
            stale: false,
          },
        }),
      });
    });

    await page.goto("/?visao=1");
    const transversalBtn = page.getByTestId("timeline-transversal-button");
    await expect(transversalBtn).toBeVisible({ timeout: 20000 });

    // 1. Abrir seletor transversal na barra da timeline e ativar Albert Einstein
    await transversalBtn.click();
    await expect(page.getByTestId("transversal-selector-hud")).toBeVisible();
    await page.getByTestId("transversal-option-albert-einstein").click();

    await expect(page.getByTestId("transversal-active-hud")).toBeVisible();
    await expect
      .poll(() => page.url(), { timeout: 10000 })
      .toContain("trilha=albert-einstein");

    // 2. Clicar no chip do Brasil nos países destacados simultaneamente → registra passo na Trilha RN04 e abre InspectorHUD
    await page.getByTestId("transversal-country-BRA").click();
    const trail = page.getByTestId("study-trail-breadcrumbs");
    await expect(trail).toBeVisible();
    await expect(page.getByTestId("trail-step-transversal:albert-einstein")).toBeVisible();
    await expect(page.getByTestId("trail-step-country:BRA")).toBeVisible();

    // Em 1879 (era histórica pré-1957), RN09 suprime manchetes contemporâneas para evitar anacronismo
    await expect(page.getByTestId("country-news-section")).toHaveCount(0);

    // 3. Trocar para Milton Santos e selecionar o marco contemporâneo do Centenário (2026) → GDELT 2.0 aparece no InspectorHUD
    await page.getByTestId("transversal-switch-button").click();
    await page.getByTestId("transversal-option-milton-santos").click();
    await page.getByTestId("transversal-milestone-glo-2026-milton").click();

    const newsSection = page.getByTestId("country-news-section");
    await expect(newsSection).toBeVisible({ timeout: 15000 });
    await expect(newsSection).toContainText(
      "Brazil advances tropical forest satellite monitoring cooperation"
    );

    await page.getByTestId("country-news-open-reader").click();
    await expect(page.getByTestId("reader-country-news-view")).toBeVisible();
    await expect(page.getByTestId("reader-news-card")).toContainText("reuters.com");

    // 4. Fechar Reader e alternar idioma para EN
    await page.keyboard.press("Escape");
    await page.getByTestId("locale-switcher").click();
    await expect(page.getByTestId("locale-switcher")).toHaveText("EN");
    await expect(page.getByTestId("transversal-active-hud")).toContainText(
      "Simultaneously highlighted countries"
    );
    await expect(page.getByTestId("study-trail-breadcrumbs")).toContainText("Study trail (RN04)");

    expect(errors).toEqual([]);
  });
});
