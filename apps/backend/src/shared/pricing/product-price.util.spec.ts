import type { ProductPrice } from "@prisma/client";

import { oneTimeProductPrices, resolveProductPrice } from "./product-price.util";
import { expandProductPricesFromUsdSource } from "./usd-price-expand.util";

const prices = [
  { currency: "USD", period: "MONTHLY", originalPrice: 60, salePrice: 49 },
  { currency: "USD", period: "YEARLY", originalPrice: 720, salePrice: 490 },
  { currency: "AZN", period: "MONTHLY", originalPrice: 102, salePrice: 83.3 },
] as unknown as ProductPrice[];

describe("one-time product prices", () => {
  it("uses the existing base price once, never a yearly multiplier", () => {
    expect(resolveProductPrice(prices, "USD", "ONE_TIME")).toMatchObject({
      period: "ONE_TIME",
      currency: "USD",
      salePrice: 49,
      originalPrice: 60,
    });
  });
  it("prefers an explicit one-time price over a legacy monthly row", () => {
    const rows = [
      ...prices,
      {
        currency: "USD",
        period: "ONE_TIME",
        originalPrice: 55,
        salePrice: 45,
      } as unknown as ProductPrice,
    ];
    expect(resolveProductPrice(rows, "USD", "ONE_TIME")?.salePrice).toBe(45);
    expect(oneTimeProductPrices(rows).filter((p) => p.currency === "USD")).toHaveLength(1);
  });
  it("uses the selected currency without relabelling a fallback amount", () => {
    expect(resolveProductPrice(prices, "AZN", "ONE_TIME")).toMatchObject({
      currency: "AZN",
      salePrice: 83.3,
    });
    expect(resolveProductPrice(prices, "EUR", "ONE_TIME")).toMatchObject({
      currency: "USD",
      salePrice: 49,
    });
  });
  it("preserves free prices and an empty matrix", () => {
    expect(
      resolveProductPrice(
        [
          {
            currency: "USD",
            period: "ONE_TIME",
            originalPrice: 0,
            salePrice: 0,
          } as unknown as ProductPrice,
        ],
        "USD",
        "ONE_TIME",
      )?.salePrice,
    ).toBe(0);
    expect(resolveProductPrice([], "USD", "ONE_TIME")).toBeNull();
  });
  it("does not change ordinary subscription pricing", () => {
    expect(resolveProductPrice(prices, "USD", "YEARLY")).toMatchObject({
      period: "YEARLY",
      salePrice: 490,
    });
    expect(resolveProductPrice(prices, "USD", "MONTHLY")?.salePrice).toBe(49);
  });
  it("applies a currently active campaign after the package price", () => {
    expect(
      resolveProductPrice(prices, "USD", "MONTHLY", {
        campaignDiscountPercent: 30,
        campaignStartsAt: new Date("2020-01-01T00:00:00.000Z"),
        campaignEndsAt: new Date("2099-01-01T00:00:00.000Z"),
      }),
    ).toMatchObject({
      originalPrice: 49,
      salePrice: 34.3,
      discountPercent: 30,
      campaignActive: true,
    });
  });
  it("ignores an expired campaign", () => {
    expect(
      resolveProductPrice(prices, "USD", "MONTHLY", {
        campaignDiscountPercent: 30,
        campaignEndsAt: new Date("2020-01-01T00:00:00.000Z"),
      })?.salePrice,
    ).toBe(49);
  });
  it("keeps 3 and 6-month package rows when expanding currencies", () => {
    const rows = expandProductPricesFromUsdSource(
      [
        { currency: "USD", period: "MONTHLY", originalPrice: 10, salePrice: 10 },
        { currency: "USD", period: "QUARTERLY", originalPrice: 30, salePrice: 27 },
        { currency: "USD", period: "SEMIANNUAL", originalPrice: 60, salePrice: 48 },
        { currency: "USD", period: "YEARLY", originalPrice: 120, salePrice: 84 },
      ],
      { usdToAzn: 1.7, usdToEur: 0.9 },
      true,
    );
    expect(
      rows.find((row) => row.currency === "AZN" && row.period === "QUARTERLY")?.salePrice,
    ).toBe(45.9);
    expect(
      rows.find((row) => row.currency === "USD" && row.period === "SEMIANNUAL")?.salePrice,
    ).toBe(48);
  });
  it("expands USD one-time prices without generating yearly prices", () => {
    const rows = expandProductPricesFromUsdSource(
      [{ currency: "USD", period: "ONE_TIME", originalPrice: 60, salePrice: 49 }],
      { usdToAzn: 1.7, usdToEur: 0.9 },
      true,
    );
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.period === "ONE_TIME")).toBe(true);
    expect(rows.find((row) => row.currency === "AZN")?.salePrice).toBe(83.3);
  });
});
