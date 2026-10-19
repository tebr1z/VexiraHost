import { BillingCycle } from "@prisma/client";

import { calculateHostingExpiry } from "./hosting-renewal.util";

describe("calculateHostingExpiry", () => {
  it("renews monthly plans by one calendar month without overflowing month end", () => {
    const result = calculateHostingExpiry(
      new Date("2026-01-31T12:00:00.000Z"),
      BillingCycle.MONTHLY,
    );
    expect(result?.toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("renews yearly plans by one calendar year", () => {
    const result = calculateHostingExpiry(
      new Date("2024-02-29T12:00:00.000Z"),
      BillingCycle.YEARLY,
    );
    expect(result?.toISOString()).toBe("2025-02-28T12:00:00.000Z");
  });

  it("supports 3 and 6-month paid periods", () => {
    expect(
      calculateHostingExpiry(
        new Date("2026-01-31T12:00:00.000Z"),
        BillingCycle.QUARTERLY,
      )?.toISOString(),
    ).toBe("2026-04-30T12:00:00.000Z");
    expect(
      calculateHostingExpiry(
        new Date("2026-01-31T12:00:00.000Z"),
        BillingCycle.SEMIANNUAL,
      )?.toISOString(),
    ).toBe("2026-07-31T12:00:00.000Z");
  });

  it("does not create a renewal period for one-time plans", () => {
    expect(calculateHostingExpiry(new Date(), BillingCycle.ONE_TIME)).toBeNull();
  });
});
