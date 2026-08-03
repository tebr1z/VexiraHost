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
  }) {
    const amount = new Prisma.Decimal(input.amount.toFixed(2));

    return this.prisma.invoice.create({
      data: {
        userId: input.userId,
        domainId: input.domainId,
        invoiceNumber: generateInvoiceNumber(),
        status: InvoiceStatus.OPEN,
        subtotal: amount,
        total: amount,
        currency: input.currency.toUpperCase(),
        dueDate: input.dueDate,
        items: {
          create: [
            {
              description: input.description,
              quantity: 1,
              unitPrice: amount,
              totalPrice: amount,
            },
          ],
        },
      },
      include: { items: true },
    });
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

    return this.prisma.domain.update({
      where: { id: domain.id },
      data: {
        status: "ACTIVE",
        expiresAt: nextExpires,
        graceEndsAt: null,
        renewalInvoiceId: null,
      },
    });
  }
}
