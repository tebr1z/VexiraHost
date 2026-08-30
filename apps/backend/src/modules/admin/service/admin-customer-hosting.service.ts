import { randomBytes } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  HostingManagementMode,
  HostingPanel,
  ManualServiceCategory,
  ServiceStatus,
} from "@prisma/client";

import type {
  AssignManualHostingAccountDto,
  UpdateManualHostingAccountDto,
} from "../dto/manual-hosting.dto";

import { PrismaService } from "@/database/database.module";
import { HostingRepository } from "@/modules/hosting/repository/hosting.repository";
import { HostingBillingService } from "@/modules/hosting/service/hosting-billing.service";
import { HostingEmailService } from "@/modules/hosting/service/hosting-email.service";
import { normalizePanelUrl } from "@/modules/hosting/utils/panel-auto-login.util";
import { isValidIpAddress } from "@/shared/utils/ip-address.util";
import { encryptSecret } from "@/utils/crypto.util";

const MANUAL_PLESK_PLAN_SLUG = "manual-plesk";
const MANUAL_SERVER_PLAN_SLUG = "manual-plesk-server";
const MANUAL_CPANEL_HOSTING_SLUG = "manual-cpanel";
const MANUAL_CPANEL_SERVER_SLUG = "manual-cpanel-server";
const GRACE_DAYS = 7;

function planSlugFor(category: ManualServiceCategory, panel: HostingPanel): string {
  if (panel === HostingPanel.CPANEL) {
    return category === ManualServiceCategory.SERVER
      ? MANUAL_CPANEL_SERVER_SLUG
      : MANUAL_CPANEL_HOSTING_SLUG;
  }
  return category === ManualServiceCategory.SERVER
    ? MANUAL_SERVER_PLAN_SLUG
    : MANUAL_PLESK_PLAN_SLUG;
}

function planNameFor(category: ManualServiceCategory, panel: HostingPanel): string {
  const panelLabel = panel === HostingPanel.CPANEL ? "cPanel" : "Plesk";
  const categoryLabel = category === ManualServiceCategory.SERVER ? "Server" : "Hosting";
  return `Manual ${panelLabel} ${categoryLabel}`;
}

function mapAdminHostingAccount(account: {
  id: string;
  primaryDomain: string;
  username: string;
  panel: HostingPanel;
  status: ServiceStatus;
  managementMode: HostingManagementMode;
  serviceCategory: ManualServiceCategory | null;
  panelIp: string | null;
  panelUrl: string | null;
  panelUsername: string | null;
  expiresAt: Date | null;
  billingAmount: { toString(): string } | null;
  billingCurrency: string;
  graceEndsAt: Date | null;
  renewalInvoiceId: string | null;
  provisionedAt: Date | null;
  createdAt: Date;
  plan: { id: string; name: string; slug: string };
  server: { id: string; name: string; ipAddress: string } | null;
}) {
  return {
    id: account.id,
    primaryDomain: account.primaryDomain,
    username: account.username,
    panel: account.panel,
    status: account.status,
    managementMode: account.managementMode,
    serviceCategory: account.serviceCategory,
    panelIp: account.panelIp,
    panelUrl: account.panelUrl,
    panelUsername: account.panelUsername,
    expiresAt: account.expiresAt,
    billingAmount: account.billingAmount != null ? Number(account.billingAmount) : null,
    billingCurrency: account.billingCurrency,
    graceEndsAt: account.graceEndsAt,
    renewalInvoiceId: account.renewalInvoiceId,
    provisionedAt: account.provisionedAt,
    createdAt: account.createdAt,
    plan: account.plan,
    server: account.server,
  };
}

function sanitizeLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

