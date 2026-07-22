import { Injectable } from "@nestjs/common";
import type { OrderStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

const orderInclude = {
  items: {
    orderBy: { createdAt: "asc" as const },
  },
  invoices: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveProductsByIds(ids: string[]) {
    return this.prisma.product.findMany({
      where: { id: { in: ids }, isActive: true },
      include: { prices: true },
    });
  }

  findByUserId(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        invoices: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.order.findFirst({
      where: { id, userId },
      include: {
        ...orderInclude,
        hostingAccounts: {
          select: {
            id: true,
            primaryDomain: true,
            status: true,
            panelUrl: true,
            provisionedAt: true,
            provisionStage: true,
            provisionError: true,
          },
        },
      },
    });
  }

  createCheckout(data: {
    userId: string;
    subtotal: Prisma.Decimal;
    total: Prisma.Decimal;
    currency: string;
    items: {
      productId: string;
      quantity: number;
      unitPrice: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      productName: string;
      metadata?: Prisma.InputJsonValue;
    }[];
    invoiceNumber: string;
    dueDate: Date;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          userId: data.userId,
          subtotal: data.subtotal,
          total: data.total,
          currency: data.currency,
          items: { create: data.items },
        },
        include: { items: true },
      });

      const invoice = await tx.invoice.create({
        data: {
          userId: data.userId,
          orderId: order.id,
          invoiceNumber: data.invoiceNumber,
          subtotal: data.subtotal,
          total: data.total,
          currency: data.currency,
          dueDate: data.dueDate,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              description: item.productName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
            })),
          },
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: {
          items: { orderBy: { createdAt: "asc" } },
          invoices: { where: { id: invoice.id } },
        },
      });
    });
  }

  updateStatus(id: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }
}
