import { OrdersService } from "../service/orders.service";

function makeService(product: object) {
  type Args = ConstructorParameters<typeof OrdersService>;
  return new OrdersService(
    { findActiveProductsByIds: jest.fn().mockResolvedValue([product]) } as unknown as Args[0],
    {
      findById: jest.fn().mockResolvedValue({ preferredCurrency: "USD", billingPeriod: "MONTHLY" }),
    } as unknown as Args[1],
    {} as Args[2],
    { notify: jest.fn() } as unknown as Args[3],
    { assertCheckoutOpen: jest.fn() } as unknown as Args[4],
    {} as Args[5],
    {} as Args[6],
    {} as Args[7],
    {
      getRates: jest.fn().mockResolvedValue({ usdToAzn: 1.7, usdToEur: 0.9 }),
    } as unknown as Args[8],
    {} as Args[9],
  );
}

const workspace = {
  id: "workspace",
  name: "Google Workspace Business Standard",
  category: "EMAIL",
  currency: "USD",
  billingCycle: "MONTHLY",
  price: 10.5,
  minimumQuantity: 3,
  requiresQuote: false,
  prices: [{ currency: "USD", period: "MONTHLY", originalPrice: 10.5, salePrice: 10.5 }],
};

describe("product checkout rules", () => {
  it("rejects an order below the product minimum", async () => {
    await expect(
      makeService(workspace).checkout("user", {
        currency: "USD",
        period: "MONTHLY",
        items: [{ productId: "workspace", quantity: 2 }],
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ messageKey: "product_minimum_quantity" }),
    });
  });

  it("rejects quote-only products even if a client sends them directly", async () => {
    await expect(
      makeService({ ...workspace, id: "workspace-pro", requiresQuote: true }).checkout("user", {
        currency: "USD",
        period: "MONTHLY",
        items: [{ productId: "workspace-pro", quantity: 3 }],
      }),
    ).rejects.toThrow("This product requires a sales quote");
  });
});
