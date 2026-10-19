import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  BillingCycle,
  HostingManagementMode,
  InvoiceStatus,
  NotificationOutboxChannel,
  NotificationType,
  ServiceStatus,
} from "@prisma/client";

import { calculateHostingExpiry } from "../utils/hosting-renewal.util";

import { HostingBillingService } from "./hosting-billing.service";
import { HostingServersService } from "./hosting-servers.service";

import { PrismaService } from "@/database/database.module";
import { RenewalPaymentService } from "@/modules/lifecycle/service/renewal-payment.service";
import { NotificationTemplate } from "@/modules/notifications/notification-outbox.constants";
import { NotificationOutboxService } from "@/modules/notifications/service/notification-outbox.service";
import { NotificationsService } from "@/modules/notifications/service/notifications.service";

const GRACE_DAYS = 7;

function renewalPaymentCopy(
  locale: string | undefined,
  input: { domain: string; amount: number; currency: string; paymentUrl: string },
): { title: string; body: string; message: string } {
  const amount = `${input.amount.toFixed(2)} ${input.currency}`;
  if (locale === "az") {
    return {
      title: "Hosting yenilənməsi üçün ödəniş lazımdır",
      body: `${input.domain} üçün ${amount} balansda yoxdur. Fakturanı linkdən ödəyin.`,
      message: `Vexira Host: ${input.domain} hosting yenilənməsi üçün balans kifayət deyil (${amount}). Ödəniş: ${input.paymentUrl}`,
    };
  }
  if (locale === "ru") {
    return {
      title: "Требуется оплата продления хостинга",
      body: `На балансе недостаточно ${amount} для ${input.domain}. Оплатите счёт по ссылке.`,
      message: `Vexira Host: недостаточно средств для продления ${input.domain} (${amount}). Оплатить: ${input.paymentUrl}`,
    };
  }
  if (locale === "en") {
    return {
      title: "Hosting renewal payment required",
      body: `Your balance is insufficient for the ${amount} renewal of ${input.domain}. Pay the invoice from the link.`,
      message: `Vexira Host: insufficient balance to renew ${input.domain} (${amount}). Pay now: ${input.paymentUrl}`,
    };
  }
  return {
    title: "Hosting yenileme ödemesi gerekli",
    body: `${input.domain} için ${amount} tutarında yeterli bakiye yok. Faturayı bağlantıdan ödeyin.`,
    message: `Vexira Host: ${input.domain} yenilemesi için bakiye yetersiz (${amount}). Ödeme: ${input.paymentUrl}`,
  };
}

@Injectable()
export class HostingExpiryJobService {
  private readonly logger = new Logger(HostingExpiryJobService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: HostingBillingService,
    private readonly hostingServers: HostingServersService,
    private readonly renewalPayment: RenewalPaymentService,
    private readonly notifications: NotificationsService,
    private readonly outbox: NotificationOutboxService,
    private readonly config: ConfigService,
  ) {}

  private paymentUrl(invoiceId: string): string {
    const appUrl = this.config.get<string>("APP_URL", "http://localhost:3000").replace(/\/$/, "");
    return `${appUrl}/dashboard/invoices/${invoiceId}`;
  }

