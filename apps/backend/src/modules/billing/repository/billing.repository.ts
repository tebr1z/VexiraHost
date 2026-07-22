import { Injectable } from "@nestjs/common";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findInvoicesByUserId(userId: string) {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        order: { select: { id: true, status: true } },
      },
    });
  }

  findInvoiceByIdForUser(id: string, userId: string) {
    return this.prisma.invoice.findFirst({
      where: { id, userId },
      include: {
        user: {
          select: { email: true, firstName: true, lastName: true },
        },
        items: { orderBy: { createdAt: "asc" } },
        order: { select: { id: true, status: true } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
  }
}
