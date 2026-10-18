import { DomainBillingService } from "./domain-billing.service";

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
    const service = new DomainBillingService(prisma);

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
});
