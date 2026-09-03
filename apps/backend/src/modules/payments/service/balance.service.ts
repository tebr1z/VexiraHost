import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  BalanceTxnType,
  InvoiceStatus,
  NotificationType,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import { getBalanceCreditCopy, getBalancePaymentCopy } from "../email/balance-email.i18n";
import { PaymentsRepository } from "../repository/payments.repository";

import { BalanceEmailService } from "./balance-email.service";

import { PrismaService } from "@/database/database.module";
import { resolveUserEmailLocale } from "@/modules/auth/email/auth-email.locale";
import { DomainBillingService } from "@/modules/domains/service/domain-billing.service";
import { HostingBillingService } from "@/modules/hosting/service/hosting-billing.service";
import { OrderFulfillmentService } from "@/modules/hosting/service/order-fulfillment.service";
import { NotificationsService } from "@/modules/notifications/service/notifications.service";
import { CbarExchangeService } from "@/shared/pricing/cbar-exchange.service";
import { convertLedgerAmount } from "@/shared/pricing/currency-convert.util";

function generateBalanceReference(): string {
  return `BAL-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly orderFulfillmentService: OrderFulfillmentService,
    private readonly hostingBilling: HostingBillingService,
    private readonly domainBilling: DomainBillingService,
    private readonly notificationsService: NotificationsService,
    private readonly balanceEmailService: BalanceEmailService,
    private readonly cbarExchange: CbarExchangeService,
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
    const referenceNumber = generateBalanceReference();
    const note = input.note?.trim() || null;

    const result = await this.prisma.$transaction(async (tx) => {
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
      const amount = Number(credit);

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
          referenceNumber,
          note,
          adminId: input.adminId,
        },
      });

      return {
        balance: Number(updated.accountBalance),
        currency: updated.balanceCurrency,
        amount,
        referenceNumber,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        localeHistory: user.localeHistory,
        note,
      };
    });

    const locale = resolveUserEmailLocale({ localeHistory: result.localeHistory });
    const copy = getBalanceCreditCopy(locale);
    const amountLabel = `${result.amount.toFixed(2)} ${result.currency}`;

    try {
      await this.notificationsService.create({
        userId: input.userId,
        type: NotificationType.BALANCE_CREDIT,
        title: copy.notificationTitle,
        body: copy.notificationBody(amountLabel, result.referenceNumber),
        reference: result.referenceNumber,
        href: "/dashboard",
        meta: {
          amount: result.amount,
          currency: result.currency,
          balanceAfter: result.balance,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create balance credit notification: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    void this.balanceEmailService.sendBalanceCreditEmail({
      to: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      localeHistory: result.localeHistory,
      amount: result.amount,
      currency: result.currency,
      balanceAfter: result.balance,
      referenceNumber: result.referenceNumber,
      note: result.note,
    });

    return {
      balance: result.balance,
      currency: result.currency,
      amount: result.amount,
      referenceNumber: result.referenceNumber,
    };
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

    const invoiceTotal = Number(invoice.total);
    const alreadyPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const amountDue = Math.max(0, Number((invoiceTotal - alreadyPaid).toFixed(2)));

    if (invoice.status === InvoiceStatus.PAID || amountDue <= 0) {
      if (invoice.status === InvoiceStatus.OPEN && amountDue <= 0) {
        await this.paymentsRepository.completeZeroAmountInvoice({
          userId,
          invoiceId: invoice.id,
          orderId: invoice.orderId,
          currency: invoice.currency,
        });
      }
      if (invoice.orderId) {
        await this.orderFulfillmentService.fulfillOrder(invoice.orderId);
      } else {
        await this.hostingBilling.activateAfterRenewalPayment(invoice.id);
        await this.domainBilling.activateAfterRenewalPayment(invoice.id);
      }
      const remaining = await this.getBalance(userId);
      return {
        mode: "completed" as const,
        id: null,
        status: PaymentStatus.COMPLETED,
        amount: 0,
        currency: invoice.currency,
        gatewayRef: null,
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        paidWithBalance: true,
        invoiceFullyPaid: true,
        amountDue: 0,
        remainingBalance: remaining.balance,
        balanceCurrency: remaining.currency,
        referenceNumber: null,
      };
    }

    if (invoice.status !== InvoiceStatus.OPEN) {
      throw new BadRequestException("Invoice is not payable");
    }

    const referenceNumber = generateBalanceReference();
    const invoiceCurrency = invoice.currency.toUpperCase();
    const rates = await this.cbarExchange.getRates();

    const payment = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException("User not found");

      const balance = Number(user.accountBalance);
      const balanceCurrency = user.balanceCurrency.toUpperCase();
      const balanceInInvoiceCurrency = convertLedgerAmount(
        balance,
        balanceCurrency,
        invoiceCurrency,
        rates,
      );

      if (balanceInInvoiceCurrency <= 0) {
        throw new BadRequestException("Insufficient account balance");
      }

      const maxPayable = Math.min(balanceInInvoiceCurrency, amountDue);
      const paymentAmount =
        requestedAmount == null ? maxPayable : Number(Number(requestedAmount).toFixed(2));

      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        throw new BadRequestException("Amount must be greater than zero");
      }
      if (paymentAmount > maxPayable + 0.001) {
        throw new BadRequestException(
          `Amount cannot exceed ${maxPayable.toFixed(2)} ${invoiceCurrency}`,
        );
      }

      const debitAmount = convertLedgerAmount(
        paymentAmount,
        invoiceCurrency,
        balanceCurrency,
        rates,
      );
      if (debitAmount > balance + 0.02) {
        throw new BadRequestException("Insufficient account balance");
      }

      const debit = new Prisma.Decimal(debitAmount.toFixed(2));
      const next = new Prisma.Decimal(balance.toFixed(2)).minus(debit);
      const paidAfter = Number((alreadyPaid + paymentAmount).toFixed(2));
      const fullyPaid = paidAfter >= invoiceTotal - 0.001;
      const fxNote =
        balanceCurrency !== invoiceCurrency
          ? ` (${debitAmount.toFixed(2)} ${balanceCurrency} → ${paymentAmount.toFixed(2)} ${invoiceCurrency})`
          : "";

      await tx.user.update({
        where: { id: userId },
        data: { accountBalance: next },
      });

      await tx.balanceTransaction.create({
        data: {
          userId,
          amount: debit.negated(),
          balanceAfter: next,
          currency: balanceCurrency,
          type: BalanceTxnType.INVOICE_PAYMENT,
          referenceNumber,
          note: fullyPaid
            ? `Paid invoice ${invoice.invoiceNumber}${fxNote}`
            : `Partial payment for invoice ${invoice.invoiceNumber}${fxNote}`,
          invoiceId: invoice.id,
        },
      });

      const created = await tx.payment.create({
        data: {
          userId,
          invoiceId: invoice.id,
          amount: new Prisma.Decimal(paymentAmount.toFixed(2)),
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

      return {
        created,
        fullyPaid,
        amount: paymentAmount,
        paidAfter,
        localeHistory: user.localeHistory,
        currency: invoiceCurrency,
        balanceCurrency,
      };
    });

    if (payment.fullyPaid) {
      if (invoice.orderId) {
        await this.orderFulfillmentService.fulfillOrder(invoice.orderId);
      } else {
        await this.hostingBilling.activateAfterRenewalPayment(invoice.id);
        await this.domainBilling.activateAfterRenewalPayment(invoice.id);
      }
    }

    const locale = resolveUserEmailLocale({ localeHistory: payment.localeHistory });
    const copy = getBalancePaymentCopy(locale);
    const amountLabel = `${payment.amount.toFixed(2)} ${payment.currency}`;

    try {
      await this.notificationsService.create({
        userId,
        type: NotificationType.BALANCE_PAYMENT,
        title: copy.notificationTitle,
        body: copy.notificationBody(amountLabel, invoice.invoiceNumber),
        reference: referenceNumber,
        href: `/dashboard/invoices/${invoice.id}`,
        meta: {
          amount: payment.amount,
          currency: payment.currency,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to create balance payment notification: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
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
      referenceNumber,
    };
  }
}
