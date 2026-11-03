import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  testMatch: ["shell.spec.js", "actors.spec.js", "sheet.spec.js"],
  workers: 1,
  use: {
    channel: "msedge",
    headless: true,
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1600, height: 1000 },
  },
  webServer: {
    command: "node scripts/serve.mjs",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
});
