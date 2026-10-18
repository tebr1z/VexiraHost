import { describe, expect, it } from "vitest";

import { pricesFromAdmin, toProductPayload, type ProductFormValues } from "./product-form";

describe("license product admin payload", () => {
  it("preserves one-time prices and discounts and never submits yearly prices", () => {
    const prices = pricesFromAdmin(
      [{ currency: "USD", period: "ONE_TIME", originalPrice: 60, salePrice: 49 }],
      49,
    );
    const values: ProductFormValues = {
      name: "Test key",
      description: "",
      category: "LICENSE",
      catalogCategoryId: "",
      hostingPlanSlug: "",
      price: "49",
      minimumQuantity: "1",
      requiresQuote: false,
      isActive: true,
      sortOrder: "0",
      enabledCurrencies: ["USD", "EUR", "AZN"],
      yearlyEnabled: true,
      prices,
      deliveryMode: "MANUAL",
      isFree: false,
      licenseKeys: "",
      downloadUrl: "",
      downloadFileName: "",
      promoText: "",
      activationGuideText: "",
      activationGuideImageUrl: "",
      activationGuideVideoUrl: "",
    };
    const payload = toProductPayload(values);
    expect(payload.billingCycle).toBe("ONE_TIME");
    expect(payload.price).toBe(49);
    expect(payload.prices.every((row) => row.period === "ONE_TIME")).toBe(true);
    expect(payload.prices.find((row) => row.currency === "USD")).toMatchObject({
      originalPrice: 60,
      salePrice: 49,
    });
  });
});
