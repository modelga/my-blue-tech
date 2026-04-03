import { defineConfig, devices } from "@playwright/test";

/**
 * Requires the full Docker stack to be running:
 *   docker compose up -d
 *
 * Frontend: http://localhost:3000
 */
export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: false, // auth state must be sequential (register before login)
  retries: 1,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],

  globalSetup: "./global-setup.ts",

  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
