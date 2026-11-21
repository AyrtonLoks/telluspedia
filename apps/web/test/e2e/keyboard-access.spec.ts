import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const devtools = new EventTarget();
    Object.assign(window, { __THREE_DEVTOOLS__: devtools });
    devtools.addEventListener("observe", (event) => {
      const renderer = (event as CustomEvent).detail as import("three").WebGLRenderer & { isWebGLRenderer?: boolean };
      if (renderer?.isWebGLRenderer) renderer.render = () => {};
    });
  });
});

test("teclado controla a câmera e transfere o foco da busca para o país", async ({ page }) => {
  await page.goto("/");
  const globe = page.getByRole("region", { name: "Globo interativo" });
  await globe.locator("canvas").waitFor();
  for (let tab = 0; tab < 12; tab++) {
    await page.keyboard.press("Tab");
    if (await globe.evaluate((element) => document.activeElement === element)) break;
  }
  await expect(globe).toBeFocused();
  await globe.press("ArrowRight");
  await expect.poll(() => new URL(page.url()).searchParams.get("camera")).not.toBeNull();
  const rotated = new URL(page.url()).searchParams.get("camera")!.split(",").map(Number);
  await globe.press("+");
  await expect.poll(() => {
    const coordinates = new URL(page.url()).searchParams.get("camera")?.split(",").map(Number);
    return coordinates ? Math.hypot(...coordinates) : Infinity;
  }).toBeLessThan(Math.hypot(...rotated));
  await globe.press("-");
  await expect.poll(() => {
    const coordinates = new URL(page.url()).searchParams.get("camera")?.split(",").map(Number);
    return coordinates ? Math.hypot(...coordinates) : 0;
  }).toBeCloseTo(Math.hypot(...rotated), 3);

  await page.keyboard.press("/");
  const search = page.getByRole("dialog", { name: "Buscar no TellusPedia" }).getByRole("combobox");
  await expect(search).toBeFocused();
  await search.press("/");
  await expect(search).toHaveValue("/");
  await search.fill("Peru");
  await search.press("Enter");
  const hud = page.locator('[data-dock-content="country"]');
  await expect(hud.getByRole("heading", { name: "Peru", exact: true })).toBeVisible();
  await expect(hud).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(hud).toBeHidden();
  const searchTrigger = page.locator("#explore-search-trigger");
  await expect(searchTrigger).toBeFocused();

  await page.keyboard.press("/");
  await search.fill("Peru");
  await search.press("Enter");
  await expect(hud).toBeFocused();
  await page.keyboard.press("Tab");
  const close = hud.getByRole("button", { name: "Fechar painel", exact: true });
  await expect(close).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(hud).toBeHidden();
  await expect(searchTrigger).toBeFocused();
});

test("abas, interruptores e modal têm foco e ações previsíveis", async ({ page }) => {
  await page.route("**/api/observatory/firms?**", (route) => route.fulfill({ status: 503, body: "" }));
  await page.goto("/?visao=1&pais=PER&observatorio=1");
  const country = page.getByRole("tab", { name: "Peru" });
  const observatory = page.getByRole("tab", { name: "Observatório" });
  await country.focus();
  await country.press("ArrowRight");
  await expect(observatory).toBeFocused();
  await expect(observatory).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel", { name: "Observatório" })).toBeVisible();
  const fires = page.getByRole("switch", { name: /Queimadas/ });
  await expect(fires).toHaveAttribute("aria-checked", "false");
  await fires.focus();
  await fires.press("Space");
  await expect(fires).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(page.locator("#observatory-trigger")).toBeFocused();

  const compare = page.getByRole("button", { name: "Comparador", exact: true });
  await compare.focus();
  await compare.press("Enter");
  const dialog = page.getByRole("dialog", { name: /Comparador multidimensional/ });
  await expect(dialog).toBeVisible();
  for (const key of ["Tab", "Shift+Tab"]) {
    await page.keyboard.press(key);
    await expect.poll(() => dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(compare).toBeFocused();
});
