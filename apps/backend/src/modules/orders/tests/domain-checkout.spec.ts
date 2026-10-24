import { OrdersService } from "../service/orders.service";
describe("hosting domain billing", () => {
  function setup() {
    type Args = ConstructorParameters<typeof OrdersService>;
    const createCheckout = jest.fn(async (data) => ({
      ...data,
      id: "order",
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
      items: data.items.map((item: object) => ({ ...item, id: "item" })),
      invoices: [],
    }));
    const domainQuote = jest.fn(async () => ({
      name: "example.com",
      mode: "register",
      price: 20.4,
      currency: "AZN",
      years: 1,
      fulfillment: "STAFF",
    }));
    const args = [
      {
        findActiveProductsByIds: jest.fn().mockResolvedValue([
          {
            id: "p",
            name: "Hosting",
            category: "HOSTING",
            price: 10,
            currency: "USD",
            billingCycle: "MONTHLY",
            minimumQuantity: 1,
            prices: [],
          },
        ]),
        createCheckout,
      },
      { findById: jest.fn().mockResolvedValue({ email: "customer@example.test" }) },
      { sendOrderCreatedNotification: jest.fn() },
      { notify: jest.fn() },
      { assertCheckoutOpen: jest.fn() },
      { findByPrimaryDomainOwnedByOther: jest.fn().mockResolvedValue(null) },
      {},
      {},
      { getRates: jest.fn().mockResolvedValue({ usdToAzn: 1.7, usdToEur: 0.9 }) },
      { quote: domainQuote },
    ] as unknown as Args;
    return { service: new OrdersService(...args), createCheckout, domainQuote };
  }
  it("charges the domain once while preserving the hosting renewal rate", async () => {
    const { service, createCheckout } = setup();
    await service.checkout("user", {
      currency: "AZN",
      items: [
        {
          productId: "p",
          quantity: 1,
          metadata: {
            primaryDomain: "example.com",
            domainMode: "register",
            domainOrder: { price: 0, fulfillment: "AUTO" },
          },
        },
      ],
    });
    const data = createCheckout.mock.calls[0]![0];
    expect(Number(data.subtotal)).toBe(37.4);
    expect(Number(data.items[0].unitPrice)).toBe(17);
    expect(Number(data.domainLines[0].totalPrice)).toBe(20.4);
    expect(data.items[0].metadata.domainOrder.fulfillment).toBe("STAFF");
  });
  it("using an existing domain never creates a domain fee", async () => {
    const { service, createCheckout, domainQuote } = setup();
    await service.checkout("user", {
      items: [
        {
          productId: "p",
          quantity: 1,
          metadata: {
            primaryDomain: "example.com",
            domainMode: "existing",
            domainOrder: { price: 99 },
          },
        },
      ],
    });
    expect(domainQuote).not.toHaveBeenCalled();
    expect(createCheckout.mock.calls[0]![0].domainLines).toEqual([]);
    expect(createCheckout.mock.calls[0]![0].items[0].metadata.domainOrder).toBeUndefined();
  });
  it("rejects invalid domains, invalid modes and multiple copies of a purchased domain", async () => {
    for (const metadata of [
      { primaryDomain: "invalid" },
      { primaryDomain: "example.com", domainMode: "free" },
    ])
      await expect(
        setup().service.checkout("user", { items: [{ productId: "p", quantity: 1, metadata }] }),
      ).rejects.toThrow();
    await expect(
      setup().service.checkout("user", {
        items: [
          {
            productId: "p",
            quantity: 2,
            metadata: { primaryDomain: "example.com", domainMode: "register" },
          },
        ],
      }),
    ).rejects.toThrow("separate domain");
  });
});
