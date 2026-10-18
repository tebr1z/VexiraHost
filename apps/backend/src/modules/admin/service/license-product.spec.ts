import { ProductCategory } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import { AdminCatalogService } from "./admin-catalog.service";

describe("admin license product pricing", () => {
  const prices = [
    { currency: "USD" as const, period: "MONTHLY" as const, originalPrice: 49, salePrice: 49 },
    { currency: "USD" as const, period: "YEARLY" as const, originalPrice: 588, salePrice: 490 },
  ];
  function setup() {
    const product = {
      id: "key",
      slug: "test-key",
      name: "Test key",
      description: null,
      category: "LICENSE",
      hostingPlanSlug: null,
      price: new Decimal(49),
      currency: "USD",
      billingCycle: "ONE_TIME",
      isActive: true,
      sortOrder: 0,
      isFree: false,
      prices: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const repository = {
      findProductBySlug: jest.fn().mockResolvedValue(null),
      createProduct: jest.fn().mockResolvedValue(product),
      findProductById: jest.fn().mockResolvedValue(product),
      updateProduct: jest.fn().mockResolvedValue(product),
      replaceProductPrices: jest.fn(),
    };
    type Args = ConstructorParameters<typeof AdminCatalogService>;
    const service = new AdminCatalogService(
      repository as unknown as Args[0],
      {
        getRates: jest.fn().mockResolvedValue({ usdToAzn: 1.7, usdToEur: 0.9 }),
      } as unknown as Args[1],
    );
    return { service, repository };
  }
  it("forces one-time billing and a one-time currency matrix on create", async () => {
    const { service, repository } = setup();
    await service.createProduct({
      name: "Test key",
      category: ProductCategory.LICENSE,
      price: 49,
      billingCycle: "YEARLY",
      prices,
    });
    expect(repository.createProduct).toHaveBeenCalledWith(
      expect.objectContaining({ billingCycle: "ONE_TIME" }),
    );
    const saved = repository.replaceProductPrices.mock.calls[0][1];
    expect(saved).toHaveLength(3);
    expect(saved.every((row: { period: string }) => row.period === "ONE_TIME")).toBe(true);
    expect(saved.find((row: { currency: string }) => row.currency === "USD").salePrice).toBe(49);
  });
  it("cannot turn a license back into an annual subscription on edit", async () => {
    const { service, repository } = setup();
    await service.updateProduct("key", { billingCycle: "YEARLY", prices });
    expect(repository.updateProduct).toHaveBeenCalledWith(
      "key",
      expect.objectContaining({ billingCycle: "ONE_TIME" }),
    );
    expect(
      repository.replaceProductPrices.mock.calls[0][1].every(
        (row: { period: string }) => row.period === "ONE_TIME",
      ),
    ).toBe(true);
  });
});
