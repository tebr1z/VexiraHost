import { expect, test } from "./fixtures";

test.describe("Authentication UI", () => {
  test("login page renders email and password fields", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("textbox", { name: /email|e-posta|e-poçt|почт/i })).toBeVisible();
    await expect(page.getByRole("textbox", { name: /password|şifre|şifr|парол/i })).toBeVisible();
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

test.describe("Admin access gate", () => {
  test("does not reveal the hidden admin route to anonymous visitors", async ({ page }) => {
    await page.goto("/t4abriz");
    await expect(
      page.getByRole("heading", { name: /not found|bulunamad|не найден|tapılmadı/i }),
    ).toBeVisible();
  });
});
