import { DomainBillingService } from "./domain-billing.service";
import { RegistrarService } from "./registrar.service";

import { PrismaService } from "@/database/database.module";

describe("DomainBillingService", () => {
  it("upserts lifecycle invoices by idempotency key", async () => {
    const invoice = { id: "invoice-1", items: [] };
    const prisma = {
      invoice: {
        upsert: jest.fn().mockResolvedValue(invoice),
        create: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new DomainBillingService(prisma, {} as RegistrarService);

    await expect(
      service.createDomainInvoice({
        userId: "user-1",
        domainId: "domain-1",
        amount: 18,
        currency: "usd",
        description: "Domain renewal",
        dueDate: new Date("2026-10-20T00:00:00.000Z"),
        idempotencyKey: "domain-renewal:domain-1:2026-10-12",
      }),
    ).resolves.toBe(invoice);

    expect(prisma.invoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idempotencyKey: "domain-renewal:domain-1:2026-10-12" },
      }),
    );
    expect(prisma.invoice.create).not.toHaveBeenCalled();
  });

  it("renews registrar-managed domains before extending the local expiry", async () => {
    const domain = {
      id: "domain-1",
      name: "example.com",
      managementMode: "REGISTRAR",
      renewalInvoiceId: "invoice-1",
      expiresAt: new Date("2026-11-18T00:00:00.000Z"),
    };
    const prisma = {
      invoice: {
        findUnique: jest.fn().mockResolvedValue({
          id: "invoice-1",
          domainId: domain.id,
          domain,
        }),
      },
      domainExpiryReminder: { deleteMany: jest.fn() },
      domain: { update: jest.fn().mockResolvedValue({ ...domain, status: "ACTIVE" }) },
      $transaction: jest.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
    } as unknown as PrismaService;
    const registrar = { renew: jest.fn().mockResolvedValue({ expiresAt: new Date() }) };
    const service = new DomainBillingService(prisma, registrar as unknown as RegistrarService);

    await service.activateAfterRenewalPayment("invoice-1");

    expect(registrar.renew).toHaveBeenCalledWith("example.com", 1);
    expect(prisma.domain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "domain-1" },
        data: expect.objectContaining({
          expiresAt: new Date("2027-11-18T00:00:00.000Z"),
          renewalInvoiceId: null,
        }),
      }),
    );
  });
});
