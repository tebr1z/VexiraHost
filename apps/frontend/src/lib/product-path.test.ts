import { describe, expect, it } from "vitest";

import { formatStorefrontMoney } from "./i18n/format";
import { productPath, productPeriods } from "./product-path";

import type { CatalogProduct } from "@/features/catalog";
const product = {
  id: "one",
  slug: "business-plesk",
  name: "Business Plesk",
  description: null,
  category: "HOSTING",
  hostingPlanSlug: "shared-plan",
  currency: "USD",
  price: 20,
  billingCycle: "MONTHLY",
  prices: [
    { currency: "USD", period: "MONTHLY", originalPrice: 20, salePrice: 20, discountPercent: 0 },
    { currency: "USD", period: "QUARTERLY", originalPrice: 60, salePrice: 45, discountPercent: 25 },
    { currency: "USD", period: "YEARLY", originalPrice: 240, salePrice: 180, discountPercent: 25 },
  ],
} satisfies CatalogProduct;
describe("public product selection", () => {
  it("uses the persisted readable slug while internal IDs stay unchanged", () => {
    expect(productPath({ ...product, slug: "starter-abc123", publicSlug: "business-plesk" })).toBe(
      "/hosting/business-plesk",
    );
  });
  it("uses distinct canonical URLs even when products share one hosting plan", () => {
    expect(productPath(product)).toBe("/hosting/business-plesk");
    expect(productPath({ ...product, slug: "starter-plesk" })).toBe("/hosting/starter-plesk");
  });
  it("uses stored total prices and computes monthly equivalents without offering missing terms", () => {
    const options = productPeriods(product, "USD");
    expect(options.map((row) => row.period)).toEqual(["MONTHLY", "QUARTERLY", "YEARLY"]);
    expect(options[1]).toMatchObject({
      salePrice: 45,
      monthlyPrice: 15,
      savings: 15,
      savingsPercent: 25,
    });
    expect(options[2]).toMatchObject({
      salePrice: 180,
      monthlyPrice: 15,
      savings: 60,
      savingsPercent: 25,
    });
  });
  it("never invents a price in a missing currency", () => {
    expect(productPeriods(product, "EUR")).toEqual([]);
  });
  it("does not turn license keys into subscriptions", () => {
    expect(
      productPeriods(
        {
          ...product,
          category: "LICENSE",
          billingCycle: "ONE_TIME",
          prices: [
            {
              currency: "USD",
              period: "ONE_TIME",
              salePrice: 49,
              originalPrice: 49,
              discountPercent: 0,
            },
          ],
        },
        "USD",
      ),
    ).toMatchObject([{ period: "ONE_TIME", salePrice: 49 }]);
  });
  it("preserves a valid legacy base price without fabricating discounted periods", () => {
    expect(productPeriods({ ...product, prices: [] }, "USD")).toMatchObject([
      { period: "MONTHLY", salePrice: 20 },
    ]);
  });
  it("retains zero pricing for free products", () => {
    expect(
      productPeriods({ ...product, isFree: true, price: 0 }, "USD").every(
        (row) => row.salePrice === 0,
      ),
    ).toBe(true);
  });
});

describe("server-rendered price formatting", () => {
  it("keeps the same symbols and separators without relying on ICU", () => {
    expect(formatStorefrontMoney(4.12, "AZN", "az")).toBe("₼\u00a04,12");
    expect(formatStorefrontMoney(1234.5, "EUR", "de")).toBe("1.234,50\u00a0€");
    expect(formatStorefrontMoney(1234.5, "USD", "en")).toBe("$\u00a01,234.50");
  });
});
