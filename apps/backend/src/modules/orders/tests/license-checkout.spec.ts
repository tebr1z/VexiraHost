import { OrdersService } from "../service/orders.service";

describe("license checkout", () => {
  it("ignores yearly pricing and client-supplied renewal metadata for license keys", async () => {
    const createCheckout = jest.fn().mockImplementation(async (data) => ({
      ...data,
      id: "test-order",
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
      invoices: [],
      items: data.items.map((item: object) => ({ ...item, id: "test-item" })),
    }));
    const products = [
      {
        id: "key",
        name: "License key",
        category: "LICENSE",
        currency: "USD",
        billingCycle: "MONTHLY",
        price: 49,
        prices: [
          { currency: "USD", period: "MONTHLY", originalPrice: 49, salePrice: 49 },
          { currency: "USD", period: "YEARLY", originalPrice: 588, salePrice: 490 },
        ],
      },
    ];
    type Args = ConstructorParameters<typeof OrdersService>;
    const service = new OrdersService(
      {
        findActiveProductsByIds: jest.fn().mockResolvedValue(products),
        createCheckout,
      } as unknown as Args[0],
      {
        findById: jest.fn().mockResolvedValue({
          preferredCurrency: "USD",
          billingPeriod: "YEARLY",
          email: "test@example.invalid",
        }),
      } as unknown as Args[1],
      { sendOrderCreatedNotification: jest.fn() } as unknown as Args[2],
      { notify: jest.fn() } as unknown as Args[3],
      { assertCheckoutOpen: jest.fn() } as unknown as Args[4],
      {} as Args[5],
      {} as Args[6],
      {} as Args[7],
    );
    const order = await service.checkout("test-user", {
      currency: "USD",
      period: "YEARLY",
      items: [
        {
          productId: "key",
          quantity: 2,
          metadata: { period: "YEARLY", autoRenew: true, billingCycle: "YEARLY" },
        },
      ],
    });
    expect(order.total).toBe(98);
    expect(createCheckout.mock.calls[0][0].items[0].metadata).toMatchObject({
      period: "ONE_TIME",
      billingCycle: "ONE_TIME",
      autoRenew: false,
    });
  });
});
