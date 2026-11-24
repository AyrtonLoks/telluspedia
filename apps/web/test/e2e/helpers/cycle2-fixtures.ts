import { expect, type ConsoleMessage, type Page } from "@playwright/test";
import { buildClimatologyWindField } from "../../../src/lib/winds-data";
import { buildClimatologyCurrentsGrid } from "../../../src/lib/currents-data";

const FIXED_ISO = "2026-11-24T12:00:00.000Z";

// 1x1 PNG transparente (evita falhas de rede em ambiente offline ao carregar bandeiras externas).
const TRANSPARENT_PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

const HYDRATION_OR_REACT_WARNING =
  /hydration|didn't match|did not match|validateDOMNesting|cannot be a descendant|already been passed to createRoot|synchronously unmount/i;

export interface ErrorCollector {
  consoleErrors: string[];
  hydrationWarnings: string[];
  pageErrors: string[];
  assertClean: () => void;
}

/** Coleta erros de console, exceções não tratadas e avisos de hidratação do React. */
export function attachErrorCollector(page: Page): ErrorCollector {
  const consoleErrors: string[] = [];
  const hydrationWarnings: string[] = [];
  const pageErrors: string[] = [];

  page.on("pageerror", (error: Error) => {
    pageErrors.push(error.message);
  });

  page.on("console", (message: ConsoleMessage) => {
    const text = message.text();
    if (message.type() === "error") {
      consoleErrors.push(text);
    } else if (message.type() === "warning" && HYDRATION_OR_REACT_WARNING.test(text)) {
      hydrationWarnings.push(text);
    }
  });

  return {
    consoleErrors,
    hydrationWarnings,
    pageErrors,
    assertClean() {
      expect(pageErrors, "Uncaught page errors").toEqual([]);
      expect(hydrationWarnings, "React hydration/DOM nesting warnings").toEqual([]);
      expect(consoleErrors, "Browser console errors").toEqual([]);
    },
  };
}

/** Mantém o loop WebGL em SwiftShader responsivo enquanto executa a cena 3D real. */
export async function paceSoftwareWebGL(page: Page) {
  await page.addInitScript(() => {
    window.requestAnimationFrame = (draw) => window.setTimeout(() => draw(performance.now()), 200);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  });
}

const GIBS_META_BY_PRODUCT: Record<string, { layer: string; fallbackMonth: string; fallbackImage: string }> = {
  ndvi: {
    layer: "MODIS_Terra_L3_NDVI_Monthly",
    fallbackMonth: "2024-07",
    fallbackImage: "/observatory/gibs/ndvi-ref.webp",
  },
  snow: {
    layer: "MODIS_Terra_L3_Snow_Cover_Monthly_Average_Pct",
    fallbackMonth: "2024-01",
    fallbackImage: "/observatory/gibs/snow-ref.webp",
  },
  seaice: {
    layer: "GHRSST_L4_MUR_Sea_Ice_Concentration",
    fallbackMonth: "2024-09",
    fallbackImage: "/observatory/gibs/seaice-ref.webp",
  },
  lst: {
    layer: "MODIS_Terra_L3_Land_Surface_Temp_Monthly_Day",
    fallbackMonth: "2024-07",
    fallbackImage: "/observatory/gibs/lst-ref.webp",
  },
};

/**
 * Intercepta rotas externas e de telemetria com envelopes T05 determinísticos,
 * garantindo execução 100% offline/estável no CI e em máquinas locais.
 */
export async function installDeterministicRoutes(page: Page) {
  const windField = buildClimatologyWindField(FIXED_ISO);
  const currentsGrid = buildClimatologyCurrentsGrid(FIXED_ISO);

  await page.route("https://flagcdn.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: TRANSPARENT_PNG_1X1 })
  );

  await page.route("**/api/weather**", (route) =>
    route.fulfill({
      status: 200,
      json: {
        temperature: 23,
        apparent_temperature: 24,
        relative_humidity: 63,
        precipitation: 0,
        weather_code: 0,
        wind_speed: 11,
        reference_time: Date.parse(FIXED_ISO) / 1000,
        cached: true,
      },
    })
  );

  await page.route("**/api/observatory/firms**", (route) =>
    route.fulfill({
      status: 200,
      json: {
        data: {
          count: 1,
          lat: [-10.5],
          lng: [-55.2],
          brightness: [335],
          frp: [42],
          confidence: ["high"],
          satellite: ["VIIRS"],
          acqDate: ["2026-11-24"],
        },
        meta: {
          source: "fallback",
          provider: "TellusPedia (E2E fixture)",
          fetchedAt: FIXED_ISO,
          stale: false,
        },
        total: 1,
        byCountry: { BRA: { count: 1, totalFrp: 42 } },
        window: { days: 1, confidence: "nominal" },
        schema: "firms-columns-v1",
      },
    })
  );

  await page.route("**/api/observatory/gibs/image**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: TRANSPARENT_PNG_1X1 })
  );

  await page.route("**/api/observatory/gibs?**", (route) => {
    const url = new URL(route.request().url());
    const product = url.searchParams.get("product") ?? "ndvi";
    const meta = GIBS_META_BY_PRODUCT[product] ?? GIBS_META_BY_PRODUCT.ndvi;
    const requestedMonth = url.searchParams.get("month") ?? "2026-10";
    // `ndvi` responde live (mês atual); `lst` responde fallback local para exercitar `gibs-reference-note`.
    const isFallback = product === "lst";
    const imageMonth = isFallback ? meta.fallbackMonth : requestedMonth;

    return route.fulfill({
      status: 200,
      json: {
        data: {
          product,
          month: requestedMonth,
          imageMonth,
          imageUrl: meta.fallbackImage,
          gibsLayer: meta.layer,
          time: `${imageMonth}-01`,
        },
        meta: isFallback
          ? {
              source: "fallback",
              provider: `Referência local (NASA GIBS, ${meta.fallbackMonth})`,
              fetchedAt: FIXED_ISO,
              stale: false,
              reason: `Fixture determinística E2E: referência local de ${meta.fallbackMonth}.`,
            }
          : {
              source: "live",
              provider: "NASA GIBS (E2E fixture)",
              fetchedAt: FIXED_ISO,
              stale: false,
            },
      },
    });
  });

  await page.route("**/api/observatory/winds**", (route) =>
    route.fulfill({
      status: 200,
      json: {
        data: windField,
        meta: {
          source: "live",
          provider: "NOAA GFS (E2E fixture)",
          fetchedAt: FIXED_ISO,
          stale: false,
        },
      },
    })
  );

  await page.route("**/api/observatory/currents**", (route) =>
    route.fulfill({
      status: 200,
      json: {
        data: currentsGrid,
        meta: {
          source: "live",
          provider: "Open-Meteo Marine (E2E fixture)",
          fetchedAt: FIXED_ISO,
          stale: false,
        },
      },
    })
  );
}
