import { Injectable, Logger } from "@nestjs/common";
import { DomainManagementMode, DomainStatus, InvoiceStatus, Prisma } from "@prisma/client";

import {
  DOMAIN_GRACE_DAYS,
  DOMAIN_LATE_FEE_RATE,
  POST_EXPIRY_KIND,
  POST_EXPIRY_REMINDER_DAYS,
  PRE_EXPIRY_KIND,
  PRE_EXPIRY_REMINDER_DAYS,
  addUtcDays,
  roundMoney,
  utcDayDiff,
  type DomainLifecycleReminderKind,
} from "../constants/domain-lifecycle.constants";

import { DomainBillingService } from "./domain-billing.service";
import { DomainEmailService } from "./domain-email.service";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class DomainExpiryJobService {
  private readonly logger = new Logger(DomainExpiryJobService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: DomainBillingService,
    private readonly domainEmail: DomainEmailService,
  ) {}

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.processPreExpiryReminders();
      await this.processExpiredDomains();
      await this.processPostExpiryReminders();
      await this.processGraceExpiredDomains();
    } catch (error) {
      this.logger.error(
        `Domain expiry tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async processPreExpiryReminders(): Promise<void> {
    const now = new Date();
    const horizon = addUtcDays(now, 30);
    const domains = await this.prisma.domain.findMany({
      where: {
        managementMode: DomainManagementMode.MANUAL,
        status: DomainStatus.ACTIVE,
        expiresAt: { gt: now, lte: horizon },
      },
      include: { user: true, expiryReminders: { select: { kind: true } } },
    });

    for (const domain of domains) {
      if (!domain.expiresAt) continue;
      const days = utcDayDiff(now, domain.expiresAt);
      if (!PRE_EXPIRY_REMINDER_DAYS.includes(days as (typeof PRE_EXPIRY_REMINDER_DAYS)[number])) {
        continue;
      }
      const kind = PRE_EXPIRY_KIND[days as keyof typeof PRE_EXPIRY_KIND];
      if (domain.expiryReminders.some((row) => row.kind === kind)) continue;
      if (!(await this.markReminderSent(domain.id, kind))) continue;

      const amount = domain.billingAmount != null ? Number(domain.billingAmount) : null;
      await this.domainEmail.sendPreExpiryReminder({
        to: domain.user.email,
        firstName: domain.user.firstName,
        lastName: domain.user.lastName,
        localeHistory: domain.user.localeHistory,
        domain: domain.name,
        expiresAt: domain.expiresAt,
        daysRemaining: days,
        amount,
        currency: domain.billingCurrency,
      });
      this.logger.log(`Pre-expiry ${kind} sent for domain ${domain.name}`);
    }
  }

  private async processExpiredDomains(): Promise<void> {
    const now = new Date();
    const domains = await this.prisma.domain.findMany({
      where: {
        managementMode: DomainManagementMode.MANUAL,
        status: DomainStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      include: { user: true },
    });

    for (const domain of domains) {
      const amount = domain.billingAmount != null ? Number(domain.billingAmount) : 0;
      const billable = Number.isFinite(amount) && amount > 0;
      const expiredAt = domain.expiresAt && domain.expiresAt <= now ? domain.expiresAt : now;
      const graceEndsAt = addUtcDays(expiredAt, DOMAIN_GRACE_DAYS);
      const fee = billable ? roundMoney(amount * DOMAIN_LATE_FEE_RATE) : 0;

      let invoiceId = domain.renewalInvoiceId;
      let invoiceNumber: string | null = null;
      let invoiceTotal = billable ? amount + fee : null;
      let lateFeeApplied = Boolean(domain.lateFeeAppliedAt);

      if (invoiceId) {
        const existing = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (existing?.status === InvoiceStatus.OPEN) {
          invoiceNumber = existing.invoiceNumber;
          invoiceTotal = Number(existing.total);
          await this.prisma.invoice.update({
            where: { id: existing.id },
            data: { dueDate: graceEndsAt },
          });
          if (billable && !domain.lateFeeAppliedAt) {
            const applied = await this.billing.applyLateFeeOnce({
              invoiceId: existing.id,
              feeAmount: fee,
              description: `Processing fee 1% — ${domain.name}`,
            });
            if (applied) {
              invoiceTotal = applied.total;
              lateFeeApplied = true;
            }
          }
        } else if (existing?.status === InvoiceStatus.PAID) {
          continue;
        } else {
          invoiceId = null;
        }
      }

      if (!invoiceId && billable) {
        const invoice = await this.billing.createDomainInvoice({
          userId: domain.userId,
          domainId: domain.id,
          amount,
          currency: domain.billingCurrency || "USD",
          description: `Domain renewal — ${domain.name}`,
          dueDate: graceEndsAt,
          feeAmount: fee,
          feeDescription: `Processing fee 1% — ${domain.name}`,
        });
        invoiceId = invoice.id;
        invoiceNumber = invoice.invoiceNumber;
        invoiceTotal = Number(invoice.total);
        lateFeeApplied = fee > 0;
      }

      await this.prisma.domain.update({
        where: { id: domain.id },
        data: {
          status: DomainStatus.SUSPENDED,
          graceEndsAt,
          renewalInvoiceId: invoiceId,
          expiredAt,
          lateFeeAppliedAt: lateFeeApplied ? now : null,
        },
      });

      if (await this.markReminderSent(domain.id, "EXPIRED")) {
        await this.domainEmail.sendPostExpiryReminder({
          to: domain.user.email,
          firstName: domain.user.firstName,
          lastName: domain.user.lastName,
          localeHistory: domain.user.localeHistory,
          domain: domain.name,
          expiredAt,
          graceEndsAt,
          daysSinceExpiry: 0,
          daysLeft: DOMAIN_GRACE_DAYS,
          amount: invoiceTotal,
          fee,
          currency: domain.billingCurrency || "USD",
          invoiceNumber,
        });
      }

      this.logger.log(`Suspended domain ${domain.id} with invoice ${invoiceNumber}`);
    }
  }

  private async processPostExpiryReminders(): Promise<void> {
    const now = new Date();
    const domains = await this.prisma.domain.findMany({
      where: {
        managementMode: DomainManagementMode.MANUAL,
        status: DomainStatus.SUSPENDED,
        expiredAt: { not: null },
        graceEndsAt: { gt: now },
      },
      include: { user: true, expiryReminders: { select: { kind: true } } },
    });

    for (const domain of domains) {
      if (!domain.expiredAt || !domain.graceEndsAt) continue;
      const daysSince = utcDayDiff(domain.expiredAt, now);
      if (
        !POST_EXPIRY_REMINDER_DAYS.includes(daysSince as (typeof POST_EXPIRY_REMINDER_DAYS)[number])
      ) {
        continue;
      }
      if (daysSince === 0) continue;
      const kind = POST_EXPIRY_KIND[daysSince as keyof typeof POST_EXPIRY_KIND];
      if (domain.expiryReminders.some((row) => row.kind === kind)) continue;
      if (!(await this.markReminderSent(domain.id, kind))) continue;

      const daysLeft = Math.max(0, utcDayDiff(now, domain.graceEndsAt));
      let invoiceNumber: string | null = null;
      let amount: number | null = null;
      if (domain.renewalInvoiceId) {
        const invoice = await this.prisma.invoice.findUnique({
          where: { id: domain.renewalInvoiceId },
        });
        invoiceNumber = invoice?.invoiceNumber ?? null;
        amount = invoice ? Number(invoice.total) : null;
      }
      const base = domain.billingAmount != null ? Number(domain.billingAmount) : 0;
      const fee = roundMoney(base * DOMAIN_LATE_FEE_RATE);

      await this.domainEmail.sendPostExpiryReminder({
        to: domain.user.email,
        firstName: domain.user.firstName,
        lastName: domain.user.lastName,
        localeHistory: domain.user.localeHistory,
        domain: domain.name,
        expiredAt: domain.expiredAt,
        graceEndsAt: domain.graceEndsAt,
        daysSinceExpiry: daysSince,
        daysLeft,
        amount,
        fee,
        currency: domain.billingCurrency || "USD",
        invoiceNumber,
      });
      this.logger.log(`Post-expiry ${kind} sent for domain ${domain.name}`);
    }
  }

  private async processGraceExpiredDomains(): Promise<void> {
    const now = new Date();
    const domains = await this.prisma.domain.findMany({
      where: {
        managementMode: DomainManagementMode.MANUAL,
        status: DomainStatus.SUSPENDED,
        graceEndsAt: { lte: now },
      },
      include: { user: true },
    });

    for (const domain of domains) {
      if (domain.renewalInvoiceId) {
        const invoice = await this.prisma.invoice.findUnique({
          where: { id: domain.renewalInvoiceId },
        });
        if (invoice?.status === InvoiceStatus.PAID) continue;
        if (invoice?.status === InvoiceStatus.OPEN) {
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: InvoiceStatus.VOID },
          });
        }
      }

      if (await this.markReminderSent(domain.id, "DELETED")) {
        await this.domainEmail.sendDomainDeletedEmail({
          to: domain.user.email,
          firstName: domain.user.firstName,
          lastName: domain.user.lastName,
          localeHistory: domain.user.localeHistory,
          domain: domain.name,
        });
      }

      await this.prisma.domain.delete({ where: { id: domain.id } });
      this.logger.log(`Deleted unpaid domain ${domain.id} after ${DOMAIN_GRACE_DAYS}-day grace`);
    }
  }

  private async markReminderSent(
    domainId: string,
    kind: DomainLifecycleReminderKind,
  ): Promise<boolean> {
    try {
      await this.prisma.domainExpiryReminder.create({ data: { domainId, kind } });
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return false;
      }
      throw error;
    }
  }
}
