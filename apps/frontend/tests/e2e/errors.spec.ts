import { test, expect } from "@playwright/test";

test.describe("Error pages", () => {
  test("404 page shows branded not-found UI", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-vexira-test");
    await expect(page.getByRole("heading", { name: /not found|bulunamad|не найден|tapılmadı/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /homepage|ana sayfa|главн|səhifə/i })).toBeVisible();
  });

  test("403 page renders access denied content", async ({ page }) => {
    await page.goto("/403");
    await expect(page.getByRole("heading", { name: /access denied|erişim redded|запрещ|qadağan/i })).toBeVisible();
    await expect(page.getByText("403")).toBeVisible();
  });
});
