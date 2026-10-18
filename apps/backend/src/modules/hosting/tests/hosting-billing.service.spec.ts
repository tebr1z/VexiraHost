import { HostingBillingService } from "../service/hosting-billing.service";
import { HostingServersService } from "../service/hosting-servers.service";

import { PrismaService } from "@/database/database.module";

describe("HostingBillingService", () => {
  it("upserts lifecycle invoices by idempotency key", async () => {
    const invoice = { id: "invoice-1", items: [] };
    const prisma = {
      invoice: {
        upsert: jest.fn().mockResolvedValue(invoice),
        create: jest.fn(),
      },
    } as unknown as PrismaService;
    const service = new HostingBillingService(prisma, {} as HostingServersService);

    await expect(
      service.createHostingInvoice({
        userId: "user-1",
        hostingAccountId: "hosting-1",
        amount: 12,
        currency: "usd",
        description: "Renewal",
        dueDate: new Date("2026-10-20T00:00:00.000Z"),
        idempotencyKey: "hosting-renewal:hosting-1:2026-10-12",
      }),
    ).resolves.toBe(invoice);

    expect(prisma.invoice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { idempotencyKey: "hosting-renewal:hosting-1:2026-10-12" },
      }),
    );
    expect(prisma.invoice.create).not.toHaveBeenCalled();
  });
});
