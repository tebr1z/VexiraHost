import { beforeEach, describe, it, expect, vi } from "vitest";

const mocks = vi.hoisted(() => ({ checkout: vi.fn(), chargeInvoice: vi.fn() }));
vi.mock("../services/billing.service", () => mocks);
import { performCheckout } from "./perform-checkout";
const items = [
  {
    productId: "p",
    slug: "p",
    name: "Hosting",
    category: "HOSTING",
    primaryDomain: "example.com",
    price: 10,
    currency: "AZN",
    billingCycle: "MONTHLY",
    quantity: 1,
  },
];
describe("embedded checkout handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkout.mockResolvedValue({
      id: "order",
      invoice: { id: "invoice", total: 10, status: "OPEN" },
    });
  });
  it("preserves the payment and invoice identity when opening the bank form", async () => {
    mocks.chargeInvoice.mockResolvedValue({
      id: "payment",
      mode: "redirect",
      provider: "kapital",
      redirectUrl: "https://e-commerce.kapitalbank.az/flex?id=1&password=test",
    });
    expect(
      await performCheckout(items, null, "required", { requireBillingAddress: false }),
    ).toMatchObject({
      orderId: "order",
      invoiceId: "invoice",
      paymentId: "payment",
      paymentProvider: "kapital",
      hasHosting: true,
    });
    expect(mocks.chargeInvoice).toHaveBeenCalledTimes(1);
  });
  it("does not open or charge a paid invoice again", async () => {
    mocks.checkout.mockResolvedValue({
      id: "order",
      invoice: { id: "invoice", total: 10, status: "PAID" },
    });
    expect(
      await performCheckout(items, null, "required", { requireBillingAddress: false }),
    ).not.toHaveProperty("redirectUrl");
    expect(mocks.chargeInvoice).not.toHaveBeenCalled();
  });
});
