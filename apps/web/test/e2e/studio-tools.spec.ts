import { test, expect } from "@playwright/test";
import fs from "node:fs";

test.describe("D37 · Ferramentas de Estúdio (Régua Geodésica, Exportação do Comparador e Pinos em Estudos)", () => {
  test("Régua geodésica 3D mede km/nm/azimute sem conflitar com seleção de países e Pinos persistem em /study/[slug] + fork", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await expect(page.getByTestId("globe-ruler-toggle")).toBeVisible({ timeout: 20000 });

    // 1. Ativar Régua Geodésica 3D e marcar 2 pontos sobre o globo WebGL
    await page.getByTestId("globe-ruler-toggle").click();
    await expect(page.getByTestId("geodesic-ruler-panel")).toBeVisible();

    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width * 0.5;
    const cy = box!.y + box!.height * 0.5;

    await page.mouse.click(cx - 75, cy + 25);
    await expect(page.getByTestId("ruler-first-point")).toBeVisible();

    await page.mouse.click(cx + 75, cy - 35);
    await expect(page.getByTestId("ruler-total-km")).toBeVisible();
    await expect(page.getByTestId("ruler-total-nm")).toBeVisible();
    await expect(page.getByTestId("ruler-azimuth")).toBeVisible();

    const kmText = await page.getByTestId("ruler-total-km").textContent();
    expect(kmText).toMatch(/\d+.*km/);

    // Fechar a régua e confirmar que ela desaparece limpa sem bloquear cliques normais
    await page.getByTestId("ruler-close-btn").click();
    await expect(page.getByTestId("geodesic-ruler-panel")).toHaveCount(0);

    // 2. Criar Pino Anotado no Estudo, salvar snapshot imutável e validar persistência + fork
    await page.getByTestId("globe-pins-toggle").click();
    await expect(page.getByTestId("study-pins-panel")).toBeVisible();

    await page.getByTestId("pin-use-center-btn").click();
    await expect(page.getByTestId("pin-create-form")).toBeVisible();
    await page.getByTestId("pin-title-input").fill("Marco Atlântico Sul");
    await page.getByTestId("pin-note-input").fill("Ponto de controle geodésico D37.");
    await page.getByTestId("pin-save-btn").click();

    await expect(page.getByTestId("study-pins-list")).toContainText("Marco Atlântico Sul");

    // Abrir modal de compartilhamento pelo atalho do painel de pinos e salvar
    await page.getByTestId("pins-open-share-btn").click();
    await expect(page.getByTestId("modal-annotations-badge")).toBeVisible();

    await page.getByRole("button", { name: /Gerar link de estudo/i }).click();
    const shareInput = page.getByLabel(/Link do estudo compartilhável/i);
    await expect(shareInput).toBeVisible({ timeout: 10000 });
    const shareUrl = await shareInput.inputValue();
    expect(shareUrl).toMatch(/\/study\/estudo-/);

    // Abrir o link imutável gerado e verificar o selo de pinos + bloqueio RN16 + fork
    const slugPath = new URL(shareUrl).pathname;
    await page.goto(slugPath);
    await expect(page.getByTestId("fork-study-banner")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("study-annotations-count")).toContainText("1");

    await page.getByTestId("study-annotations-count").click();
    await expect(page.getByTestId("pins-immutable-notice")).toBeVisible();
    await expect(page.getByTestId("study-pins-list")).toContainText("Marco Atlântico Sul");

    // Fazer fork imutável pelo ForkStudyBanner e confirmar que o pino foi herdado
    await page.getByTestId("fork-study-banner").getByRole("button", { name: /Fazer fork/i }).click();
    await page.waitForURL(/\/study\/fork-/, { timeout: 15000 });
    await expect(page.getByTestId("study-annotations-count")).toContainText("1");

    expect(errors).toEqual([]);
  });

  test("Comparador exporta CSV (RFC 4180) e SVG/PNG com atribuição de fonte primária em PT e EN", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/compare?c=BRA,DEU");
    await expect(page.getByTestId("comparison-charts")).toBeVisible({ timeout: 20000 });

    // Download CSV da grade comparativa (PT)
    const [gridCsvDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("comparison-grid-export-csv").click(),
    ]);
    expect(gridCsvDownload.suggestedFilename()).toMatch(/\.csv$/);
    const csvPathPt = await gridCsvDownload.path();
    expect(csvPathPt).not.toBeNull();
    const csvContentPt = fs.readFileSync(csvPathPt!, "utf-8");
    expect(csvContentPt).toContain("iso_pais,pais,codigo_indicador");
    expect(csvContentPt).toContain("Banco Mundial");

    // Download SVG do gráfico ativo (PT)
    const [svgDownloadPt] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("comparison-chart-export-svg").click(),
    ]);
    expect(svgDownloadPt.suggestedFilename()).toMatch(/\.svg$/);
    const svgPathPt = await svgDownloadPt.path();
    const svgContentPt = fs.readFileSync(svgPathPt!, "utf-8");
    expect(svgContentPt).toContain("Fonte primária (RN02)");
    expect(svgContentPt).toContain("NY.GDP.MKTP.CD");

    // Download PNG 2x do gráfico ativo (PT)
    const [pngDownloadPt] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("comparison-chart-export-png").click(),
    ]);
    expect(pngDownloadPt.suggestedFilename()).toMatch(/\.(png|svg)$/);

    // Alternar idioma para Inglês (EN): fechar modal, clicar switcher e reabrir
    await page.keyboard.press("Escape");
    await page.getByTestId("locale-switcher").click();
    await expect(page.getByTestId("locale-switcher")).toHaveText("EN");

    await page.goto("/compare?c=BRA,DEU");
    await expect(page.getByTestId("comparison-charts")).toBeVisible({ timeout: 15000 });

    const [svgDownloadEn] = await Promise.all([
      page.waitForEvent("download"),
      page.getByTestId("comparison-chart-export-svg").click(),
    ]);
    const svgPathEn = await svgDownloadEn.path();
    const svgContentEn = fs.readFileSync(svgPathEn!, "utf-8");
    expect(svgContentEn).toContain("Primary source (RN02): World Bank (WDI)");

    expect(errors).toEqual([]);
  });
});
