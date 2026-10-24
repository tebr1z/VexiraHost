import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  InvoiceStatus,
  OrderStatus,
  PaymentMethodStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMethodsByUserId(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: { userId, status: { not: PaymentMethodStatus.REVOKED } },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
  }

  findMethodByIdForUser(id: string, userId: string) {
    return this.prisma.paymentMethod.findFirst({
      where: { id, userId },
    });
  }

  findInvoiceForUser(invoiceId: string, userId: string) {
    return this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: {
        order: true,
        payments: {
          where: { status: PaymentStatus.COMPLETED },
          select: { amount: true },
        },
      },
    });
  }

  findInvoiceById(invoiceId: string) {
    return this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { order: true, payments: true },
    });
  }

  findPaymentByIdForUser(id: string, userId: string) {
    return this.prisma.payment.findFirst({
      where: { id, userId },
      include: { invoice: { include: { order: true } } },
    });
  }

  findKapitalPendingForInvoice(invoiceId: string, userId: string) {
    return this.prisma.payment.findFirst({
      where: {
        invoiceId,
        userId,
        status: PaymentStatus.PENDING,
        gatewayRef: { startsWith: "kapital:" },
      },
      orderBy: { createdAt: "desc" },
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
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "invoices" WHERE "id" = ${data.invoiceId} FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
      if (!invoice || invoice.userId !== data.userId || invoice.status !== InvoiceStatus.OPEN)
        throw new ConflictException("INVOICE_NOT_PAYABLE");
      return tx.payment.create({ data: { ...data, status: PaymentStatus.PENDING } });
    });
  }

  completePendingPayment(data: { paymentId: string; invoiceId: string; orderId?: string | null }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "invoices" WHERE "id" = ${data.invoiceId} FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
      if (
        !invoice ||
        invoice.status === InvoiceStatus.VOID ||
        invoice.status === InvoiceStatus.DRAFT
      )
        throw new ConflictException("INVOICE_NOT_PAYABLE");

      // Callback and embedded-window polling may complete together. Only the winner fulfils.
      const claimed = await tx.payment.updateMany({
        where: { id: data.paymentId, invoiceId: data.invoiceId, status: PaymentStatus.PENDING },
        data: { status: PaymentStatus.COMPLETED },
      });
      const payment = await tx.payment.findUniqueOrThrow({
        where: { id: data.paymentId },
        include: { method: true },
      });
      if (!claimed.count) return { ...payment, alreadyProcessed: true };

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

      return { ...payment, alreadyProcessed: false };
    });
  }

  failPendingPayment(paymentId: string, failureReason: string) {
    return this.prisma.payment.updateMany({
      where: { id: paymentId, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.FAILED,
        failureReason,
      },
    });
  }

  completeZeroAmountInvoice(data: {
    userId: string;
    invoiceId: string;
    orderId?: string | null;
    currency: string;
  }) {
    return this.completePayment({
      userId: data.userId,
      invoiceId: data.invoiceId,
      orderId: data.orderId,
      amount: new Prisma.Decimal(0),
      currency: data.currency,
      gatewayRef: `zero-amount-${Date.now()}`,
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
      await tx.$queryRaw`SELECT "id" FROM "invoices" WHERE "id" = ${data.invoiceId} FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } });
      if (!invoice || invoice.userId !== data.userId || invoice.status !== InvoiceStatus.OPEN)
        throw new ConflictException("INVOICE_NOT_PAYABLE");

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
      await tx.$queryRaw`SELECT "id" FROM "invoices" WHERE "id" = ${data.invoiceId} FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({
        where: { id: data.invoiceId },
        include: { payments: true },
      });
      if (!invoice) throw new NotFoundException("Invoice not found");
      if (invoice.status === InvoiceStatus.PAID) return { id: invoice.id, alreadyPaid: true };
      if (invoice.status !== InvoiceStatus.OPEN && invoice.status !== InvoiceStatus.OVERDUE)
        throw new ConflictException("INVOICE_NOT_PAYABLE");
      if (invoice.payments.some((payment) => payment.status === PaymentStatus.PENDING))
        throw new ConflictException("INVOICE_PENDING_PAYMENT");
      const paid = invoice.payments
        .filter((payment) => payment.status === PaymentStatus.COMPLETED)
        .reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
      const remaining = Prisma.Decimal.max(0, invoice.total.minus(paid));
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.PAID, paidAt: new Date() },
      });
      await tx.payment.create({
        data: {
          userId: invoice.userId,
          invoiceId: invoice.id,
          amount: remaining,
          currency: invoice.currency,
          status: PaymentStatus.COMPLETED,
          gatewayRef: data.note,
        },
      });
      if (invoice.orderId)
        await tx.order.update({
          where: { id: invoice.orderId },
          data: { status: OrderStatus.COMPLETED },
        });
      return { id: invoice.id, alreadyPaid: false };
    });
  }

  voidInvoice(invoiceId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "invoices" WHERE "id" = ${invoiceId} FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      });
      if (!invoice) throw new NotFoundException("Invoice not found");
      if (invoice.status === InvoiceStatus.VOID) return { id: invoice.id, status: invoice.status };
      if (invoice.status === InvoiceStatus.PAID)
        throw new ConflictException("INVOICE_ALREADY_PAID");
      if (invoice.payments.some((payment) => payment.status === PaymentStatus.PENDING))
        throw new ConflictException("INVOICE_PENDING_PAYMENT");
      if (
        invoice.payments.some(
          (payment) => payment.status === PaymentStatus.COMPLETED && payment.amount.greaterThan(0),
        )
      )
        throw new ConflictException("INVOICE_HAS_PAYMENTS");
      return tx.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.VOID },
        select: { id: true, status: true },
      });
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
