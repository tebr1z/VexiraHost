import { ServiceUnavailableException } from "@nestjs/common";

import { assertMockProviderAllowed } from "./mock-provider.guard";

describe("assertMockProviderAllowed", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it("allows mock providers outside production", () => {
    process.env.NODE_ENV = "test";
    expect(() => assertMockProviderAllowed("Mock registrar")).not.toThrow();
  });

  it("blocks mock providers in production", () => {
    process.env.NODE_ENV = "production";
    expect(() => assertMockProviderAllowed("Mock registrar")).toThrow(ServiceUnavailableException);
  });
});
