import {
  ConflictException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DomainChangeStatus, DomainManagementMode, DomainStatus, Prisma } from "@prisma/client";

import type {
  AssignManualDomainDto,
  UpdateDomainChangeStatusDto,
  UpdateManualDomainDto,
} from "../dto/manual-domain.dto";

import { PrismaService } from "@/database/database.module";
import { DOMAIN_GRACE_DAYS } from "@/modules/domains/constants/domain-lifecycle.constants";
import { DomainsRepository } from "@/modules/domains/repository/domains.repository";
import { DomainBillingService } from "@/modules/domains/service/domain-billing.service";
import { normalizeNsGlueEntries, parseNsGlueRecords } from "@/modules/domains/utils/ns-glue.util";
import { HostingEmailService } from "@/modules/hosting/service/hosting-email.service";
import { isValidIpAddress } from "@/shared/utils/ip-address.util";

function extractTld(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  return parts[parts.length - 1] ?? "com";
}

function mapAdminDomain(domain: {
  id: string;
  name: string;
  tld: string;
  status: DomainStatus;
  managementMode: DomainManagementMode;
  registrarSource: string | null;
  adminNotes: string | null;
  registeredAt: Date | null;
  expiresAt: Date | null;
  billingAmount: { toString(): string } | null;
  billingCurrency: string;
  graceEndsAt: Date | null;
  renewalInvoiceId: string | null;
  nameservers: string[];
  nsGlueRecords: unknown;
  createdAt: Date;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  changeRequests: { id: string }[];
  _count: { dnsRecords: number };
}) {
  return {
    id: domain.id,
    name: domain.name,
    tld: domain.tld,
    status: domain.status,
    managementMode: domain.managementMode,
    registrarSource: domain.registrarSource,
    adminNotes: domain.adminNotes,
    registeredAt: domain.registeredAt,
    expiresAt: domain.expiresAt,
    billingAmount: domain.billingAmount != null ? Number(domain.billingAmount) : null,
    billingCurrency: domain.billingCurrency,
    graceEndsAt: domain.graceEndsAt,
    renewalInvoiceId: domain.renewalInvoiceId,
    nameservers: domain.nameservers,
    nsGlueRecords: parseNsGlueRecords(domain.nsGlueRecords),
    dnsRecordCount: domain._count.dnsRecords,
    pendingChangeCount: domain.changeRequests.length,
    createdAt: domain.createdAt,
    user: {
      id: domain.user.id,
      email: domain.user.email,
      firstName: domain.user.firstName,
      lastName: domain.user.lastName,
    },
  };
}

function mapChangeRequest(row: {
  id: string;
  type: string;
  status: DomainChangeStatus;
  previousData: unknown;
  requestedData: unknown;
  adminNotifiedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  domain: {
    id: string;
    name: string;
    managementMode: DomainManagementMode;
    registrarSource: string | null;
  };
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
}) {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    previousData: row.previousData,
    requestedData: row.requestedData,
    adminNotifiedAt: row.adminNotifiedAt,
    reviewedAt: row.reviewedAt,
    createdAt: row.createdAt,
    domain: row.domain,
    user: row.user,
  };
}

@Injectable()
export class AdminCustomerDomainsService {
  constructor(
    private readonly domainsRepository: DomainsRepository,
    private readonly prisma: PrismaService,
    private readonly domainBilling: DomainBillingService,
    private readonly hostingEmail: HostingEmailService,
  ) {}

  listManualDomains() {
    return this.domainsRepository
      .findAll({ managementMode: DomainManagementMode.MANUAL })
      .then((rows) => rows.map(mapAdminDomain));
  }

  listUserManualDomains(userId: string) {
    return this.domainsRepository
      .findAll({ managementMode: DomainManagementMode.MANUAL, userId })
      .then((rows) => rows.map(mapAdminDomain));
  }

