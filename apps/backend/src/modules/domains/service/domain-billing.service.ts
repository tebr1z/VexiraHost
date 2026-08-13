import { Injectable } from "@nestjs/common";
import { InvoiceStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

function generateInvoiceNumber(): string {
  return `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

@Injectable()
export class DomainBillingService {
  constructor(private readonly prisma: PrismaService) {}

  async createDomainInvoice(input: {
    userId: string;
    domainId: string;
    amount: number;
    currency: string;
    description: string;
    dueDate: Date;
    feeAmount?: number;
    feeDescription?: string;
  }) {
    const base = new Prisma.Decimal(input.amount.toFixed(2));
    const fee =
      input.feeAmount != null && input.feeAmount > 0
        ? new Prisma.Decimal(input.feeAmount.toFixed(2))
        : null;
    const total = fee ? base.add(fee) : base;

    return this.prisma.invoice.create({
      data: {
        userId: input.userId,
        domainId: input.domainId,
        invoiceNumber: generateInvoiceNumber(),
        status: InvoiceStatus.OPEN,
        subtotal: total,
        total,
        currency: input.currency.toUpperCase(),
        dueDate: input.dueDate,
        items: {
          create: [
            {
              description: input.description,
              quantity: 1,
              unitPrice: base,
              totalPrice: base,
            },
            ...(fee
              ? [
                  {
                    description: input.feeDescription ?? "Processing fee (1%)",
                    quantity: 1,
                    unitPrice: fee,
                    totalPrice: fee,
                  },
                ]
              : []),
          ],
        },
      },
      include: { items: true },
    });
  }

  async applyLateFeeOnce(input: {
    invoiceId: string;
    feeAmount: number;
    description: string;
  }): Promise<{ total: number } | null> {
    const fee = new Prisma.Decimal(input.feeAmount.toFixed(2));
    if (fee.lte(0)) return null;

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: input.invoiceId },
      include: { items: true },
    });
    if (!invoice || invoice.status !== InvoiceStatus.OPEN) return null;
    if (invoice.items.some((item) => item.description.toLowerCase().includes("processing fee"))) {
      return { total: Number(invoice.total) };
    }

    const updated = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        subtotal: invoice.subtotal.add(fee),
        total: invoice.total.add(fee),
        items: {
          create: {
            description: input.description,
            quantity: 1,
            unitPrice: fee,
            totalPrice: fee,
          },
        },
      },
    });
    return { total: Number(updated.total) };
  }

  async activateAfterRenewalPayment(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { domain: true },
    });
    if (!invoice?.domainId || !invoice.domain) return null;

    const domain = invoice.domain;
    const base = domain.expiresAt && domain.expiresAt > new Date() ? domain.expiresAt : new Date();
    const nextExpires = new Date(base);
    nextExpires.setDate(nextExpires.getDate() + 365);

    const [, updated] = await this.prisma.$transaction([
      this.prisma.domainExpiryReminder.deleteMany({ where: { domainId: domain.id } }),
      this.prisma.domain.update({
        where: { id: domain.id },
        data: {
          status: "ACTIVE",
          expiresAt: nextExpires,
          graceEndsAt: null,
          renewalInvoiceId: null,
          expiredAt: null,
          lateFeeAppliedAt: null,
        },
      }),
    ]);
    return updated;
  }
}
