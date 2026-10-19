import { Injectable } from "@nestjs/common";
import { InvoiceStatus, Prisma } from "@prisma/client";

import { calculateHostingExpiry } from "../utils/hosting-renewal.util";

import { HostingServersService } from "./hosting-servers.service";

import { PrismaService } from "@/database/database.module";

function generateInvoiceNumber(): string {
  return `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

@Injectable()
export class HostingBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hostingServers: HostingServersService,
  ) {}

  async createHostingInvoice(input: {
    userId: string;
    hostingAccountId: string;
    amount: number;
    currency: string;
    description: string;
    dueDate: Date;
    idempotencyKey?: string;
  }) {
    const amount = new Prisma.Decimal(input.amount.toFixed(2));

    const data = {
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
    };

    if (input.idempotencyKey) {
      return this.prisma.invoice.upsert({
        where: { idempotencyKey: input.idempotencyKey },
        create: {
          ...data,
          idempotencyKey: input.idempotencyKey,
        },
        update: { dueDate: input.dueDate },
        include: { items: true },
      });
    }

    return this.prisma.invoice.create({
      data,
      include: { items: true },
    });
  }

  async activateAfterRenewalPayment(invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { hostingAccount: { include: { plan: true } } },
    });
    if (!invoice?.hostingAccountId || !invoice.hostingAccount) return null;

    const account = invoice.hostingAccount;
    const base =
      account.expiresAt && account.expiresAt > new Date() ? account.expiresAt : new Date();
    const nextExpires = calculateHostingExpiry(base, account.billingCycle);
    if (!nextExpires) return null;

    await this.hostingServers.resumeAccountAfterPayment(account.id);

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
