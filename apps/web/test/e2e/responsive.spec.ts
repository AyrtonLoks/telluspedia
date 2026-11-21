import { expect, test, type Locator } from "@playwright/test";
import path from "node:path";

async function bounds(element: Locator) {
  await expect(element).toBeVisible();
  const box = await element.boundingBox();
  if (!box) throw new Error("Elemento sem área visível");
  return box;
}

test("mapa, controles e painéis cabem na tela com contraste AA", async ({ page }) => {
  await page.addInitScript(() => {
    window.requestAnimationFrame = (draw) => window.setTimeout(() => draw(performance.now()), 250);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    // The globe has its own real WebGL smoke test. Stabilize UI captures in software mode.
    const devtools = new EventTarget();
    Object.assign(window, { __THREE_DEVTOOLS__: devtools });
    devtools.addEventListener("observe", (event) => {
      const renderer = (event as CustomEvent).detail as { isWebGLRenderer?: boolean; render: () => void };
      if (renderer?.isWebGLRenderer) renderer.render = () => {};
    });
  });
  await page.clock.setFixedTime(new Date("2026-11-20T16:00:00Z"));
  await page.route("**/api/weather?**", (route) => route.fulfill({ status: 503, body: "" }));
  await page.goto("/");

  const viewport = page.viewportSize()!;
  const compact = viewport.width < 1024;
  const navigation = page.getByRole("navigation", { name: "Principal" });
  const tools = page.getByTestId("map-tools");
  const timeline = page.locator("[data-timeline-bar]");
  const header = page.getByTestId("timeline-header");
  const controls = page.getByTestId("timeline-controls-zone");
  await expect(timeline).toHaveAttribute("data-expanded", String(!compact));
  const top = await bounds(navigation);
  const toolArea = await bounds(tools);
  const bottom = await bounds(timeline);
  expect(top.y + top.height).toBeLessThan(toolArea.y);
  expect(toolArea.y + toolArea.height).toBeLessThan(bottom.y);
  for (const box of [top, toolArea, bottom]) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
  }
  expect(await navigation.evaluate((nav) => nav.scrollWidth - nav.clientWidth)).toBeLessThanOrEqual(1);
  if (compact) expect(bottom.height).toBeLessThan(70);
  await expect.poll(() => page.evaluate(async () => {
    await document.fonts.ready;
    const css = getComputedStyle(document.body);
    const family = (variable: string) =>
      css.getPropertyValue(variable).split(",")[0].trim().replaceAll(/['"]/g, "");
    const geist = family("--font-geist-sans");
    const merriweather = family("--font-merriweather");
    if (!geist || !merriweather || !css.fontFamily.includes(geist)) return false;
    const fonts = await Promise.all([geist, merriweather].map((name) => document.fonts.load(`16px "${name}"`)));
    return fonts.every((faces) => faces.some((face) => face.status === "loaded"));
  })).toBe(true);

  await expect(page).toHaveScreenshot("home.png", {
    stylePath: path.join(__dirname, "visual.css"),
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });

  // Test the tokens against both solid controls and the brightest possible map below the glass.
  const insufficientContrast = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const rgb = (name: string) => css.getPropertyValue(`--color-${name}`).trim().split(/\s+/).map(Number);
    const blend = (fg: number[], bg: number[], opacity: number) =>
      fg.map((value, index) => value * opacity + bg[index] * (1 - opacity));
    const luminance = (color: number[]) => color.reduce((sum, value, index) => {
      const channel = value / 255;
      const linear = channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      return sum + linear * [0.2126, 0.7152, 0.0722][index];
    }, 0);
    const ratio = (fg: number[], bg: number[]) => (luminance(fg) + 0.05) / (luminance(bg) + 0.05);
    const glass = blend(rgb("surface"), [255, 255, 255], 0.86);
    const neutral = ["fg", "fg-secondary", "fg-muted"]
      .filter((name) => [glass, rgb("control")].some((bg) => ratio(rgb(name), bg) < 4.5));
    const tinted = [
      "accent", "success", "warning", "danger", "cat-politics", "cat-economy", "cat-war", "cat-science",
      "cat-health", "layer-fires", "layer-events", "layer-satellites", "layer-aircraft", "layer-maritime",
    ].filter((name) => ratio(rgb(name), blend(rgb(name), glass, 0.1)) < 4.5);
    return [...neutral, ...tinted];
  });
  expect(insufficientContrast).toEqual([]);

  if (compact) {
    await timeline.getByRole("button", { name: /^Expandir linha do tempo/i }).press("Enter");
    await expect(timeline.getByRole("button", { name: "Recolher linha do tempo" })).toBeFocused();
  }
  const headerBox = await bounds(header);
  const controlsBox = await bounds(controls);
  expect(controlsBox.x + controlsBox.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 1);
  await expect(page.getByTestId("timeline-scrubber")).toBeVisible();

  await page.goto("/?visao=1&pais=BRA&ano=1914");
  const dock = page.getByRole("region", { name: "Painel lateral" });
  await expect(dock.getByRole("heading", { name: "Brasil", exact: true })).toBeVisible();
  const sheet = await bounds(dock);
  const badge = await bounds(page.getByTestId("historical-era-badge"));
  expect(sheet.x).toBeGreaterThanOrEqual(0);
  expect(sheet.x + sheet.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(sheet.y + sheet.height).toBeLessThanOrEqual(viewport.height + 1);
  if (compact) {
    expect(badge.y + badge.height).toBeLessThan(sheet.y);
    await expect(timeline).toBeHidden();
  } else {
    const wideTimeline = await bounds(timeline);
    expect(Math.max(wideTimeline.x + wideTimeline.width, badge.x + badge.width)).toBeLessThan(sheet.x);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
});
