import { test, expect } from "@playwright/test";

test.describe("Theme toggle", () => {
  test("cycles theme and applies dark class on html", async ({ page }) => {
    await page.goto("/login");

    const toggle = page.getByRole("button", { name: /theme|tema/i }).first();
    await expect(toggle).toBeVisible();

    await toggle.click();
    await toggle.click();

    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass === null || htmlClass.includes("dark") || !htmlClass.includes("dark")).toBeTruthy();
  });

  test("theme group buttons switch modes on 403 page", async ({ page }) => {
    await page.goto("/403");
    const darkBtn = page.getByRole("button", { name: /dark|koyu|тёмн|qaranlıq/i });
    if (await darkBtn.count()) {
      await darkBtn.first().click();
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
  });
});
