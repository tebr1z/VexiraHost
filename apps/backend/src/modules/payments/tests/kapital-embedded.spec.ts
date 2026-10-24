import { Prisma } from "@prisma/client";

import { PaymentsRepository } from "../repository/payments.repository";
import { PaymentsService } from "../service/payments.service";

function fixture(
  options: {
    status?: string;
    amount?: number;
    currency?: string;
    remoteId?: number;
    unavailable?: boolean;
    alreadyProcessed?: boolean;
  } = {},
) {
  const pending = {
    id: "pay",
    userId: "customer",
    invoiceId: "invoice",
    gatewayRef: "kapital:123:enc:secret",
    status: "PENDING",
    amount: new Prisma.Decimal("12.30"),
    currency: "AZN",
    invoice: { id: "invoice", orderId: "order", status: "OPEN" },
  };
  const repository = {
    findPaymentByIdForUser: jest.fn(async (id, userId) =>
      id === pending.id && userId === pending.userId ? pending : null,
    ),
    findPendingByGatewayRefPrefix: jest.fn(async () =>
      pending.status === "PENDING" ? pending : null,
    ),
    findKapitalPendingForInvoice: jest.fn().mockResolvedValue(pending),
    findInvoiceForUser: jest.fn().mockResolvedValue({
      id: "invoice",
      orderId: "order",
      invoiceNumber: "INV",
      currency: "AZN",
      total: new Prisma.Decimal("12.30"),
      status: "OPEN",
      payments: [],
    }),
    completePendingPayment: jest.fn(async () => {
      pending.status = "COMPLETED";
      pending.invoice.status = "PAID";
      return { id: pending.id, alreadyProcessed: options.alreadyProcessed ?? false };
    }),
    failPendingPayment: jest.fn(async () => {
      pending.status = "FAILED";
      return { count: 1 };
    }),
    createPendingPayment: jest.fn(),
  };
  const bank = {
    isConfigured: jest.fn().mockResolvedValue(true),
    parseGatewayRef: jest.fn().mockReturnValue({ kapitalOrderId: 123, password: "secret" }),
    getOrderStatus: options.unavailable
      ? jest.fn().mockRejectedValue(new Error("unavailable"))
      : jest.fn().mockResolvedValue({
          id: options.remoteId ?? 123,
          status: options.status ?? "Preparing",
          amount: options.amount ?? 12.3,
          currency: options.currency ?? "AZN",
        }),
    getDetailedOrderStatus: jest.fn().mockResolvedValue({}),
    isPaidStatus: (value: string) => value === "FullyPaid",
    getHostedPaymentUrl: jest
      .fn()
      .mockResolvedValue("https://e-commerce.kapitalbank.az/flex?id=123&password=secret"),
    createPurchaseOrder: jest.fn(),
  };
  const fulfil = { fulfillOrder: jest.fn() };
  const service = new PaymentsService(
    repository as never,
    {} as never,
    bank as never,
    {} as never,
    fulfil as never,
    {} as never,
    {} as never,
    {} as never,
    { get: () => ({ provider: "kapital" }) } as never,
    { systemSetting: { findUnique: jest.fn().mockResolvedValue(null) } } as never,
  );
  return { service, repository, bank, fulfil, pending };
}
describe("embedded Kapital verification", () => {
  it("verifies ownership before contacting the bank", async () => {
    const f = fixture();
    await expect(f.service.getKapitalPaymentStatus("other", "pay")).rejects.toThrow("not found");
    expect(f.bank.getOrderStatus).not.toHaveBeenCalled();
    expect(f.repository.completePendingPayment).not.toHaveBeenCalled();
  });
  it("keeps unconfirmed orders pending and returns no gateway secrets", async () => {
    const f = fixture();
    const result = await f.service.getKapitalPaymentStatus("customer", "pay");
    expect(result).toMatchObject({ state: "pending", invoiceId: "invoice", orderId: "order" });
    expect(JSON.stringify(result)).not.toMatch(/secret|gatewayRef|password/);
    expect(f.repository.completePendingPayment).not.toHaveBeenCalled();
  });
  it("completes only a matching FullyPaid bank order", async () => {
    const f = fixture({ status: "FullyPaid" });
    expect(await f.service.getKapitalPaymentStatus("customer", "pay")).toMatchObject({
      state: "paid",
    });
    expect(f.repository.completePendingPayment).toHaveBeenCalledTimes(1);
    expect(f.fulfil.fulfillOrder).toHaveBeenCalledTimes(1);
    await f.service.getKapitalPaymentStatus("customer", "pay");
    expect(f.bank.getOrderStatus).toHaveBeenCalledTimes(1);
  });
  it.each([{ amount: 1 }, { currency: "USD" }, { remoteId: 999 }])(
    "does not complete a mismatched bank response %j",
    async (mismatch) => {
      const f = fixture({ status: "FullyPaid", ...mismatch });
      expect(await f.service.getKapitalPaymentStatus("customer", "pay")).toMatchObject({
        state: "pending",
        verificationUnavailable: true,
      });
      expect(f.fulfil.fulfillOrder).not.toHaveBeenCalled();
    },
  );
  it("does not treat authorization as a paid invoice", async () => {
    const f = fixture({ status: "Authorized" });
    expect(await f.service.getKapitalPaymentStatus("customer", "pay")).toMatchObject({
      state: "pending",
    });
    expect(f.repository.completePendingPayment).not.toHaveBeenCalled();
  });
  it("keeps a bank outage pending", async () => {
    const f = fixture({ unavailable: true });
    expect(await f.service.getKapitalPaymentStatus("customer", "pay")).toMatchObject({
      state: "pending",
      verificationUnavailable: true,
    });
    expect(f.repository.failPendingPayment).not.toHaveBeenCalled();
  });
  it("returns a terminal failed state after the bank declines", async () => {
    const f = fixture({ status: "Declined" });
    expect(await f.service.getKapitalPaymentStatus("customer", "pay")).toMatchObject({
      state: "failed",
    });
    expect(f.repository.completePendingPayment).not.toHaveBeenCalled();
  });
  it("does not fulfil again if another callback already claimed completion", async () => {
    const f = fixture({ status: "FullyPaid", alreadyProcessed: true });
    await f.service.getKapitalPaymentStatus("customer", "pay");
    expect(f.fulfil.fulfillOrder).not.toHaveBeenCalled();
  });
  it("reopens the existing bank order without creating or charging another one", async () => {
    const f = fixture();
    expect(await f.service.charge("customer", { invoiceId: "invoice" })).toMatchObject({
      mode: "redirect",
      provider: "kapital",
      id: "pay",
    });
    expect(f.bank.createPurchaseOrder).not.toHaveBeenCalled();
    expect(f.repository.createPendingPayment).not.toHaveBeenCalled();
  });
  it("does not create a fresh payable order if an old reference is unreadable", async () => {
    const f = fixture();
    f.bank.parseGatewayRef.mockReturnValue(null as never);
    await expect(f.service.charge("customer", { invoiceId: "invoice" })).rejects.toThrow(
      "needs review",
    );
    expect(f.bank.createPurchaseOrder).not.toHaveBeenCalled();
  });
});
describe("pending completion atomic claim", () => {
  function repo(count: number) {
    const tx = {
      payment: {
        updateMany: jest.fn().mockResolvedValue({ count }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: "pay", method: null }),
      },
      invoice: { update: jest.fn() },
      order: { update: jest.fn() },
    };
    const repository = new PaymentsRepository({
      $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx),
    } as never);
    return { repository, tx };
  }
  it("changes invoice and order only for the winning pending claim", async () => {
    const f = repo(1);
    expect(
      await f.repository.completePendingPayment({
        paymentId: "pay",
        invoiceId: "invoice",
        orderId: "order",
      }),
    ).toMatchObject({ alreadyProcessed: false });
    expect(f.tx.payment.updateMany).toHaveBeenCalledWith({
      where: { id: "pay", invoiceId: "invoice", status: "PENDING" },
      data: { status: "COMPLETED" },
    });
    expect(f.tx.invoice.update).toHaveBeenCalledTimes(1);
    expect(f.tx.order.update).toHaveBeenCalledTimes(1);
  });
  it("does not repeat invoice or order side effects for another poll/callback", async () => {
    const f = repo(0);
    expect(
      await f.repository.completePendingPayment({
        paymentId: "pay",
        invoiceId: "invoice",
        orderId: "order",
      }),
    ).toMatchObject({ alreadyProcessed: true });
    expect(f.tx.invoice.update).not.toHaveBeenCalled();
    expect(f.tx.order.update).not.toHaveBeenCalled();
  });
});
