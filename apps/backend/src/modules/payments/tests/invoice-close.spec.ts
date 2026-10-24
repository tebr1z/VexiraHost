import { Prisma } from "@prisma/client";

import { PaymentsRepository } from "../repository/payments.repository";
import { BalanceService } from "../service/balance.service";

function fixture(
  status = "OPEN",
  payments: Array<{ status: string; amount: Prisma.Decimal }> = [],
) {
  const invoice = {
    id: "invoice",
    userId: "customer",
    orderId: "order",
    status,
    total: new Prisma.Decimal(10),
    currency: "AZN",
    payments,
  };
  const tx = {
    $queryRaw: jest.fn(async () => []),
    invoice: {
      findUnique: jest.fn(async () => invoice),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) =>
        Object.assign(invoice, data),
      ),
    },
    payment: {
      create: jest.fn(async ({ data }: { data: (typeof payments)[number] }) => {
        payments.push(data);
        return data;
      }),
      updateMany: jest.fn(),
    },
    order: { update: jest.fn() },
  };
  const repository = new PaymentsRepository({
    $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx),
  } as never);
  const input = {
    userId: "customer",
    invoiceId: "invoice",
    orderId: "order",
    amount: new Prisma.Decimal(10),
    currency: "AZN",
    note: "admin_mark_paid:invoice",
  };
  return { repository, tx, invoice, input };
}
describe("invoice closure financial rules", () => {
  it.each(["OPEN", "OVERDUE", "DRAFT"])(
    "voids an unpaid %s invoice without deleting it or cancelling the service",
    async (status) => {
      const f = fixture(status);
      expect(await f.repository.voidInvoice("invoice")).toMatchObject({ status: "VOID" });
      expect(f.tx.invoice.update).toHaveBeenCalledTimes(1);
      expect(f.tx.payment.create).not.toHaveBeenCalled();
      expect(f.tx.order.update).not.toHaveBeenCalled();
    },
  );
  it("keeps repeated cancellation idempotent", async () => {
    const f = fixture();
    await f.repository.voidInvoice("invoice");
    await f.repository.voidInvoice("invoice");
    expect(f.tx.invoice.update).toHaveBeenCalledTimes(1);
  });
  it("rejects cancellation of paid invoices", async () => {
    const f = fixture("PAID");
    await expect(f.repository.voidInvoice("invoice")).rejects.toThrow("INVOICE_ALREADY_PAID");
    expect(f.tx.invoice.update).not.toHaveBeenCalled();
  });
  it("does not discard a partial payment", async () => {
    const f = fixture("OPEN", [{ status: "COMPLETED", amount: new Prisma.Decimal(3) }]);
    await expect(f.repository.voidInvoice("invoice")).rejects.toThrow("INVOICE_HAS_PAYMENTS");
    expect(f.tx.invoice.update).not.toHaveBeenCalled();
  });
  it.each(["void", "paid"])("blocks manual %s while a bank payment is pending", async (action) => {
    const f = fixture("OPEN", [{ status: "PENDING", amount: new Prisma.Decimal(10) }]);
    await expect(
      action === "void"
        ? f.repository.voidInvoice("invoice")
        : f.repository.markInvoicePaidManually(f.input),
    ).rejects.toThrow("INVOICE_PENDING_PAYMENT");
    expect(f.tx.invoice.update).not.toHaveBeenCalled();
    expect(f.tx.payment.create).not.toHaveBeenCalled();
  });
  it("records only the unpaid remainder and never repeats it", async () => {
    const f = fixture("OVERDUE", [{ status: "COMPLETED", amount: new Prisma.Decimal(3) }]);
    expect(await f.repository.markInvoicePaidManually(f.input)).toMatchObject({
      alreadyPaid: false,
    });
    expect(f.tx.payment.create.mock.calls[0]![0].data.amount.toString()).toBe("7");
    expect(await f.repository.markInvoicePaidManually(f.input)).toMatchObject({
      alreadyPaid: true,
    });
    expect(f.tx.payment.create).toHaveBeenCalledTimes(1);
    expect(f.tx.order.update).toHaveBeenCalledTimes(1);
  });
  it.each(["VOID", "DRAFT"])("cannot manually mark a %s invoice paid", async (status) => {
    const f = fixture(status);
    await expect(f.repository.markInvoicePaidManually(f.input)).rejects.toThrow(
      "INVOICE_NOT_PAYABLE",
    );
    expect(f.tx.payment.create).not.toHaveBeenCalled();
  });
  it("returns not found for a missing invoice", async () => {
    const f = fixture();
    f.tx.invoice.findUnique.mockResolvedValue(null as never);
    await expect(f.repository.voidInvoice("missing")).rejects.toThrow("Invoice not found");
  });
  it("does not return a new bank payment URL after an invoice closes", async () => {
    const f = fixture("VOID");
    await expect(
      f.repository.createPendingPayment({ ...f.input, gatewayRef: "kapital:123:enc:fixture" }),
    ).rejects.toThrow("INVOICE_NOT_PAYABLE");
    expect(f.tx.payment.create).not.toHaveBeenCalled();
  });
  it("does not revive a void invoice through a late gateway callback", async () => {
    const f = fixture("VOID");
    await expect(
      f.repository.completePendingPayment({ paymentId: "pay", invoiceId: "invoice" }),
    ).rejects.toThrow("INVOICE_NOT_PAYABLE");
    expect(f.tx.payment.updateMany).not.toHaveBeenCalled();
    expect(f.tx.invoice.update).not.toHaveBeenCalled();
  });
  it("does not revive a void invoice through a zero/mock payment", async () => {
    const f = fixture("VOID");
    await expect(
      f.repository.completePayment({ ...f.input, gatewayRef: "zero-amount-fixture" }),
    ).rejects.toThrow("INVOICE_NOT_PAYABLE");
    expect(f.tx.payment.create).not.toHaveBeenCalled();
  });
});
describe("closed invoice balance payments", () => {
  it("cannot activate a zero-total void invoice through the already-paid shortcut", async () => {
    const prisma = {
      invoice: {
        findFirst: jest.fn(async () => ({ id: "invoice", status: "VOID", total: 0, payments: [] })),
      },
    };
    const fulfill = { fulfillOrder: jest.fn() };
    const service = new BalanceService(
      prisma as never,
      {} as never,
      fulfill as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(service.payInvoiceWithBalance("customer", "invoice")).rejects.toThrow(
      "Invoice is not payable",
    );
    expect(fulfill.fulfillOrder).not.toHaveBeenCalled();
  });
});
