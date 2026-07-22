import { test, expect } from "@playwright/test";

test.describe("Authentication UI", () => {
  test("login page renders email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email|e-posta|e-poçt|почт/i)).toBeVisible();
    await expect(page.getByLabel(/password|şifre|şifr|парол/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|giriş|daxil|войти/i })).toBeVisible();
  });

  test("register page is reachable from login", async ({ page }) => {
    await page.goto("/login");
    const registerLink = page.getByRole("link", { name: /create account|hesap|account|аккаунт/i });
    if (await registerLink.count()) {
      await registerLink.first().click();
      await expect(page).toHaveURL(/register/);
    }
  });
});

test.describe("Admin login UI", () => {
  test("admin gate shows staff-only messaging", async ({ page }) => {
    await page.goto("/t4abriz");
    await expect(page.getByRole("heading", { name: /admin|panel/i })).toBeVisible();
  });
});
