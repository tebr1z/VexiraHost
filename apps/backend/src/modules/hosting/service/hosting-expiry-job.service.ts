import { Injectable, Logger } from "@nestjs/common";
import { HostingManagementMode, InvoiceStatus, ServiceStatus } from "@prisma/client";

import { HostingBillingService } from "./hosting-billing.service";
import { HostingEmailService } from "./hosting-email.service";

import { PrismaService } from "@/database/database.module";

const GRACE_DAYS = 7;
@Injectable()
export class HostingExpiryJobService {
  private readonly logger = new Logger(HostingExpiryJobService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: HostingBillingService,
    private readonly hostingEmail: HostingEmailService,
  ) {}

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.processExpiredAccounts();
      await this.processGraceExpiredAccounts();
    } catch (error) {
      this.logger.error(
        `Hosting expiry tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async processExpiredAccounts(): Promise<void> {
    const now = new Date();
    const accounts = await this.prisma.hostingAccount.findMany({
      where: {
        managementMode: HostingManagementMode.MANUAL,
        status: ServiceStatus.ACTIVE,
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
          // Already paid — extend instead of suspending
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
        });
        invoiceId = invoice.id;
        invoiceNumber = invoice.invoiceNumber;
      }

      await this.prisma.hostingAccount.update({
        where: { id: account.id },
        data: {
          status: ServiceStatus.SUSPENDED,
          graceEndsAt,
          renewalInvoiceId: invoiceId,
        },
      });

      if (invoiceNumber) {
        await this.hostingEmail.sendRenewalInvoiceEmail({
          to: account.user.email,
          firstName: account.user.firstName,
          lastName: account.user.lastName,
          preferredCurrency: account.user.preferredCurrency,
          localeHistory: account.user.localeHistory,
          domain: account.primaryDomain,
          planName: account.plan.name,
          panel: account.panel,
          amount,
          currency: account.billingCurrency || "USD",
          invoiceNumber,
          dueDate: graceEndsAt,
          graceDays: GRACE_DAYS,
        });
      }

      this.logger.log(
        `Suspended manual account ${account.id} and issued renewal invoice ${invoiceNumber}`,
      );
    }
  }

  private async processGraceExpiredAccounts(): Promise<void> {
    const now = new Date();
    const accounts = await this.prisma.hostingAccount.findMany({
      where: {
        managementMode: HostingManagementMode.MANUAL,
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
          // Payment race: skip delete
          continue;
        }
        if (invoice && invoice.status === InvoiceStatus.OPEN) {
          await this.prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: InvoiceStatus.VOID },
          });
        }
      }

      await this.hostingEmail.sendAccountDeletedEmail({
        to: account.user.email,
        firstName: account.user.firstName,
        lastName: account.user.lastName,
        preferredCurrency: account.user.preferredCurrency,
        localeHistory: account.user.localeHistory,
        domain: account.primaryDomain,
        planName: account.plan.name,
        username: account.panelUsername ?? account.username,
        serverName: account.server?.name,
      });

      await this.prisma.hostingAccount.delete({ where: { id: account.id } });
      this.logger.log(`Deleted unpaid manual account ${account.id} after grace period`);
    }
  }
}
