import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Keep software WebGL responsive while Chromium takes full-width screenshots.
  await page.addInitScript(() => {
    window.requestAnimationFrame = (draw) => window.setTimeout(() => draw(performance.now()), 250);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
  await page.clock.setFixedTime(new Date("2026-11-20T16:00:00Z"));
  await page.route("**/api/weather?**", (route) => route.fulfill({
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
  }));
});

async function openHome(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Principal" })).toBeVisible();
  await expect(page.getByTestId("timeline-header")).toBeVisible();
}

test("clicking Brazil in the globe opens the country panel", async ({ page }) => {
  await page.addInitScript(() => {
    const state = { brazil: null as { x: number; y: number } | null };
    Object.assign(window, { tellusSmoke: state });
    const devtools = new EventTarget();
    Object.assign(window, { __THREE_DEVTOOLS__: devtools });
    devtools.addEventListener("observe", (event) => {
      // Observe the active camera so the point stays geographic across viewport widths.
      const renderer = (event as CustomEvent).detail as import("three").WebGLRenderer & { isWebGLRenderer?: boolean };
      if (!renderer?.isWebGLRenderer) return;
      const render = renderer.render.bind(renderer);
      renderer.render = (scene, camera) => {
        render(scene, camera);
        const { left, top, width, height } = renderer.domElement.getBoundingClientRect();
        if (!width || !height) return;
        const lat = -12 * Math.PI / 180;
        const lng = -53 * Math.PI / 180;
        const projected = camera.position.clone()
          .set(Math.cos(lat) * Math.cos(lng), Math.sin(lat), -Math.cos(lat) * Math.sin(lng))
          .project(camera);
        state.brazil = {
          x: left + (1 + projected.x) * width / 2,
          y: top + (1 - projected.y) * height / 2,
        };
      };
    });
  });

  const exceptions: string[] = [];
  page.on("pageerror", (error) => exceptions.push(error.message));
  await openHome(page);
  await expect(page.locator("canvas").first()).toBeVisible();
  const point = await page.waitForFunction(() =>
    (window as Window & { tellusSmoke?: { brazil?: { x: number; y: number } } }).tellusSmoke?.brazil
  );
  const { x, y } = await point.jsonValue() as { x: number; y: number };
  await page.mouse.click(x, y);
  await expect(page.getByRole("heading", { name: "Brasil", exact: true })).toBeVisible();
  await expect(page.getByTestId("timeline-header")).toBeVisible();
  expect(exceptions).toEqual([]);
});
