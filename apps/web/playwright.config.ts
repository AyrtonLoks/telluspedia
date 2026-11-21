import { defineConfig } from "@playwright/test";

const port = 3002;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./test/e2e",
  workers: 1,
  forbidOnly: !!process.env.CI,
  updateSnapshots: process.env.CI ? "none" : "missing",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  snapshotPathTemplate: "{testDir}/snapshots/{projectName}/{arg}{ext}",
  use: {
    baseURL,
    browserName: "chromium",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    contextOptions: { reducedMotion: "reduce" },
    trace: "retain-on-failure",
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
  projects: [
    { name: "desktop-1366", use: { viewport: { width: 1366, height: 850 } } },
    { name: "desktop-1920", use: { viewport: { width: 1920, height: 1080 } } },
    ...[
      { name: "mobile-375", width: 375, height: 812 },
      { name: "tablet-768", width: 768, height: 1024 },
      { name: "desktop-1680", width: 1680, height: 1050 },
      { name: "desktop-2560", width: 2560, height: 1440 },
    ].map(({ name, width, height }) => ({
      name,
      testMatch: "**/responsive.spec.ts",
      use: { viewport: { width, height } },
    })),
  ],
  webServer: {
    command: `pnpm exec next start -H 127.0.0.1 -p ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
