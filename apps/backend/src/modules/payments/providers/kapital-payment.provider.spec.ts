import type { KapitalConfigService } from "../service/kapital-config.service";

import { KapitalPaymentProvider } from "./kapital-payment.provider";

describe("KapitalPaymentProvider", () => {
  const originalEncryptionKey = process.env.HOSTING_CREDENTIALS_KEY;

  beforeAll(() => {
    process.env.HOSTING_CREDENTIALS_KEY = "kapital-provider-test-encryption-key";
  });

  afterAll(() => {
    if (originalEncryptionKey === undefined) {
      delete process.env.HOSTING_CREDENTIALS_KEY;
    } else {
      process.env.HOSTING_CREDENTIALS_KEY = originalEncryptionKey;
    }
  });

  const provider = new KapitalPaymentProvider({} as KapitalConfigService);

  it("encrypts the order password inside the persisted gateway reference", () => {
    const gatewayRef = provider.encodeGatewayRef(284249, "bank-order-password");

    expect(gatewayRef).toMatch(/^kapital:284249:enc:/);
    expect(gatewayRef).not.toContain("bank-order-password");
    expect(provider.parseGatewayRef(gatewayRef)).toEqual({
      kapitalOrderId: 284249,
      password: "bank-order-password",
    });
  });

  it("continues to read legacy plaintext references created before encryption", () => {
    expect(provider.parseGatewayRef("kapital:123:legacy-order-password")).toEqual({
      kapitalOrderId: 123,
      password: "legacy-order-password",
    });
  });

  it("rejects unreadable encrypted references", () => {
    expect(provider.parseGatewayRef("kapital:123:enc:not-valid")).toBeNull();
  });

  it("fulfils only orders whose funds are fully cleared", () => {
    expect(provider.isPaidStatus("FullyPaid")).toBe(true);
    expect(provider.isPaidStatus("Authorized")).toBe(false);
    expect(provider.isPaidStatus("Closed")).toBe(false);
  });
});
