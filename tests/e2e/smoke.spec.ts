import { expect, test } from "@playwright/test";

test("landing page renders the Roster brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("app-title")).toHaveText("Roster");
});

test("an unknown route shows the 404 page with a link home", async ({ page }) => {
  await page.goto("/this-route-does-not-exist");
  await expect(page.getByText("Page not found")).toBeVisible();
  await page.getByRole("link", { name: "Go home" }).click();
  await expect(page).toHaveURL("/");
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
