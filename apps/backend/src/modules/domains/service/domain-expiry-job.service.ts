import { Injectable, Logger } from "@nestjs/common";
import { DomainManagementMode, DomainStatus, InvoiceStatus } from "@prisma/client";

import { DomainBillingService } from "./domain-billing.service";

import { PrismaService } from "@/database/database.module";
import { HostingEmailService } from "@/modules/hosting/service/hosting-email.service";

const GRACE_DAYS = 7;
@Injectable()
export class DomainExpiryJobService {
  private readonly logger = new Logger(DomainExpiryJobService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: DomainBillingService,
    private readonly hostingEmail: HostingEmailService,
  ) {}

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.processExpiredDomains();
      await this.processGraceExpiredDomains();
    } catch (error) {
      this.logger.error(
        `Domain expiry tick failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.running = false;
    }
  }

  private async processExpiredDomains(): Promise<void> {
    const now = new Date();
    const domains = await this.prisma.domain.findMany({
      where: {
        managementMode: DomainManagementMode.MANUAL,
        status: DomainStatus.ACTIVE,
        expiresAt: { lte: now },
        billingAmount: { not: null },
      },
      include: { user: true },
    });

    for (const domain of domains) {
      const amount = domain.billingAmount != null ? Number(domain.billingAmount) : 0;
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const graceEndsAt = new Date(now);
      graceEndsAt.setDate(graceEndsAt.getDate() + GRACE_DAYS);

      let invoiceId = domain.renewalInvoiceId;
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
          continue;
        } else {
          invoiceId = null;
        }
      }

      if (!invoiceId) {
        const invoice = await this.billing.createDomainInvoice({
          userId: domain.userId,
          domainId: domain.id,
          amount,
          currency: domain.billingCurrency || "USD",
          description: `Domain renewal — ${domain.name}`,
          dueDate: graceEndsAt,
        });
        invoiceId = invoice.id;
        invoiceNumber = invoice.invoiceNumber;
      }

      await this.prisma.domain.update({
        where: { id: domain.id },
        data: {
          status: DomainStatus.SUSPENDED,
          graceEndsAt,
          renewalInvoiceId: invoiceId,
        },
      });

      if (invoiceNumber) {
        await this.hostingEmail.sendRenewalInvoiceEmail({
          to: domain.user.email,
          firstName: domain.user.firstName,
          lastName: domain.user.lastName,
          preferredCurrency: domain.user.preferredCurrency,
          localeHistory: domain.user.localeHistory,
          domain: domain.name,
          planName: "Domain",
          panel: "Domain",
          amount,
          currency: domain.billingCurrency || "USD",
          invoiceNumber,
          dueDate: graceEndsAt,
          graceDays: GRACE_DAYS,
        });
      }

      this.logger.log(`Suspended domain ${domain.id} with invoice ${invoiceNumber}`);
    }
  }

  private async processGraceExpiredDomains(): Promise<void> {
    const now = new Date();
    const domains = await this.prisma.domain.findMany({
      where: {
        managementMode: DomainManagementMode.MANUAL,
        status: DomainStatus.SUSPENDED,
        graceEndsAt: { lte: now },
        renewalInvoiceId: { not: null },
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

      await this.hostingEmail.sendAccountDeletedEmail({
        to: domain.user.email,
        firstName: domain.user.firstName,
        lastName: domain.user.lastName,
        preferredCurrency: domain.user.preferredCurrency,
        localeHistory: domain.user.localeHistory,
        domain: domain.name,
        planName: "Domain",
        username: domain.name,
        serverName: undefined,
      });

      await this.prisma.domain.delete({ where: { id: domain.id } });
      this.logger.log(`Deleted unpaid domain ${domain.id} after grace period`);
    }
  }
}