  private async issueRenewalInvoice(input: {
    userId: string;
    domainId: string;
    name: string;
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
    due.setDate(due.getDate() + DOMAIN_GRACE_DAYS);
    const invoice = await this.domainBilling.createDomainInvoice({
      userId: input.userId,
      domainId: input.domainId,
      amount: input.amount,
      currency: input.currency,
      description: `Domain — ${input.name}`,
      dueDate: due,
    });

    await this.prisma.domain.update({
      where: { id: input.domainId },
      data: { renewalInvoiceId: invoice.id },
    });

    await this.hostingEmail.sendRenewalInvoiceEmail({
      to: input.user.email,
      firstName: input.user.firstName,
      lastName: input.user.lastName,
      preferredCurrency: input.user.preferredCurrency,
      localeHistory: input.user.localeHistory,
      domain: input.name,
      planName: "Domain",
      panel: "Domain",
      amount: input.amount,
      currency: input.currency,
      invoiceNumber: invoice.invoiceNumber,
      dueDate: due,
      graceDays: DOMAIN_GRACE_DAYS,
    });

    return invoice;
  }

  async assignManualDomain(dto: AssignManualDomainDto, userIdOverride?: string) {
    const userId = userIdOverride ?? dto.userId;
    if (!userId) {
      throw new NotFoundException("User id is required");
    }

    const normalized = dto.name.trim().toLowerCase();
    const existing = await this.domainsRepository.findByName(normalized);
    if (existing) {
      throw new ConflictException("Domain is already assigned or registered");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }

    const glueEntries = dto.nsGlueEntries?.length ? normalizeNsGlueEntries(dto.nsGlueEntries) : [];

    const legacyNameservers =
      dto.nameservers?.map((ns) => ns.trim().toLowerCase()).filter(Boolean) ?? [];

    const defaultGlue = [
      { host: "ns1.vexirahost.com", ip: "" },
      { host: "ns2.vexirahost.com", ip: "" },
    ];

    const nsGlueRecords =
      glueEntries.length >= 2
        ? glueEntries
        : legacyNameservers.length >= 2
          ? legacyNameservers.map((host) => ({ host, ip: "" }))
          : defaultGlue;

    for (const entry of nsGlueRecords) {
      if (!isValidIpAddress(entry.ip)) {
        throw new BadRequestException("IP address must be a valid IPv4 or IPv6 format");
      }
    }

    const nameservers =
      legacyNameservers.length >= 2 ? legacyNameservers : nsGlueRecords.map((entry) => entry.host);

    const billingCurrency = (dto.billingCurrency ?? "USD").toUpperCase();
    const billingAmount =
      dto.billingAmount != null && Number.isFinite(dto.billingAmount)
        ? dto.billingAmount
        : undefined;

    const domain = await this.domainsRepository.createDomain({
      userId,
      name: normalized,
      tld: extractTld(normalized),
      status: DomainStatus.ACTIVE,
      managementMode: DomainManagementMode.MANUAL,
      registrarSource: dto.registrarSource?.trim() || undefined,
      registeredAt: new Date(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      nameservers,
      nsGlueRecords,
      billingAmount,
      billingCurrency,
    });

    if (dto.dnsRecords?.length) {
      await this.domainsRepository.replaceDnsRecords(
        domain.id,
        dto.dnsRecords.map((record) => ({
          type: record.type,
          name: record.name,
          value: record.value,
          ttl: record.ttl,
          priority: record.priority,
        })),
      );
    }

    let invoiceId: string | null = null;
    if (dto.createInvoiceNow && billingAmount != null && billingAmount > 0) {
      const invoice = await this.issueRenewalInvoice({
        userId,
        domainId: domain.id,
        name: normalized,
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
        kind: "domain",
        label: normalized,
        expiresAt: domain.expiresAt,
      });
    } catch {
      // Assignment email errors are logged inside the mail service.
    }

    const full = await this.domainsRepository.findAll({
      managementMode: DomainManagementMode.MANUAL,
      userId,
    });
    const created = full.find((d) => d.id === domain.id);
    if (!created) {
      throw new NotFoundException("Domain could not be loaded after creation");
    }
    return { ...mapAdminDomain(created), invoiceId };
  }

  async updateManualDomain(userId: string, domainId: string, dto: UpdateManualDomainDto) {
    const domain = await this.prisma.domain.findFirst({
      where: {
        id: domainId,
        userId,
        managementMode: DomainManagementMode.MANUAL,
      },
      include: {
        user: true,
        changeRequests: { where: { status: "PENDING" }, select: { id: true } },
        _count: { select: { dnsRecords: true } },
      },
    });
    if (!domain) throw new NotFoundException("Manual domain not found");

    const nameservers = dto.nameservers?.map((ns) => ns.trim().toLowerCase()).filter(Boolean);
    const glueEntries = dto.nsGlueEntries?.length
      ? normalizeNsGlueEntries(dto.nsGlueEntries)
      : undefined;

    if (glueEntries) {
      for (const entry of glueEntries) {
        if (!isValidIpAddress(entry.ip)) {
          throw new BadRequestException("IP address must be a valid IPv4 or IPv6 format");
        }
      }
      if (glueEntries.length < 2) {
        throw new BadRequestException("At least two glue host records are required");
      }
    }

    if (nameservers && nameservers.length < 2) {
      throw new BadRequestException("At least two nameservers are required");
    }

    const updated = await this.prisma.domain.update({
      where: { id: domain.id },
      data: {
        expiresAt:
          dto.expiresAt === null ? null : dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        registrarSource:
          dto.registrarSource !== undefined ? dto.registrarSource.trim() || null : undefined,
        nameservers: nameservers ?? undefined,
        nsGlueRecords: glueEntries ? (glueEntries as unknown as Prisma.InputJsonValue) : undefined,
        billingAmount:
          dto.billingAmount === null
            ? null
            : dto.billingAmount != null
              ? dto.billingAmount
              : undefined,
        billingCurrency: dto.billingCurrency?.toUpperCase(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            preferredCurrency: true,
          },
        },
        changeRequests: { where: { status: "PENDING" }, select: { id: true } },
        _count: { select: { dnsRecords: true } },
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
      const invoice = await this.issueRenewalInvoice({
        userId,
        domainId: updated.id,
        name: updated.name,
        amount,
        currency: updated.billingCurrency || "USD",
        user: updated.user,
      });
      invoiceId = invoice.id;
      return {
        ...mapAdminDomain({ ...updated, renewalInvoiceId: invoice.id }),
        invoiceId,
      };
    }

    return { ...mapAdminDomain(updated), invoiceId };
  }

  async deleteManualDomain(userId: string, domainId: string) {
    const domain = await this.prisma.domain.findFirst({
      where: {
        id: domainId,
        userId,
        managementMode: DomainManagementMode.MANUAL,
      },
      select: { id: true },
    });
    if (!domain) throw new NotFoundException("Manual domain not found");

    await this.prisma.domain.delete({ where: { id: domain.id } });
    return { deleted: true };
  }

  listChangeRequests(status?: DomainChangeStatus) {
    return this.domainsRepository
      .listChangeRequests({ status, limit: 200 })
      .then((rows) => rows.map(mapChangeRequest));
  }

  async updateChangeRequestStatus(id: string, adminId: string, dto: UpdateDomainChangeStatusDto) {
    const existing = await this.domainsRepository.findChangeRequest(id);
    if (!existing) {
      throw new NotFoundException("Change request not found");
    }
    if (
      existing.status !== DomainChangeStatus.PENDING &&
      dto.status === DomainChangeStatus.PENDING
    ) {
      throw new ConflictException("Cannot reopen a reviewed change request");
    }

    const updated = await this.domainsRepository.updateChangeRequest(id, {
      status: dto.status,
      reviewedAt: new Date(),
      reviewedById: adminId,
    });
    const full = await this.domainsRepository.findChangeRequest(id);
    if (!full) return mapChangeRequest(updated as never);
    return mapChangeRequest(full);
  }
}
