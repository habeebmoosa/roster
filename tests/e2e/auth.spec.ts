import { expect, test } from "@playwright/test";

test("unauthenticated dashboard redirects to sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/signin/);
  await expect(page.getByTestId("google-signin")).toBeVisible();
});

test("unauthenticated settings redirects to sign-in", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/signin/);
});

test("unauthenticated chat redirects to sign-in", async ({ page }) => {
  await page.goto("/chat");
  await expect(page).toHaveURL(/\/signin/);
});

test("unauthenticated provider settings redirects to sign-in", async ({ page }) => {
  await page.goto("/settings/providers");
  await expect(page).toHaveURL(/\/signin/);
});

test("unauthenticated workers redirects to sign-in", async ({ page }) => {
  await page.goto("/workers");
  await expect(page).toHaveURL(/\/signin/);
});

test("unauthenticated worker detail redirects to sign-in", async ({ page }) => {
  await page.goto("/workers/customer-support");
  await expect(page).toHaveURL(/\/signin/);
});

test("unauthenticated connectors redirects to sign-in", async ({ page }) => {
  await page.goto("/connectors");
  await expect(page).toHaveURL(/\/signin/);
});

test("unauthenticated hire wizard redirects to sign-in", async ({ page }) => {
  await page.goto("/hire");
  await expect(page).toHaveURL(/\/signin/);
});

test("sign-in page renders the Google button", async ({ page }) => {
  await page.goto("/signin");
  await expect(page.getByRole("heading", { name: /sign in to roster/i })).toBeVisible();
  await expect(page.getByTestId("google-signin")).toBeVisible();
});

test("landing CTA leads to sign-in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/signin/);
});
