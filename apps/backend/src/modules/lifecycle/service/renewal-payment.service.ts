import { Injectable, Logger } from "@nestjs/common";
import { InvoiceStatus, PaymentStatus } from "@prisma/client";

import { PrismaService } from "@/database/database.module";
import { BalanceService } from "@/modules/payments/service/balance.service";
import { PaymentsService } from "@/modules/payments/service/payments.service";

export type RenewalPaymentOutcome = "already-paid" | "balance" | "epoint" | "unpaid";

@Injectable()
export class RenewalPaymentService {
  private readonly logger = new Logger(RenewalPaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly balance: BalanceService,
    private readonly payments: PaymentsService,
  ) {}

  async tryPay(userId: string, invoiceId: string): Promise<RenewalPaymentOutcome> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: {
          where: { status: PaymentStatus.COMPLETED },
          select: { amount: true },
        },
      },
    });
    if (
      !invoice ||
      (invoice.status !== InvoiceStatus.OPEN && invoice.status !== InvoiceStatus.PAID)
    ) {
      return "unpaid";
    }
    if (invoice.status === InvoiceStatus.PAID) return "already-paid";

    const paid = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const amountDue = Math.max(0, Number((Number(invoice.total) - paid).toFixed(2)));
    if (amountDue <= 0) return "already-paid";

    try {
      const result = await this.balance.payInvoiceWithBalance(userId, invoiceId, amountDue);
      if (result.invoiceFullyPaid === true) return "balance";
    } catch (error) {
      this.logger.debug(
        `Balance renewal skipped for ${invoiceId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    const retryAfter = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentCardFailure = await this.prisma.payment.findFirst({
      where: {
        invoiceId,
        status: PaymentStatus.FAILED,
        gatewayRef: { startsWith: "epoint:auto:" },
        createdAt: { gte: retryAfter },
      },
      select: { id: true },
    });
    if (recentCardFailure) return "unpaid";

    return (await this.payments.tryEpointAutoRenewal(userId, invoiceId)) ? "epoint" : "unpaid";
  }
}
