import { BillingCycle, ServiceStatus } from "@prisma/client";

import { HostingExpiryJobService } from "../service/hosting-expiry-job.service";

function createFixture(outcome: "balance" | "epoint" | "unpaid") {
  const account = {
    id: "hosting-1",
    userId: "user-1",
    primaryDomain: "example.com",
    panel: "PLESK",
    status: ServiceStatus.ACTIVE,
    autoRenew: true,
    expiresAt: new Date("2026-10-01T00:00:00.000Z"),
    billingAmount: 12,
    billingCurrency: "USD",
    renewalInvoiceId: null,
    plan: { name: "Pro", billingCycle: BillingCycle.MONTHLY },
    user: {
      id: "user-1",
      email: "customer@example.com",
      firstName: "Test",
      lastName: "User",
      preferredCurrency: "USD",
      localeHistory: ["az"],
      phone: "+994501234567",
      phoneVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      whatsappNotificationsEnabled: true,
    },
  };

  const prisma = {
    hostingAccount: {
      findMany: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([account])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      update: jest.fn().mockResolvedValue(account),
    },
    invoice: { findUnique: jest.fn(), update: jest.fn() },
  };
  const billing = {
    createHostingInvoice: jest.fn().mockResolvedValue({
      id: "invoice-1",
      invoiceNumber: "INV-1",
    }),
    activateAfterRenewalPayment: jest.fn(),
  };
  const hostingServers = {
    updateAccountStatus: jest.fn().mockResolvedValue(undefined),
    deleteAccount: jest.fn(),
  };
  const renewalPayment = { tryPay: jest.fn().mockResolvedValue(outcome) };
  const notifications = { create: jest.fn().mockResolvedValue(undefined) };
  const outbox = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue("https://vexira.example") };

  const service = new HostingExpiryJobService(
    prisma as never,
    billing as never,
    hostingServers as never,
    renewalPayment as never,
    notifications as never,
    outbox as never,
    config as never,
  );

  return {
    service,
    prisma,
    billing,
    hostingServers,
    renewalPayment,
    notifications,
    outbox,
  };
}

describe("HostingExpiryJobService", () => {
  it("pays a recurring hosting invoice from balance before suspending", async () => {
    const fixture = createFixture("balance");

    await fixture.service.tick();

    expect(fixture.renewalPayment.tryPay).toHaveBeenCalledWith("user-1", "invoice-1");
    expect(fixture.hostingServers.updateAccountStatus).not.toHaveBeenCalled();
    expect(fixture.outbox.enqueue).not.toHaveBeenCalled();
    expect(fixture.notifications.create).not.toHaveBeenCalled();
  });

  it("suspends and sends a direct payment link when balance is insufficient", async () => {
    const fixture = createFixture("unpaid");

    await fixture.service.tick();

    expect(fixture.hostingServers.updateAccountStatus).toHaveBeenCalledWith("hosting-1", {
      status: "SUSPENDED",
    });
    expect(fixture.outbox.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: "hosting-renewal:invoice-1:email" }),
    );
    expect(fixture.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({ href: "/dashboard/invoices/invoice-1" }),
    );
    expect(fixture.outbox.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeKey: "hosting-renewal:invoice-1:whatsapp" }),
    );
  });

  it("charges the saved Epoint card after balance is insufficient", async () => {
    const fixture = createFixture("epoint");

    await fixture.service.tick();

    expect(fixture.renewalPayment.tryPay).toHaveBeenCalledWith("user-1", "invoice-1");
    expect(fixture.hostingServers.updateAccountStatus).not.toHaveBeenCalled();
    expect(fixture.outbox.enqueue).not.toHaveBeenCalled();
  });
});
