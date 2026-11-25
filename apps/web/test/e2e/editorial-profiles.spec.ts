import { expect, test, type Page } from "@playwright/test";

function attachErrorCollectors(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  return { pageErrors, consoleErrors };
}

test.describe("D35: Perfis Editoriais Bilíngues RN13 sob Demanda", () => {
  test("carrega dossiê curado da China sob demanda em PT/EN, exibe fontes auditadas e abre citação sem erros", async ({
    page,
  }) => {
    const { pageErrors, consoleErrors } = attachErrorCollectors(page);

    await page.goto("/?visao=1&pais=CHN");
    const deepReadBtn = page.getByRole("button", { name: /Aprofundar Estudo/i });
    await expect(deepReadBtn).toBeVisible({ timeout: 25_000 });

    await deepReadBtn.click();

    // Deve abrir diretamente em Geografia com verbete editorial da China (sem empty state)
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByRole("heading", { level: 1 })).toContainText(
      /Planalto Tibetano/i,
      { timeout: 15_000 }
    );
    await expect(dialog.getByTestId("reader-empty-state")).toHaveCount(0);
    await expect(dialog).toContainText("2026-11-25");

    // Navega para Biografias Históricas e Biologia & Saúde Pública
    await dialog.getByRole("button", { name: /Biografias Históricas/i }).click();
    await expect(dialog.getByRole("heading", { level: 1 })).toContainText(/Filosofia Clássica/i);
    await expect(dialog).toContainText("Tu Youyou");

    await dialog.getByRole("button", { name: /Biologia & Saúde Pública/i }).click();
    await expect(dialog.getByRole("heading", { level: 1 })).toContainText(/Panda-Gigante/i);
    await expect(dialog.locator('a[href="https://data.who.int/countries/156"]').first()).toBeVisible();

    // Abre o modal de citação (ABNT/APA/BibTeX) a partir do verbete
    await dialog.getByRole("button", { name: /Citar Verbete/i }).click();
    const citeDialog = page.getByRole("dialog", { name: /Citar:/i });
    await expect(citeDialog).toBeVisible({ timeout: 10_000 });
    await expect(citeDialog).toContainText(/ABNT/i);
    await citeDialog.getByRole("button", { name: "Fechar" }).click();
    await expect(citeDialog).toHaveCount(0);

    // Fecha o Reader (se ainda aberto), alterna idioma para EN e reabre para conferir narrativa bilíngue
    const returnBtn = page.getByRole("button", { name: /Retornar ao globo interativo/i });
    if (await returnBtn.isVisible()) {
      await returnBtn.click();
    }
    await page.getByTestId("locale-switcher").click();

    await page.getByRole("button", { name: /Deep Read/i }).click();
    const enDialog = page.getByRole("dialog");
    await expect(enDialog.getByRole("heading", { level: 1 })).toContainText(
      /Tibetan Plateau/i,
      { timeout: 15_000 }
    );
    await expect(enDialog).toContainText(/Reference:\s*2026-11-25/i);

    // Verifica que nenhum <p> contém <div> no DOM real renderizado
    const invalidNestingCount = await enDialog.locator("p div").count();
    expect(invalidNestingCount).toBe(0);

    expect(pageErrors, `Page errors: ${pageErrors.join("; ")}`).toEqual([]);
    expect(consoleErrors, `Console errors: ${consoleErrors.join("; ")}`).toEqual([]);
  });
});
