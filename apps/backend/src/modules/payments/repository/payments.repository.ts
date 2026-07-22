import { Injectable } from "@nestjs/common";
import {
  InvoiceStatus,
  OrderStatus,
  PaymentStatus,
  type PaymentMethodType,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMethodsByUserId(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  findMethodByIdForUser(id: string, userId: string) {
    return this.prisma.paymentMethod.findFirst({
      where: { id, userId },
    });
  }

  createMethod(data: {
    userId: string;
    type: PaymentMethodType;
    label: string;
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault?: boolean;
  }) {
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.paymentMethod.updateMany({
          where: { userId: data.userId },
          data: { isDefault: false },
        });
      }

      return tx.paymentMethod.create({ data });
    });
  }

  findInvoiceForUser(invoiceId: string, userId: string) {
    return this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: { order: true },
    });
  }

  findInvoiceById(invoiceId: string) {
    return this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { order: true, payments: true },
    });
  }

  findPendingByGatewayRefPrefix(prefix: string) {
    return this.prisma.payment.findFirst({
      where: {
        status: PaymentStatus.PENDING,
        gatewayRef: { startsWith: prefix },
      },
      include: {
        invoice: { include: { order: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findPendingByGatewayRef(gatewayRef: string) {
    return this.prisma.payment.findFirst({
      where: {
        status: PaymentStatus.PENDING,
        gatewayRef,
      },
      include: {
        invoice: { include: { order: true } },
      },
    });
  }

  createPendingPayment(data: {
    userId: string;
    invoiceId: string;
    methodId?: string;
    amount: Prisma.Decimal;
    currency: string;
    gatewayRef: string;
  }) {
    return this.prisma.payment.create({
      data: {
        userId: data.userId,
        invoiceId: data.invoiceId,
        methodId: data.methodId,
        amount: data.amount,
        currency: data.currency,
        status: PaymentStatus.PENDING,
        gatewayRef: data.gatewayRef,
      },
    });
  }

  completePendingPayment(data: {
    paymentId: string;
    invoiceId: string;
    orderId?: string | null;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.update({
        where: { id: data.paymentId },
        data: { status: PaymentStatus.COMPLETED },
        include: { method: true },
      });

      await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
        },
      });

      if (data.orderId) {
        await tx.order.update({
          where: { id: data.orderId },
          data: { status: OrderStatus.COMPLETED },
        });
      }

      return payment;
    });
  }

  failPendingPayment(paymentId: string, failureReason: string) {
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        failureReason,
      },
    });
  }

  completePayment(data: {
    userId: string;
    invoiceId: string;
    orderId?: string | null;
    methodId?: string;
    amount: Prisma.Decimal;
    currency: string;
    gatewayRef: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          userId: data.userId,
          invoiceId: data.invoiceId,
          methodId: data.methodId,
          amount: data.amount,
          currency: data.currency,
          status: PaymentStatus.COMPLETED,
          gatewayRef: data.gatewayRef,
        },
        include: { method: true },
      });

      await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          status: InvoiceStatus.PAID,
          paidAt: new Date(),
        },
      });

      if (data.orderId) {
        await tx.order.update({
          where: { id: data.orderId },
          data: { status: OrderStatus.COMPLETED },
        });
      }

      return payment;
    });
  }

  markInvoicePaidManually(data: {
    userId: string;
    invoiceId: string;
    orderId?: string | null;
    amount: Prisma.Decimal;
    currency: string;
    note: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
      if (!invoice) return null;

      if (invoice.status !== InvoiceStatus.PAID) {
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: {
            status: InvoiceStatus.PAID,
            paidAt: new Date(),
          },
        });

        await tx.payment.create({
          data: {
            userId: data.userId,
            invoiceId: data.invoiceId,
            amount: data.amount,
            currency: data.currency,
            status: PaymentStatus.COMPLETED,
            gatewayRef: data.note,
          },
        });
      }

      if (data.orderId) {
        await tx.order.update({
          where: { id: data.orderId },
          data: { status: OrderStatus.COMPLETED },
        });
      }

      return true;
    });
  }

  recordFailedPayment(data: {
    userId: string;
    invoiceId: string;
    methodId?: string;
    amount: Prisma.Decimal;
    currency: string;
    failureReason: string;
  }) {
    return this.prisma.payment.create({
      data: {
        userId: data.userId,
        invoiceId: data.invoiceId,
        methodId: data.methodId,
        amount: data.amount,
        currency: data.currency,
        status: PaymentStatus.FAILED,
        failureReason: data.failureReason,
      },
    });
  }
}
