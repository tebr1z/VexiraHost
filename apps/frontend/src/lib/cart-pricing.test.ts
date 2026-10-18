import { describe, expect, it } from "vitest";

import {
  buildCartItemFromProduct,
  getYearlyOfferFromProduct,
  hasYearlyUpsell,
  resolveCheckoutPeriod,
} from "./cart-pricing";

import type { CatalogProduct } from "@/features/catalog";
import type { CartItem } from "@/stores/cart-store";
import { normalizeLicenseCartItem } from "@/stores/cart-store";

const license = {
  id: "key",
  slug: "key",
  name: "Key",
  category: "LICENSE",
  price: 49,
  currency: "USD",
  billingCycle: "MONTHLY",
  yearlyAvailable: true,
  yearlySavingsPercent: 17,
  prices: [{ currency: "USD", period: "YEARLY", salePrice: 490 }],
} as CatalogProduct;
describe("one-time license carts", () => {
  it("does not offer monthly-to-yearly upgrades for a legacy license", () => {
    expect(getYearlyOfferFromProduct(license)).toEqual({});
    expect(buildCartItemFromProduct(license).billingCycle).toBe("ONE_TIME");
    expect(
      hasYearlyUpsell({
        ...buildCartItemFromProduct(license),
        quantity: 1,
        yearlyPrice: 490,
        yearlySavingsPercent: 17,
      }),
    ).toBe(false);
  });
  it("normalizes old persisted carts without losing quantity or other fields", () => {
    expect(
      normalizeLicenseCartItem({
        category: "LICENSE",
        billingCycle: "YEARLY",
        quantity: 2,
        productId: "key",
        yearlyPrice: 490,
      }),
    ).toMatchObject({
      billingCycle: "ONE_TIME",
      quantity: 2,
      productId: "key",
      yearlyPrice: undefined,
    });
  });
  it("keeps the recurring hosting period in a mixed license/hosting cart", () => {
    const items = [
      { category: "LICENSE", billingCycle: "ONE_TIME" },
      { category: "HOSTING", billingCycle: "YEARLY" },
    ] as CartItem[];
    expect(resolveCheckoutPeriod(items, "MONTHLY")).toBe("YEARLY");
  });
  it("leaves recurring product offers untouched", () => {
    const hosting = { ...license, category: "HOSTING" };
    expect(getYearlyOfferFromProduct(hosting).yearlyPrice).toBe(490);
    const original = { category: "HOSTING", billingCycle: "MONTHLY", quantity: 1 };
    expect(normalizeLicenseCartItem(original)).toBe(original);
  });
  it("carries the minimum order into the cart and blocks quote-only products", () => {
    const workspace = {
      ...license,
      id: "workspace",
      slug: "google-workspace",
      category: "EMAIL",
      billingCycle: "MONTHLY",
      minimumQuantity: 3,
      yearlyAvailable: false,
    };
    expect(buildCartItemFromProduct(workspace).minimumQuantity).toBe(3);
    expect(() => buildCartItemFromProduct({ ...workspace, requiresQuote: true })).toThrow(
      "Quote-only products cannot be added to the cart",
    );
  });
});
