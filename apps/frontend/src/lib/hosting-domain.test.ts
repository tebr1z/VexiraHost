import { describe, it, expect } from "vitest";

import {
  hostingDomainMetadata,
  isValidHostingDomain,
  normalizeHostingDomain,
} from "./hosting-domain";

import { useCartStore } from "@/stores/cart-store";
describe("hosting domain selection", () => {
  it("normalizes only domain names and rejects URL paths", () => {
    expect(normalizeHostingDomain(" Example.COM ")).toBe("example.com");
    expect(isValidHostingDomain("shop.example.com")).toBe(true);
    for (const value of ["https://example.com", "example.com/path", "-bad.com", "a..com"])
      expect(isValidHostingDomain(value)).toBe(false);
  });
  it("sends the domain intent without trusting client pricing", () => {
    expect(
      hostingDomainMetadata({
        category: "HOSTING",
        primaryDomain: "EXAMPLE.COM",
        domainChoice: { name: "example.com", mode: "transfer", price: 12, currency: "USD" },
      }),
    ).toEqual({ primaryDomain: "example.com", domainMode: "transfer" });
    expect(hostingDomainMetadata({ category: "EMAIL" })).toEqual({});
  });
  it("keeps one hosting account per selected domain and clears purchase intent when a legacy domain is edited", () => {
    const cart = useCartStore.getState();
    cart.clearCart();
    const item = {
      productId: "hosting",
      slug: "hosting",
      name: "Hosting",
      price: 10,
      currency: "USD",
      billingCycle: "MONTHLY",
      category: "HOSTING",
      primaryDomain: "first.com",
      domainChoice: { name: "first.com", mode: "register" as const, price: 12, currency: "USD" },
    };
    cart.addItem(item);
    cart.addItem({
      ...item,
      primaryDomain: "second.com",
      domainChoice: { ...item.domainChoice, name: "second.com" },
    });
    expect(useCartStore.getState().items[0]).toMatchObject({
      quantity: 1,
      primaryDomain: "second.com",
    });
    cart.setPrimaryDomain("hosting", "third.com");
    expect(useCartStore.getState().items[0]?.domainChoice).toBeUndefined();
    cart.clearCart();
  });
});
