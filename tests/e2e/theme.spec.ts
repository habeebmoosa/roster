import { expect, test } from "@playwright/test";
import { THEME_COOKIE } from "@/lib/theme";

test.describe("theme (SSR, no flash)", () => {
  test("defaults to light when no cookie is set", async ({ page }) => {
    await page.goto("/");
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe("light");
  });

  test("renders dark server-side when the cookie is already set (no client flip)", async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([
      { name: THEME_COOKIE, value: "dark", url: baseURL ?? "http://localhost:3005" },
    ]);

    // Read the raw HTML response — if the server didn't render data-theme="dark"
    // itself, this would be "light" and only a client script would flip it later.
    const response = await page.goto("/");
    const html = await response?.text();
    expect(html).toContain('data-theme="dark"');

    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe("dark");
  });

  test("an invalid cookie value falls back to light", async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: THEME_COOKIE, value: "not-a-real-theme", url: baseURL ?? "http://localhost:3005" },
    ]);
    await page.goto("/");
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(theme).toBe("light");
  });
});
