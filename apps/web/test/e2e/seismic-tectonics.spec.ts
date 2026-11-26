import { test, expect } from "@playwright/test";

test.describe("D39 · Observatório Sísmico & Tectônico (USGS GeoJSON + Placas PB2002)", () => {
  test("Liga camada sísmica no Observatório, alterna filtros D14, abre boletim no HUD e persiste na URL", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/?visao=1&observatorio=1&painel=observatory");
    await expect(page.getByTestId("observatory-panel")).toBeVisible({ timeout: 20000 });

    // 1. Ativar Terremotos & Placas Tectônicas
    const toggle = page.getByTestId("layer-toggle-USGS_EARTHQUAKES");
    await expect(toggle).toBeVisible();
    await toggle.click();

    await expect(page.getByTestId("layer-source-USGS_EARTHQUAKES")).toBeVisible({
      timeout: 15000,
    });

    // 2. Expandir opções D14 da camada sísmica
    await page.getByTestId("layer-options-toggle-USGS_EARTHQUAKES").click();
    await expect(page.getByTestId("seismic-layer-controls")).toBeVisible();
    await expect(page.getByTestId("seismic-window-group")).toBeVisible();
    await expect(page.getByTestId("seismic-mag-group")).toBeVisible();
    await expect(page.getByTestId("seismic-plates-switch")).toHaveAttribute("aria-checked", "true");

    // Alternar para janela de 7 dias e magnitude M2.5+
    await page.getByTestId("seismic-window-7d").click();
    await page.getByTestId("seismic-mag-2.5").click();

    // URL sincronizada com ?camadas=USGS_EARTHQUAKES e ?sismos=7d,2.5,1
    await expect
      .poll(() => page.url(), { timeout: 10000 })
      .toContain("USGS_EARTHQUAKES");
    await expect
      .poll(() => page.url(), { timeout: 10000 })
      .toContain("sismos=7d%2C2.5%2C1");

    // 3. Clicar no botão do maior sismo da janela para abrir a ficha sísmica no ObservatoryTelemetryHUD
    const strongestBtn = page.getByTestId("seismic-focus-strongest");
    await expect(strongestBtn).toBeVisible({ timeout: 15000 });
    await strongestBtn.click();

    await expect(page.getByTestId("observatory-telemetry-hud")).toBeVisible();
    await expect(page.getByTestId("earthquake-telemetry")).toBeVisible();
    await expect(page.getByTestId("earthquake-usgs-link")).toHaveAttribute(
      "href",
      /^https:\/\/earthquake\.usgs\.gov\//
    );

    // 4. Alternar idioma para EN e validar tradução da telemetria e dos controles
    await page.getByTestId("locale-switcher").click();
    await expect(page.getByTestId("locale-switcher")).toHaveText("EN");
    await expect(page.getByTestId("observatory-telemetry-hud")).toContainText(
      "Seismic Bulletin (USGS)"
    );
    await expect(page.getByTestId("seismic-layer-controls")).toContainText(
      "Tectonic plates (PB2002)"
    );

    expect(errors).toEqual([]);
  });
});
