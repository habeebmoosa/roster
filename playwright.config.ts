import { defineConfig, devices } from "@playwright/test";

// E2E smoke tests run against a production build (`npm run start`).
// Build first: `npm run build`, then `npm run test:e2e`.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "list" : "html",
  use: {
    baseURL: "http://localhost:3005",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run start",
    url: "http://localhost:3005",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
