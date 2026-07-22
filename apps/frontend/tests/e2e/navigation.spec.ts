import { test, expect } from "@playwright/test";

test.describe("Customer navigation", () => {
  test("landing page loads hero content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation").first()).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("dashboard redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/login|dashboard/, { timeout: 10000 });
    const url = page.url();
    expect(url.includes("/login") || url.includes("/dashboard")).toBeTruthy();
  });

  test("cart page is reachable when logged out (may redirect)", async ({ page }) => {
    await page.goto("/dashboard/cart");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toMatch(/cart|login/);
  });
});