  private async notifyPaymentRequired(input: {
    user: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      preferredCurrency: string | null;
      localeHistory: string[];
      phone: string | null;
      phoneVerifiedAt: Date | null;
      whatsappNotificationsEnabled: boolean;
    };
    domain: string;
    planName: string;
    panel: string;
    amount: number;
    currency: string;
    invoiceId: string;
    invoiceNumber: string;
    dueDate: Date;
  }): Promise<void> {
    const paymentUrl = this.paymentUrl(input.invoiceId);
    const copy = renewalPaymentCopy(input.user.localeHistory[0], {
      domain: input.domain,
      amount: input.amount,
      currency: input.currency,
      paymentUrl,
    });

    try {
      await this.outbox.enqueue({
        userId: input.user.id,
        channel: NotificationOutboxChannel.EMAIL,
        recipient: input.user.email,
        template: NotificationTemplate.HOSTING_RENEWAL,
        dedupeKey: `hosting-renewal:${input.invoiceId}:email`,
        payload: {
          firstName: input.user.firstName,
          lastName: input.user.lastName,
          preferredCurrency: input.user.preferredCurrency,
          localeHistory: input.user.localeHistory,
          domain: input.domain,
          planName: input.planName,
          panel: input.panel,
          amount: input.amount,
          currency: input.currency,
          invoiceNumber: input.invoiceNumber,
          invoiceId: input.invoiceId,
          dueDate: input.dueDate.toISOString(),
          graceDays: GRACE_DAYS,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Renewal email ${input.invoiceId} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    try {
      await this.notifications.create({
        userId: input.user.id,
        type: NotificationType.INVOICE,
        title: copy.title,
        body: copy.body,
        reference: input.invoiceNumber,
        href: `/dashboard/invoices/${input.invoiceId}`,
        meta: {
          invoiceId: input.invoiceId,
          amount: input.amount,
          currency: input.currency,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Renewal notification ${input.invoiceId} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (input.user.phone && input.user.phoneVerifiedAt && input.user.whatsappNotificationsEnabled) {
      try {
        await this.outbox.enqueue({
          channel: NotificationOutboxChannel.WHATSAPP,
          recipient: input.user.phone,
          userId: input.user.id,
          template: NotificationTemplate.TEXT,
          dedupeKey: `hosting-renewal:${input.invoiceId}:whatsapp`,
          payload: { userId: input.user.id, message: copy.message },
        });
      } catch (error) {
        this.logger.warn(
          `Renewal phone message ${input.invoiceId} failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.processScheduledPurges();
      await this.backfillRecurringBillingMetadata();
      await this.processCancelledAtPeriodEnd();
      await this.processExpiredAccounts();
      await this.processSuspendedRenewals();
      await this.processGraceExpiredAccounts();
    } catch (error) {
      this.logger.error(
        `Hosting expiry tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }

  /** Make hosting bought before recurring billing was introduced renewable too. */
  private async backfillRecurringBillingMetadata(): Promise<void> {
    const accounts = await this.prisma.hostingAccount.findMany({
      where: {
        managementMode: HostingManagementMode.AUTOMATED,
        status: ServiceStatus.ACTIVE,
        expiresAt: null,
      },
      include: { plan: true },
    });

    for (const account of accounts) {
      const expiresAt = calculateHostingExpiry(
        account.provisionedAt ?? account.createdAt,
        account.billingCycle,
      );
      await this.prisma.hostingAccount.update({
        where: { id: account.id },
        data: expiresAt
          ? {
              expiresAt,
              billingAmount: account.billingAmount ?? account.plan.price,
              billingCurrency: account.plan.currency.toUpperCase(),
            }
          : { autoRenew: false },
      });
    }
  }

  /** Admin-approved cancellations: wipe Docker, panel account, and DB row after 24h. */
  private async processScheduledPurges(): Promise<void> {
    let due: Array<{ id: string; primaryDomain: string }> = [];
    try {
      due = await this.prisma.hostingAccount.findMany({
        where: { scheduledPurgeAt: { lte: new Date() } },
        select: { id: true, primaryDomain: true },
      });
    } catch (error) {
      this.logger.error(
        `Scheduled hosting purge query failed (run prisma migrate?): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }

    for (const account of due) {
      try {
        await this.hostingServers.deleteAccount(account.id);
        this.logger.log(
          `Purged hosting ${account.id} (${account.primaryDomain}) after approved cancellation`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to purge hosting ${account.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  /** Paid period ended and customer disabled auto-renew → mark CANCELLED (no invoice). */
  private async processCancelledAtPeriodEnd(): Promise<void> {
    const now = new Date();
    const accounts = await this.prisma.hostingAccount.findMany({
      where: {
        autoRenew: false,
        status: ServiceStatus.ACTIVE,
        scheduledPurgeAt: null,
        cancelRequestedAt: null,
        expiresAt: { lte: now },
      },
    });

    for (const account of accounts) {
      await this.hostingServers.updateAccountStatus(account.id, { status: "SUSPENDED" });
      await this.prisma.hostingAccount.update({
        where: { id: account.id },
        data: { status: ServiceStatus.CANCELLED, graceEndsAt: null, renewalInvoiceId: null },
      });
      this.logger.log(`Marked account ${account.id} CANCELLED after period end (autoRenew=false)`);
    }
  }

  private async processExpiredAccounts(): Promise<void> {
    const now = new Date();
    const accounts = await this.prisma.hostingAccount.findMany({
      where: {
        status: ServiceStatus.ACTIVE,
        autoRenew: true,
        expiresAt: { lte: now },
        billingAmount: { not: null },
      },
      include: {
        user: true,
        plan: true,
      },
    });

    for (const account of accounts) {
      const amount = account.billingAmount != null ? Number(account.billingAmount) : 0;
      if (!Number.isFinite(amount) || amount <= 0) continue;
      if (account.billingCycle === BillingCycle.ONE_TIME) continue;

      const graceEndsAt = new Date(now);
      graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_DAYS);

      let invoiceId = account.renewalInvoiceId;
      let invoiceNumber: string | null = null;

      if (invoiceId) {
        const existing = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (existing?.status === InvoiceStatus.OPEN) {
          invoiceNumber = existing.invoiceNumber;
          await this.prisma.invoice.update({
            where: { id: existing.id },
            data: { dueDate: graceEndsAt },
          });
        } else if (existing?.status === InvoiceStatus.PAID) {
          await this.billing.activateAfterRenewalPayment(existing.id);
          continue;
        } else {
          invoiceId = null;
        }
      }

      if (!invoiceId) {
        const invoice = await this.billing.createHostingInvoice({
          userId: account.userId,
          hostingAccountId: account.id,
          amount,
          currency: account.billingCurrency || "USD",
          description: `Renewal — ${account.primaryDomain} (${account.panel})`,
          dueDate: graceEndsAt,
          idempotencyKey: `hosting-renewal:${account.id}:${account.expiresAt?.toISOString() ?? "unknown"}`,
        });
        invoiceId = invoice.id;
        invoiceNumber = invoice.invoiceNumber;
      }

      await this.prisma.hostingAccount.update({
        where: { id: account.id },
        data: { graceEndsAt, renewalInvoiceId: invoiceId },
      });

      const paymentOutcome = await this.renewalPayment.tryPay(account.userId, invoiceId);
      if (paymentOutcome !== "unpaid") {
        this.logger.log(
          `Renewed hosting ${account.id} automatically via ${paymentOutcome} (${invoiceNumber})`,
        );
        continue;
      }

      await this.hostingServers.updateAccountStatus(account.id, { status: "SUSPENDED" });

      if (invoiceNumber && invoiceId) {
        await this.notifyPaymentRequired({
          user: account.user,
          domain: account.primaryDomain,
          planName: account.plan.name,
          panel: account.panel,
          amount,
          currency: account.billingCurrency || "USD",
          invoiceId,
          invoiceNumber,
          dueDate: graceEndsAt,
        });
      }

      this.logger.log(
        `Suspended hosting account ${account.id} and issued renewal invoice ${invoiceNumber}`,
      );
    }
  }

  /** Retry automatic debit while the invoice is still inside its grace period. */
  private async processSuspendedRenewals(): Promise<void> {
    const now = new Date();
    const accounts = await this.prisma.hostingAccount.findMany({
      where: {
        status: ServiceStatus.SUSPENDED,
        autoRenew: true,
        graceEndsAt: { gt: now },
        renewalInvoiceId: { not: null },
      },
      select: { id: true, userId: true, renewalInvoiceId: true },
    });

    for (const account of accounts) {
      if (!account.renewalInvoiceId) continue;
      const paymentOutcome = await this.renewalPayment.tryPay(
        account.userId,
        account.renewalInvoiceId,
      );
      if (paymentOutcome !== "unpaid") {
        this.logger.log(`Reactivated hosting ${account.id} via ${paymentOutcome}`);
      }
    }
  }

  private async processGraceExpiredAccounts(): Promise<void> {
    const now = new Date();
    const accounts = await this.prisma.hostingAccount.findMany({
      where: {
        status: ServiceStatus.SUSPENDED,
        graceEndsAt: { lte: now },
        renewalInvoiceId: { not: null },
      },
      include: {
        user: true,
        plan: true,
        server: true,
      },
    });

    for (const account of accounts) {
      if (account.renewalInvoiceId) {
        const invoice = await this.prisma.invoice.findUnique({
          where: { id: account.renewalInvoiceId },
        });
        if (invoice?.status === InvoiceStatus.PAID) {
          await this.billing.activateAfterRenewalPayment(invoice.id);
          continue;
        }
        if (invoice && invoice.status === InvoiceStatus.OPEN) {
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: InvoiceStatus.VOID },
          });
        }
      }

      await this.hostingServers.deleteAccount(account.id);
      this.logger.log(`Deleted unpaid hosting account ${account.id} after grace period`);
    }
  }
}
