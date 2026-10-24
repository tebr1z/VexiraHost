import { DomainCheckoutService } from "./domain-checkout.service";

describe("domain checkout quote", () => {
  function setup(
    overrides: { available?: boolean; premium?: boolean; price?: number; exists?: boolean } = {},
  ) {
    type Args = ConstructorParameters<typeof DomainCheckoutService>;
    const registrar = {
      search: jest.fn().mockResolvedValue([
        {
          domain: "example.com",
          available: overrides.available ?? true,
          premium: overrides.premium ?? false,
        },
      ]),
    };
    const service = new DomainCheckoutService(
      {
        listActive: jest.fn().mockResolvedValue([
          {
            tld: "com",
            registerPrice: overrides.price ?? 12,
            transferPrice: 10,
            currency: "USD",
          },
        ]),
      } as unknown as Args[0],
      {
        findByName: jest.fn().mockResolvedValue(overrides.exists ? { id: "existing" } : null),
      } as unknown as Args[1],
      registrar as unknown as Args[2],
      {
        getRates: jest.fn().mockResolvedValue({ usdToAzn: 1.7, usdToEur: 0.9 }),
      } as unknown as Args[3],
    );
    return { service, registrar };
  }
  it("uses configured registration pricing and server exchange rates", async () => {
    expect(await setup().service.quote(" Example.COM ", "register", "AZN")).toMatchObject({
      name: "example.com",
      price: 20.4,
      currency: "AZN",
      fulfillment: "STAFF",
    });
  });
  it("uses the transfer price for an already registered domain", async () => {
    expect(
      await setup({ available: false }).service.quote("example.com", "transfer"),
    ).toMatchObject({ price: 10, mode: "transfer" });
  });
  it.each(["https://example.com", "example.com/path", "a..com", "-bad.com"])(
    "rejects invalid name %s",
    async (name) => {
      const { service, registrar } = setup();
      await expect(service.quote(name, "register")).rejects.toThrow();
      expect(registrar.search).not.toHaveBeenCalled();
    },
  );
  it("rejects unavailable registration and unregistered transfer", async () => {
    await expect(
      setup({ available: false }).service.quote("example.com", "register"),
    ).rejects.toThrow("not available");
    await expect(setup().service.quote("example.com", "transfer")).rejects.toThrow(
      "not registered",
    );
  });
  it("rejects missing, zero, premium and unsupported prices", async () => {
    await expect(setup({ price: 0 }).service.quote("example.com", "register")).rejects.toThrow(
      "not configured",
    );
    await expect(setup({ premium: true }).service.quote("example.com", "register")).rejects.toThrow(
      "not be confirmed",
    );
    await expect(setup().service.quote("example.invalid", "register")).rejects.toThrow(
      "not available",
    );
  });
  it("does not sell domains already managed here", async () => {
    await expect(setup({ exists: true }).service.quote("example.com", "transfer")).rejects.toThrow(
      "already managed",
    );
  });
});
