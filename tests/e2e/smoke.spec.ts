import { expect, test } from "@playwright/test";

test("landing page renders the Roster brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("app-title")).toHaveText("Roster");
});

test("dashboard placeholder is reachable", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("health endpoint reports DB + pgvector ready", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);

  const body = await res.json();
  expect(body.status).toBe("ok");
  expect(body.checks.db).toBe(true);
  expect(body.checks.pgvector).toBe(true);
  expect(body.pgvectorVersion).toBeTruthy();
});
