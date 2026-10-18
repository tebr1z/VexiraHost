import { toPublicGatewayRef } from "./payment-reference.util";

describe("toPublicGatewayRef", () => {
  it("removes the Kapital order password from API responses", () => {
    expect(toPublicGatewayRef("kapital:284249:enc:iv:tag:data")).toBe("kapital:284249");
    expect(toPublicGatewayRef("kapital:123:legacy-password")).toBe("kapital:123");
  });

  it("keeps non-secret provider references unchanged", () => {
    expect(toPublicGatewayRef("balance-123")).toBe("balance-123");
    expect(toPublicGatewayRef(null)).toBeNull();
  });
});
