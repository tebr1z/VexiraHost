import { expect, test } from "./fixtures";

test.describe("SEO and performance guardrails", () => {
  test("home exposes indexable metadata and language alternates", async ({ page }) => {
    await page.goto("/az");
    await expect(page).toHaveTitle(/Vexira/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^https?:\/\//);
    await expect(page.locator('link[rel="alternate"][hreflang="az"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveCount(1);
    await expect(page.locator("h1")).toHaveCount(1);
  });

  test("robots and sitemap expose public URLs but protect private routes", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsText = await robots.text();
    expect(robotsText).toContain("Disallow: /dashboard/");
    expect(robotsText).toContain("Sitemap:");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const sitemapText = await sitemap.text();
    expect(sitemapText).toContain("/az/hosting");
    expect(sitemapText).not.toContain("/dashboard");
  });

  test("home stays within a broad client-side performance budget", async ({ page }) => {
    await page.goto("/az", { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => ({
      domNodes: document.getElementsByTagName("*").length,
      resourceBytes: performance
        .getEntriesByType("resource")
        .reduce((sum, entry) => sum + ((entry as PerformanceResourceTiming).transferSize || 0), 0),
    }));
    expect(metrics.domNodes).toBeLessThan(3_500);
    expect(metrics.resourceBytes).toBeLessThan(6 * 1024 * 1024);
  });
});
