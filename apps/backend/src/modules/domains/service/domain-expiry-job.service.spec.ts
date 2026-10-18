import { DomainManagementMode, DomainStatus } from "@prisma/client";

import { DomainExpiryJobService } from "./domain-expiry-job.service";

describe("DomainExpiryJobService", () => {
  it("routes registrar renewals through the shared balance-first payment engine", async () => {
    const domain = {
      id: "domain-1",
      userId: "user-1",
      name: "example.com",
      managementMode: DomainManagementMode.REGISTRAR,
      status: DomainStatus.ACTIVE,
      autoRenew: true,
      expiresAt: new Date("2026-10-01T00:00:00.000Z"),
      billingAmount: 18,
      billingCurrency: "USD",
      renewalInvoiceId: null,
      lateFeeAppliedAt: null,
      user: {
        email: "customer@example.com",
        firstName: "Test",
        lastName: "User",
        localeHistory: ["az"],
      },
    };
    const prisma = {
      domain: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([domain])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
        update: jest.fn().mockResolvedValue(domain),
      },
      invoice: { findUnique: jest.fn(), update: jest.fn() },
      domainExpiryReminder: { create: jest.fn() },
    };
    const billing = {
      createDomainInvoice: jest.fn().mockResolvedValue({
        id: "invoice-1",
        invoiceNumber: "INV-1",
        total: 18.18,
      }),
      activateAfterRenewalPayment: jest.fn(),
    };
    const email = {
      sendPreExpiryReminder: jest.fn(),
      sendPostExpiryReminder: jest.fn(),
      sendDomainDeletedEmail: jest.fn(),
    };
    const renewalPayment = { tryPay: jest.fn().mockResolvedValue("balance") };
    const service = new DomainExpiryJobService(
      prisma as never,
      billing as never,
      email as never,
      renewalPayment as never,
    );

    await service.tick();

    expect(renewalPayment.tryPay).toHaveBeenCalledWith("user-1", "invoice-1");
    expect(email.sendPostExpiryReminder).not.toHaveBeenCalled();
    expect(prisma.domain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "domain-1" },
        data: expect.objectContaining({ renewalInvoiceId: "invoice-1" }),
      }),
    );
  });
});
