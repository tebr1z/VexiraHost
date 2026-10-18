import { InvoiceStatus } from "@prisma/client";

import { RenewalPaymentService } from "./renewal-payment.service";

function fixture(input?: { balancePaid?: boolean; epointPaid?: boolean; recentFailure?: boolean }) {
  const prisma = {
    invoice: {
      findUnique: jest.fn().mockResolvedValue({
        id: "invoice-1",
        status: InvoiceStatus.OPEN,
        total: 20,
        payments: [],
      }),
    },
    payment: {
      findFirst: jest.fn().mockResolvedValue(input?.recentFailure ? { id: "failed-1" } : null),
    },
  };
  const balance = {
    payInvoiceWithBalance: input?.balancePaid
      ? jest.fn().mockResolvedValue({ invoiceFullyPaid: true })
      : jest.fn().mockRejectedValue(new Error("Insufficient account balance")),
  };
  const payments = {
    tryEpointAutoRenewal: jest.fn().mockResolvedValue(input?.epointPaid ?? false),
  };
  const service = new RenewalPaymentService(prisma as never, balance as never, payments as never);
  return { service, prisma, balance, payments };
}

describe("RenewalPaymentService", () => {
  it("uses account balance before the saved card", async () => {
    const value = fixture({ balancePaid: true, epointPaid: true });
    await expect(value.service.tryPay("user-1", "invoice-1")).resolves.toBe("balance");
    expect(value.balance.payInvoiceWithBalance).toHaveBeenCalledWith("user-1", "invoice-1", 20);
    expect(value.payments.tryEpointAutoRenewal).not.toHaveBeenCalled();
  });

  it("falls back to Epoint when balance is insufficient", async () => {
    const value = fixture({ epointPaid: true });
    await expect(value.service.tryPay("user-1", "invoice-1")).resolves.toBe("epoint");
    expect(value.payments.tryEpointAutoRenewal).toHaveBeenCalledWith("user-1", "invoice-1");
  });

  it("does not retry a declined saved card more than once per 24 hours", async () => {
    const value = fixture({ recentFailure: true, epointPaid: true });
    await expect(value.service.tryPay("user-1", "invoice-1")).resolves.toBe("unpaid");
    expect(value.payments.tryEpointAutoRenewal).not.toHaveBeenCalled();
    expect(value.prisma.payment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          invoiceId: "invoice-1",
          gatewayRef: { startsWith: "epoint:auto:" },
        }),
      }),
    );
  });
});
