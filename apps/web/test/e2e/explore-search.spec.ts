import { expect, test, type Page } from "@playwright/test";

type CameraProbe = Window & { explorerCamera?: number[] };

async function openSearch(page: Page, key = "Control+k") {
  await page.keyboard.press(key);
  const dialog = page.getByRole("dialog", { name: "Buscar no TellusPedia" });
  await expect(dialog).toBeVisible();
  const input = dialog.getByRole("combobox");
  await expect(input).toBeFocused();
  return { dialog, input };
}

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    // Read the real R3F camera while avoiding full-size software WebGL draws in Chromium.
    const devtools = new EventTarget();
    Object.assign(window, { __THREE_DEVTOOLS__: devtools });
    devtools.addEventListener("observe", (event) => {
      const renderer = (event as CustomEvent).detail as import("three").WebGLRenderer & { isWebGLRenderer?: boolean };
      if (!renderer?.isWebGLRenderer) return;
      renderer.render = (_scene, camera) => {
        (window as CameraProbe).explorerCamera = camera.position.toArray();
      };
    });
  });
  await context.route("**/api/observatory/firms?**", (route) => route.fulfill({ status: 503, body: "" }));
});

test("paleta pesquisa por teclado e o link restaura país, período, camada e câmera", async ({ page, context }) => {
  await page.goto("/?origem=aula#globo");
  await expect(page.locator("canvas").first()).toBeVisible();

  const { input, dialog } = await openSearch(page);
  await input.fill("Halley");
  await expect(dialog.getByRole("group", { name: "Corpos celestes" }).getByRole("option", { name: /Halley/ })).toBeVisible();
  await input.fill("1969");
  await expect(dialog.getByRole("option", { name: /Apollo 11/ })).toBeVisible();
  await expect(dialog.getByRole("option", { name: "Ir para 1969" })).toBeVisible();
  await input.fill("Peur");
  await expect(dialog.getByRole("option", { name: /Peru/ })).toHaveAttribute("aria-selected", "true");
  await input.press("Enter");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "Peru", exact: true })).toBeVisible();
  const suggestions = page.getByRole("region", { name: "Explorar neste país" });
  await expect(suggestions.getByRole("button", { name: /Queimadas/ })).toBeVisible();

  const layer = await openSearch(page, "Meta+k");
  await layer.input.fill("Ativar queimadas");
  await expect(layer.dialog.getByRole("option", { name: "Queimadas ativas" })).toHaveAttribute("aria-selected", "true");
  await layer.input.press("Enter");
  await expect(page.getByTestId("top-nav-observatory-button")).toHaveAttribute("aria-pressed", "true");

  const year = await openSearch(page);
  await year.input.fill("Ir para 1969");
  await year.input.press("Enter");
  await expect.poll(() => new URL(page.url()).searchParams.get("ano")).toBe("1969");
  await expect.poll(() => new URL(page.url()).searchParams.get("camera")).not.toBeNull();
  const before = new URL(page.url()).searchParams.get("camera");
  await expect.poll(async () => {
    await page.mouse.move(420, 450);
    await page.mouse.wheel(0, -160);
    return new URL(page.url()).searchParams.get("camera");
  }).not.toBe(before);

  const link = new URL(page.url());
  const expected = link.searchParams.get("camera")!.split(",").map(Number);
  expect(link.hash).toBe("#globo");
  expect(link.searchParams.get("origem")).toBe("aula");
  expect(link.searchParams.get("pais")).toBe("PER");
  expect(link.searchParams.get("camadas")).toBe("NASA_FIRMS");

  const reopened = await context.newPage();
  try {
    await reopened.goto(link.href);
    await expect(reopened.getByRole("tab", { name: "Peru" })).toBeVisible();
    await expect(reopened.getByTestId("top-nav-observatory-button")).toHaveAttribute("aria-pressed", "true");
    await expect.poll(() => reopened.evaluate(([x, y, z]) => {
      const actual = (window as CameraProbe).explorerCamera;
      return actual ? Math.hypot(actual[0] - x, actual[1] - y, actual[2] - z) : Infinity;
    }, expected)).toBeLessThan(0.001);
  } finally {
    await reopened.close();
  }
});

test("atalho em uma tela sem globo abre o comparador com os países do comando", async ({ page }) => {
  await page.goto("/telluslab");
  const { input } = await openSearch(page);
  await input.fill("Abrir comparador BRA, ARG");
  await input.press("Enter");
  const comparator = page.getByRole("dialog", { name: /Comparador multidimensional/ });
  await expect(comparator).toBeVisible();
  await expect(comparator.getByRole("button", { name: "Remover Brasil" })).toBeVisible();
  await expect(comparator.getByRole("button", { name: "Remover Argentina" })).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.get("comparar")).toBe("BRA,ARG");
});
