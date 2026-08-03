import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { BalanceTxnType, InvoiceStatus, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@/database/database.module";
import { DomainBillingService } from "@/modules/domains/service/domain-billing.service";
import { HostingBillingService } from "@/modules/hosting/service/hosting-billing.service";
import { OrderFulfillmentService } from "@/modules/hosting/service/order-fulfillment.service";

@Injectable()
export class BalanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderFulfillmentService: OrderFulfillmentService,
    private readonly hostingBilling: HostingBillingService,
    private readonly domainBilling: DomainBillingService,
  ) {}

  async getBalance(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { accountBalance: true, balanceCurrency: true },
    });
    if (!user) throw new NotFoundException("User not found");
    return {
      balance: Number(user.accountBalance),
      currency: user.balanceCurrency,
    };
  }

  async adminCredit(input: {
    userId: string;
    amount: number;
    currency?: string;
    note?: string;
    adminId: string;
  }) {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new BadRequestException("Amount must be greater than zero");
    }

    const currency = (input.currency ?? "USD").toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new NotFoundException("User not found");

      const currentBalance = Number(user.accountBalance);
      if (currentBalance > 0 && user.balanceCurrency.toUpperCase() !== currency) {
        throw new BadRequestException(
          `User already has balance in ${user.balanceCurrency}. Use the same currency or wait until balance is zero.`,
        );
      }

      const credit = new Prisma.Decimal(input.amount.toFixed(2));
      const next = new Prisma.Decimal(currentBalance.toFixed(2)).plus(credit);

      const updated = await tx.user.update({
        where: { id: input.userId },
        data: {
          accountBalance: next,
          balanceCurrency: currency,
        },
      });

      await tx.balanceTransaction.create({
        data: {
          userId: input.userId,
          amount: credit,
          balanceAfter: next,
          currency,
          type: BalanceTxnType.ADMIN_CREDIT,
          note: input.note?.trim() || null,
          adminId: input.adminId,
        },
      });

      return {
        balance: Number(updated.accountBalance),
        currency: updated.balanceCurrency,
      };
    });
  }

  async payInvoiceWithBalance(userId: string, invoiceId: string, requestedAmount?: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: {
        payments: {
          where: { status: PaymentStatus.COMPLETED },
          select: { amount: true },
        },
      },
    });
    if (!invoice) throw new NotFoundException("Invoice not found");
    if (invoice.status !== InvoiceStatus.OPEN) {
      throw new BadRequestException("Invoice is not payable");
    }

    const invoiceTotal = Number(invoice.total);
    const alreadyPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const amountDue = Math.max(0, Number((invoiceTotal - alreadyPaid).toFixed(2)));
    if (amountDue <= 0) {
      throw new BadRequestException("Invoice is already fully paid");
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException("User not found");

      const balance = Number(user.accountBalance);
      const currency = user.balanceCurrency.toUpperCase();
      if (currency !== invoice.currency.toUpperCase()) {
        throw new BadRequestException(
          `Balance is in ${currency}, but invoice is in ${invoice.currency}`,
        );
      }
      if (balance <= 0) {
        throw new BadRequestException("Insufficient account balance");
      }

      const maxPayable = Math.min(balance, amountDue);
      const amount =
        requestedAmount == null ? maxPayable : Number(Number(requestedAmount).toFixed(2));

      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException("Amount must be greater than zero");
      }
      if (amount > maxPayable + 0.001) {
        throw new BadRequestException(`Amount cannot exceed ${maxPayable.toFixed(2)} ${currency}`);
      }

      const debit = new Prisma.Decimal(amount.toFixed(2));
      const next = new Prisma.Decimal(balance.toFixed(2)).minus(debit);
      const paidAfter = Number((alreadyPaid + amount).toFixed(2));
      const fullyPaid = paidAfter >= invoiceTotal - 0.001;

      await tx.user.update({
        where: { id: userId },
        data: { accountBalance: next },
      });

      await tx.balanceTransaction.create({
        data: {
          userId,
          amount: debit.negated(),
          balanceAfter: next,
          currency,
          type: BalanceTxnType.INVOICE_PAYMENT,
          note: fullyPaid
            ? `Paid invoice ${invoice.invoiceNumber}`
            : `Partial payment for invoice ${invoice.invoiceNumber}`,
          invoiceId: invoice.id,
        },
      });

      const created = await tx.payment.create({
        data: {
          userId,
          invoiceId: invoice.id,
          amount: debit,
          currency: invoice.currency,
          status: PaymentStatus.COMPLETED,
          gatewayRef: `balance-${Date.now()}`,
        },
      });

      if (fullyPaid) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            status: InvoiceStatus.PAID,
            paidAt: new Date(),
          },
        });

        if (invoice.orderId) {
          await tx.order.update({
            where: { id: invoice.orderId },
            data: { status: OrderStatus.COMPLETED },
          });
        }
      }

      return { created, fullyPaid, amount, paidAfter };
    });

    if (payment.fullyPaid) {
      if (invoice.orderId) {
        await this.orderFulfillmentService.fulfillOrder(invoice.orderId);
      } else {
        await this.hostingBilling.activateAfterRenewalPayment(invoice.id);
        await this.domainBilling.activateAfterRenewalPayment(invoice.id);
      }
    }

    const remaining = await this.getBalance(userId);
    const amountDueAfter = Math.max(0, Number((invoiceTotal - payment.paidAfter).toFixed(2)));

    return {
      mode: "completed" as const,
      id: payment.created.id,
      status: payment.created.status,
      amount: payment.amount,
      currency: payment.created.currency,
      gatewayRef: payment.created.gatewayRef,
      invoiceId: payment.created.invoiceId,
      orderId: invoice.orderId,
      paidWithBalance: true,
      invoiceFullyPaid: payment.fullyPaid,
      amountDue: amountDueAfter,
      remainingBalance: remaining.balance,
      balanceCurrency: remaining.currency,
    };
  }
}
