import path from "node:path";
import { test, expect } from "@playwright/test";

const screenshotDir = process.env.D41_SCREENSHOT_DIR ?? "";

test.describe("D41 · Eclipses Solares/Lunares & Sondas do Espaço Profundo no Modo Cosmos", () => {
  test("Inspeciona modelos 3D de Voyager 2 e JWST (escala real), aciona Simulador de Eclipses pela Lua preservando o Cosmos e desce à faixa de Sobral 1919", async ({
    page,
  }) => {
    if (screenshotDir) {
      test.setTimeout(240_000);
    }
    const snap = async (name: string) => {
      if (!screenshotDir) return;
      await page.waitForTimeout(900);
      await page.screenshot({
        path: path.join(screenshotDir, name),
        animations: "allow",
      });
    };

    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.addInitScript(() => {
      // Modera o loop do SwiftShader sem GPU dedicada para não bloquear eventos de ponteiro no CI.
      window.requestAnimationFrame = (draw) =>
        window.setTimeout(() => draw(performance.now()), 220);
      window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    });

    // 1. Entrar no Sistema Solar e inspecionar Voyager 2 e JWST (escala real)
    await page.goto("/?visao=1&modo=cosmos");
    await expect(page.getByTestId("cosmic-layers-toggle")).toBeVisible();
    await page.getByTestId("cosmic-layers-toggle").click();

    await page.getByTestId("cosmic-probe-btn-VOYAGER_2").click();
    await expect(page.getByTestId("cosmic-probe-inspector")).toBeVisible();
    await expect(page.getByTestId("cosmic-probe-inspector")).toContainText("Voyager 2");
    await expect(page.getByTestId("probe-light-time")).toContainText("h");

    await page.getByTestId("cosmic-layers-toggle").click();
    await page.getByTestId("cosmic-scale-real").click();
    await page.getByTestId("cosmic-layers-toggle").click();
    await page.getByTestId("probe-switch-JWST").click();
    await expect(page.getByTestId("cosmic-probe-inspector")).toContainText("James Webb");
    await expect(page.getByTestId("probe-light-time")).toContainText("s-luz");
    await expect.poll(() => page.url(), { timeout: 10000 }).toContain("sonda=JWST");

    // 2. Voltar à escala Visual e acionar o Simulador de Eclipses selecionando a Lua — permanecendo no Cosmos!
    await page.getByTestId("cosmic-layers-toggle").click();
    await page.getByTestId("cosmic-scale-visual").click();
    await page.getByTestId("cosmic-open-eclipses").click();
    await expect(page.getByTestId("moon-eclipse-simulator")).toBeVisible();

    // Eclipse Lunar Total 2025: permanece no Modo Cosmos com foco na Lua (Lua de Sangue)
    await page.getByTestId("eclipse-option-blood-moon-2025").click();
    await expect.poll(() => page.url(), { timeout: 10000 }).toContain("modo=cosmos");
    await expect.poll(() => page.url(), { timeout: 10000 }).toContain("eclipse=blood-moon-2025");
    await expect(page.getByTestId("eclipse-hud")).toHaveCount(0);
    await snap("d41-cosmic-blood-moon.png");

    // Eclipse Solar de Sobral 1919: permanece no Modo Cosmos (foco na Terra diurna em 29/05/1919)
    await page.getByTestId("eclipse-option-sobral-1919").click();
    await expect.poll(() => page.url(), { timeout: 10000 }).toContain("modo=cosmos");
    await expect(page.getByTestId("moon-eclipse-simulator")).toContainText("Sobral");
    await expect(page.locator("a[href='/dossies/einstein']")).toBeVisible();
    await snap("d41-cosmic-sobral.png");

    // 3. Descer explicitamente ao Globo Terrestre para inspecionar a faixa sobre Sobral, CE
    await page.getByTestId("eclipse-inspect-earth").click();
    await expect(page.getByTestId("eclipse-hud")).toBeVisible();
    await expect(page.getByTestId("eclipse-hud")).toContainText("Sobral");
    await expect.poll(() => page.url(), { timeout: 10000 }).not.toContain("modo=cosmos");
    await snap("d41-globe-sobral.png");

    // 4. Alternar idioma para EN e validar traduções completas
    await page.getByTestId("locale-switcher").click();
    await expect(page.getByTestId("locale-switcher")).toHaveText("EN");
    await expect(page.getByTestId("eclipse-hud")).toContainText("Syzygy Ephemeris");

    expect(errors).toEqual([]);
  });
});
