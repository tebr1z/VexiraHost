import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("should display landing navigation and main content", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("navigation").first()).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });
});
