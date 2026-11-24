import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.requestAnimationFrame = (draw) => window.setTimeout(() => draw(performance.now()), 250);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
  await page.route("**/api/weather?**", (route) =>
    route.fulfill({
      json: {
        temperature: 23,
        apparent_temperature: 24,
        relative_humidity: 63,
        precipitation: 0,
        weather_code: 0,
        wind_speed: 11,
        reference_time: Date.parse("2026-11-20T16:00:00Z") / 1000,
        cached: false,
      },
    })
  );
});

test("T46: Service Worker registra limpo em produção e mantém casca e catálogo acessíveis offline", async ({
  page,
  context,
}) => {
  const pageErrors: string[] = [];
  const cspErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error" && /content security policy|service worker/i.test(msg.text())) {
      cspErrors.push(msg.text());
    }
  });

  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
  await expect(page.getByTestId("timeline-header")).toBeVisible();

  // Aguarda registro e ativação do Service Worker /sw.js em produção (next start)
  const swInfo = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    const cacheKeys = await caches.keys();
    return {
      scriptURL: reg.active?.scriptURL ?? "",
      state: reg.active?.state ?? "",
      cacheKeys,
    };
  });

  expect(swInfo.scriptURL).toMatch(/\/sw\.js$/);
  expect(swInfo.state).toBe("activated");
  expect(swInfo.cacheKeys).toContain("telluspedia-static-v1");
  expect(swInfo.cacheKeys).toContain("telluspedia-pages-v1");

  // Segunda navegação sob controle do SW popula /_next/static/* no cache estático
  await page.reload({ waitUntil: "load" });
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
  await expect(page.getByTestId("offline-indicator")).toHaveCount(0);

  try {
    await context.setOffline(true);

    // Indicador discreto D14 aparece imediatamente quando a conexão cai
    const indicator = page.getByTestId("offline-indicator");
    await expect(indicator).toBeVisible();
    await expect(indicator).toContainText("Modo offline");

    // Catálogo Natural Earth e snapshot do Banco Mundial continuam acessíveis offline via cache-first
    const cachedAssets = await page.evaluate(async () => {
      const [neRes, wbRes] = await Promise.all([
        fetch("/data/countries-ne-110m.json"),
        fetch("/data/countries-worldbank-indicators.json"),
      ]);
      const ne = await neRes.json();
      const wb = await wbRes.json();
      return {
        neStatus: neRes.status,
        neCountries: Object.keys(ne?.countries ?? {}).length,
        wbStatus: wbRes.status,
        wbEntries: Object.keys(wb?.countries ?? {}).length,
      };
    });

    expect(cachedAssets.neStatus).toBe(200);
    expect(cachedAssets.neCountries).toBeGreaterThanOrEqual(170);
    expect(cachedAssets.wbStatus).toBe(200);
    expect(cachedAssets.wbEntries).toBeGreaterThanOrEqual(170);

    // Reload completo offline serve a casca do app a partir do cache do SW sem erro de rede
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
    await expect(page.getByTestId("timeline-header")).toBeVisible();
    await expect(page.getByTestId("offline-indicator")).toBeVisible();

    // Retorno online oculta automaticamente o aviso de modo offline
    await context.setOffline(false);
    await expect(page.getByTestId("offline-indicator")).toHaveCount(0);
  } finally {
    await context.setOffline(false);
  }

  expect(pageErrors).toEqual([]);
  expect(cspErrors).toEqual([]);
});
