import { expect, test } from "@playwright/test";

test("celestial labels mount again after returning to Earth", async ({ page }) => {
  const rootWarning = /Attempted to synchronously unmount a root|already been passed to createRoot/i;
  const warnings: string[] = [];
  page.on("console", (message) => {
    if (rootWarning.test(message.text())) warnings.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (rootWarning.test(error.message)) warnings.push(error.message);
  });
  await page.addInitScript(() => {
    // Pace software rendering while checking DOM changes from the WebGL scene.
    window.requestAnimationFrame = (draw) => window.setTimeout(() => draw(performance.now()), 250);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });

  await page.goto("/");
  await expect(page.locator("canvas").first()).toBeVisible();
  const cosmos = page.getByTestId("top-nav-cosmos-button");
  const labels = page.locator("[data-celestial-label]");

  for (let cycle = 0; cycle < 2; cycle++) {
    await cosmos.click();
    await expect(labels.first()).toBeAttached();
    await expect.poll(() =>
      labels.evaluateAll((elements) => elements.some((element) => (element as HTMLElement).style.opacity === "1"))
    ).toBe(true);

    await cosmos.click();
    await expect(labels).toHaveCount(0);
  }

  expect(warnings).toEqual([]);
});
