import { CatalogService } from "./catalog.service";

describe("license catalog billing", () => {
  const product = {
    id: "key-product",
    slug: "windows-key",
    name: "Windows key",
    description: null,
    category: "LICENSE",
    hostingPlanSlug: null,
    price: 49,
    currency: "USD",
    billingCycle: "MONTHLY",
    prices: [
      { currency: "USD", period: "MONTHLY", originalPrice: 49, salePrice: 49 },
      { currency: "USD", period: "YEARLY", originalPrice: 588, salePrice: 490 },
    ],
  };
  const makeService = () => {
    type Args = ConstructorParameters<typeof CatalogService>;
    return new CatalogService(
      { findBySlug: jest.fn().mockResolvedValue(product) } as unknown as Args[0],
      {} as Args[1],
    );
  };
  it.each(["MONTHLY", "YEARLY"])(
    "returns a single purchase even when %s is selected globally",
    async (period) => {
      await expect(makeService().getProduct(product.slug, "USD", period)).resolves.toMatchObject({
        price: 49,
        billingCycle: "ONE_TIME",
        yearlyAvailable: false,
        yearlySavingsPercent: 0,
        prices: [{ period: "ONE_TIME", salePrice: 49 }],
      });
    },
  );
});