@Injectable()
export class AdminCustomerHostingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hostingRepository: HostingRepository,
    private readonly hostingBilling: HostingBillingService,
    private readonly hostingEmail: HostingEmailService,
  ) {}

  private async issueRenewalInvoice(input: {
    userId: string;
    accountId: string;
    domain: string;
    panel: string;
    planName: string;
    amount: number;
    currency: string;
    user: {
      email: string;
      firstName?: string | null;
      lastName?: string | null;
      preferredCurrency?: string | null;
      localeHistory?: string[] | null;
    };
  }) {
    const due = new Date();
    due.setDate(due.getDate() + GRACE_DAYS);
    const invoice = await this.hostingBilling.createHostingInvoice({
      userId: input.userId,
      hostingAccountId: input.accountId,
      amount: input.amount,
      currency: input.currency,
      description: `${input.panel} — ${input.domain}`,
      dueDate: due,
    });

    await this.prisma.hostingAccount.update({
      where: { id: input.accountId },
      data: { renewalInvoiceId: invoice.id },
    });

    await this.hostingEmail.sendRenewalInvoiceEmail({
      to: input.user.email,
      firstName: input.user.firstName,
      lastName: input.user.lastName,
      preferredCurrency: input.user.preferredCurrency,
      localeHistory: input.user.localeHistory,
      domain: input.domain,
      planName: input.planName,
      panel: input.panel,
      amount: input.amount,
      currency: input.currency,
      invoiceNumber: invoice.invoiceNumber,
      dueDate: due,
      graceDays: GRACE_DAYS,
    });

    return invoice;
  }

  listUserManualHostingAccounts(userId: string) {
    return this.prisma.hostingAccount
      .findMany({
        where: { userId, managementMode: HostingManagementMode.MANUAL },
        include: {
          plan: { select: { id: true, name: true, slug: true } },
          server: { select: { id: true, name: true, ipAddress: true } },
        },
        orderBy: { createdAt: "desc" },
      })
      .then((rows) => rows.map(mapAdminHostingAccount));
  }

  async assignManualHostingAccount(userId: string, dto: AssignManualHostingAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");

    const panelIp = dto.panelIp.trim();
    if (!isValidIpAddress(panelIp)) {
      throw new BadRequestException("Invalid panel IP address");
    }

    const label = sanitizeLabel(dto.label);
    if (!label) {
      throw new BadRequestException("Service label is required");
    }

    const primaryDomain = label.includes(".") ? label : `${label}.manual`;
    const existingDomain = await this.hostingRepository.findByPrimaryDomainOwnedByOther(
      userId,
      primaryDomain,
    );
    if (existingDomain) {
      throw new ConflictException("This domain is already assigned to another customer");
    }

    const serviceCategory = dto.serviceCategory;
    const panel = dto.panel ?? HostingPanel.PLESK;
    const planSlug = planSlugFor(serviceCategory, panel);

    let plan = dto.planId
      ? await this.prisma.hostingPlan.findFirst({
          where: { id: dto.planId, isActive: true },
        })
      : await this.prisma.hostingPlan.findFirst({
          where: { slug: planSlug, isActive: true },
        });

    if (!plan) {
      plan = await this.prisma.hostingPlan.create({
        data: {
          slug: planSlug,
          name: planNameFor(serviceCategory, panel),
          description: "Admin-assigned external panel access.",
          panel,
          diskGb: 0,
          bandwidthGb: 0,
          maxDomains: 0,
          maxEmails: 0,
          maxDatabases: 0,
          price: 0,
          isActive: true,
          sortOrder: 999,
        },
      });
    }

    let serverId: string | undefined;
    if (dto.serverId) {
      const server = await this.prisma.hostingServer.findFirst({
        where: { id: dto.serverId, isActive: true, panel },
      });
      if (!server) {
        throw new BadRequestException("Hosting server not found or inactive");
      }
      serverId = server.id;
    }

    const panelUrl = normalizePanelUrl(dto.panelUrl, panelIp, panel);
    const panelUsername = dto.panelUsername.trim();
    const internalUsername = `manual-${randomBytes(6).toString("hex")}`;
    const billingCurrency = (dto.billingCurrency ?? "USD").toUpperCase();
    const billingAmount =
      dto.billingAmount != null && Number.isFinite(dto.billingAmount)
        ? dto.billingAmount
        : undefined;

    const account = await this.hostingRepository.createAccount({
      userId,
      planId: plan.id,
      serverId,
      primaryDomain,
      username: internalUsername,
      panel,
      managementMode: HostingManagementMode.MANUAL,
      serviceCategory,
      status: ServiceStatus.ACTIVE,
      panelIp,
      panelUrl,
      panelUsername,
      panelPasswordEnc: encryptSecret(dto.panelPassword),
      provisionedAt: new Date(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      billingAmount,
      billingCurrency,
    });

    let invoiceId: string | null = null;
    if (dto.createInvoiceNow && billingAmount != null && billingAmount > 0) {
      const invoice = await this.issueRenewalInvoice({
        userId,
        accountId: account.id,
        domain: primaryDomain,
        panel,
        planName: plan.name,
        amount: billingAmount,
        currency: billingCurrency,
        user,
      });
      invoiceId = invoice.id;
    }

    try {
      await this.hostingEmail.sendAssignmentEmail({
        to: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        localeHistory: user.localeHistory,
        kind: serviceCategory === ManualServiceCategory.SERVER ? "server" : "hosting",
        label: primaryDomain,
        panel,
        expiresAt: account.expiresAt,
      });
    } catch {
      // Logged in mail service
    }

    const full = await this.prisma.hostingAccount.findUniqueOrThrow({
      where: { id: account.id },
      include: {
        plan: { select: { id: true, name: true, slug: true } },
        server: { select: { id: true, name: true, ipAddress: true } },
      },
    });

    return { ...mapAdminHostingAccount(full), invoiceId };
  }

  async updateManualHostingAccount(
    userId: string,
    accountId: string,
    dto: UpdateManualHostingAccountDto,
  ) {
    const account = await this.prisma.hostingAccount.findFirst({
      where: {
        id: accountId,
        userId,
        managementMode: HostingManagementMode.MANUAL,
      },
    });
    if (!account) {
      throw new NotFoundException("Manual hosting account not found");
    }

    const nextPanel = dto.panel ?? account.panel;
    const nextCategory =
      dto.serviceCategory ?? account.serviceCategory ?? ManualServiceCategory.HOSTING;
    const nextIp = dto.panelIp?.trim() ?? account.panelIp;

    if (dto.panelIp != null && nextIp && !isValidIpAddress(nextIp)) {
      throw new BadRequestException("Invalid panel IP address");
    }

    let panelUrl = account.panelUrl;
    if (dto.panelUrl !== undefined) {
      panelUrl = dto.panelUrl?.trim() || null;
    } else if ((dto.panel || dto.panelIp) && nextIp) {
      panelUrl = normalizePanelUrl(undefined, nextIp, nextPanel);
    }

    const updated = await this.prisma.hostingAccount.update({
      where: { id: account.id },
      data: {
        serviceCategory: nextCategory,
        panel: nextPanel,
        panelIp: nextIp,
        panelUrl,
        panelUsername: dto.panelUsername?.trim() ?? undefined,
        panelPasswordEnc: dto.panelPassword ? encryptSecret(dto.panelPassword) : undefined,
        expiresAt:
          dto.expiresAt === null ? null : dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        billingAmount:
          dto.billingAmount === null
            ? null
            : dto.billingAmount != null
              ? dto.billingAmount
              : undefined,
        billingCurrency: dto.billingCurrency?.toUpperCase(),
      },
      include: {
        plan: { select: { id: true, name: true, slug: true } },
        server: { select: { id: true, name: true, ipAddress: true } },
      },
    });

    let invoiceId: string | null = null;
    const amount =
      dto.billingAmount != null
        ? dto.billingAmount
        : updated.billingAmount != null
          ? Number(updated.billingAmount)
          : 0;
    if (dto.createInvoiceNow && amount > 0) {
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
      const invoice = await this.issueRenewalInvoice({
        userId,
        accountId: updated.id,
        domain: updated.primaryDomain,
        panel: updated.panel,
        planName: updated.plan.name,
        amount,
        currency: updated.billingCurrency || "USD",
        user,
      });
      invoiceId = invoice.id;
      return {
        ...mapAdminHostingAccount({ ...updated, renewalInvoiceId: invoice.id }),
        invoiceId,
      };
    }

    return { ...mapAdminHostingAccount(updated), invoiceId };
  }

  async deleteManualHostingAccount(userId: string, accountId: string) {
    const account = await this.prisma.hostingAccount.findFirst({
      where: {
        id: accountId,
        userId,
        managementMode: HostingManagementMode.MANUAL,
      },
      select: { id: true },
    });
    if (!account) {
      throw new NotFoundException("Manual hosting account not found");
    }

    await this.prisma.hostingAccount.delete({ where: { id: account.id } });
    return { deleted: true };
  }
}
