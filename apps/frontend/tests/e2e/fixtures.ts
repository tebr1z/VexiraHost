import { expect, test as base } from "@playwright/test";

export const test = base.extend({});

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/health", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        status: "ok",
        maintenance: { enabled: false },
        turnstile: { enabled: false, siteKey: "" },
      },
    });
  });
});

export { expect };
