import { Injectable } from "@nestjs/common";
import { InvoiceStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

function generateInvoiceNumber(): string {
  return `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

@Injectable()
export class HostingBillingService {
  constructor(private readonly prisma: PrismaService) {}

  async createHostingInvoice(input: {
    userId: string;
    hostingAccountId: string;
    amount: number;
    currency: string;
    description: string;
    dueDate: Date;
  }) {
    const amount = new Prisma.Decimal(input.amount.toFixed(2));

    return this.prisma.invoice.create({
      data: {
        userId: input.userId,
        hostingAccountId: input.hostingAccountId,
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
      include: { hostingAccount: true },
    });
    if (!invoice?.hostingAccountId || !invoice.hostingAccount) return null;

    const account = invoice.hostingAccount;
    const base =
      account.expiresAt && account.expiresAt > new Date() ? account.expiresAt : new Date();
    const nextExpires = new Date(base);
    nextExpires.setDate(nextExpires.getDate() + 30);

    return this.prisma.hostingAccount.update({
      where: { id: account.id },
      data: {
        status: "ACTIVE",
        expiresAt: nextExpires,
        graceEndsAt: null,
        renewalInvoiceId: null,
      },
    });
  }
}
