import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DomainManagementMode, DomainStatus, TransferStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import * as bcrypt from "bcryptjs";

import type { UpdateDnsRecordsDto, UpdateNameserversDto, UpdateNsGlueDto } from "../dto";
import { MockRegistrarProvider } from "../providers/mock-registrar.provider";
import { DomainsRepository } from "../repository/domains.repository";
import {
  normalizeNsGlueEntries,
  parseNsGlueRecords,
  type NsGlueEntry,
} from "../utils/ns-glue.util";

import { DomainEmailService } from "./domain-email.service";

import { isValidIpAddress } from "@/shared/utils/ip-address.util";

function extractTld(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  return parts[parts.length - 1] ?? "com";
}

function mapDnsRecord(record: {
  id: string;
  type: string;
  name: string;
  value: string;
  ttl: number;
  priority: number | null;
}) {
  return {
    id: record.id,
    type: record.type,
    name: record.name,
    value: record.value,
    ttl: record.ttl,
    priority: record.priority,
  };
}

function mapDomain(domain: {
  id: string;
  name: string;
  tld: string;
  status: DomainStatus;
  registeredAt: Date | null;
  expiresAt: Date | null;
  autoRenew: boolean;
  nameservers: string[];
  nsGlueRecords?: unknown;
  billingAmount?: { toString(): string } | null;
  billingCurrency?: string;
  graceEndsAt?: Date | null;
  renewalInvoiceId?: string | null;
  createdAt: Date;
  _count?: { dnsRecords: number };
}) {
  const nsGlue = parseNsGlueRecords(domain.nsGlueRecords);
  return {
    id: domain.id,
    name: domain.name,
    tld: domain.tld,
    status: domain.status,
    registeredAt: domain.registeredAt,
    expiresAt: domain.expiresAt,
    autoRenew: domain.autoRenew,
    nameservers: domain.nameservers,
    nsGlueRecords: nsGlue,
    billingAmount: domain.billingAmount != null ? Number(domain.billingAmount) : null,
    billingCurrency: domain.billingCurrency ?? "USD",
    graceEndsAt: domain.graceEndsAt ?? null,
    renewalInvoiceId: domain.renewalInvoiceId ?? null,
    dnsRecordCount: domain._count?.dnsRecords ?? 0,
    createdAt: domain.createdAt,
  };
}

@Injectable()
export class DomainsService {
  constructor(
    private readonly domainsRepository: DomainsRepository,
    private readonly registrar: MockRegistrarProvider,
    private readonly domainEmailService: DomainEmailService,
  ) {}

  async search(query: string) {
    const results = await this.registrar.search(query);
    return results;
  }

  async listForUser(userId: string) {
    const domains = await this.domainsRepository.findByUserId(userId);
    return domains.map(mapDomain);
  }

  async getForUser(id: string, userId: string) {
    const domain = await this.domainsRepository.findByIdForUser(id, userId);
    if (!domain) {
      throw new NotFoundException("Domain not found");
    }
    return mapDomain(domain);
  }

  async register(name: string, userId: string) {
    const normalized = name.trim().toLowerCase();
    const existing = await this.domainsRepository.findByName(normalized);
    if (existing) {
      throw new ConflictException("Domain is already registered");
    }

    const searchResults = await this.registrar.search(normalized);
    const match = searchResults.find((r) => r.domain === normalized);
    if (!match?.available) {
      throw new BadRequestException("Domain is not available");
    }

    const registration = await this.registrar.register(normalized);
    const domain = await this.domainsRepository.createDomain({
      userId,
      name: normalized,
      tld: extractTld(normalized),
      status: DomainStatus.ACTIVE,
      managementMode: DomainManagementMode.REGISTRAR,
      registrarRef: registration.registrarRef,
      registeredAt: new Date(),
      expiresAt: registration.expiresAt,
      nameservers: registration.nameservers,
    });

    const defaultRecords = this.registrar.defaultDnsRecords(normalized);
    await this.domainsRepository.replaceDnsRecords(
      domain.id,
      defaultRecords.map((record) => ({
        type: record.type as "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS",
        name: record.name,
        value: record.value,
        ttl: record.ttl,
        priority: record.priority,
      })),
    );

    return mapDomain(domain);
  }

  async initiateTransfer(domainName: string, authCode: string, userId: string) {
    const normalized = domainName.trim().toLowerCase();
    const existing = await this.domainsRepository.findByName(normalized);
    if (existing) {
      throw new ConflictException("Domain already exists in your account or is taken");
    }

    const transferResult = await this.registrar.initiateTransfer(normalized, authCode);
    const authCodeHash = await bcrypt.hash(authCode, 10);

    const domain = await this.domainsRepository.createDomain({
      userId,
      name: normalized,
      tld: extractTld(normalized),
      status: DomainStatus.TRANSFER_PENDING,
      managementMode: DomainManagementMode.REGISTRAR,
      registrarRef: transferResult.registrarRef,
    });

    await this.domainsRepository.createTransfer({
      domainId: domain.id,
      userId,
      authCodeHash,
      registrarRef: transferResult.registrarRef,
    });

    return {
      domain: mapDomain(domain),
      transferStatus: TransferStatus.PENDING,
    };
  }

  async retryTransfer(id: string, authCode: string, userId: string) {
    const domain = await this.domainsRepository.findByIdForUser(id, userId);
    if (!domain) {
      throw new NotFoundException("Domain not found");
    }
    if (domain.status !== DomainStatus.TRANSFER_PENDING) {
      throw new BadRequestException("Domain is not pending transfer");
    }

    const transferResult = await this.registrar.initiateTransfer(domain.name, authCode);
    const authCodeHash = await bcrypt.hash(authCode, 10);

    await this.domainsRepository.createTransfer({
      domainId: domain.id,
      userId,
      authCodeHash,
      registrarRef: transferResult.registrarRef,
    });

    return {
      domain: mapDomain(domain),
      transferStatus: TransferStatus.PENDING,
    };
  }

  async getDnsRecords(id: string, userId: string) {
    const domain = await this.domainsRepository.findByIdForUser(id, userId);
    if (!domain) {
      throw new NotFoundException("Domain not found");
    }
    if (domain.status === DomainStatus.TRANSFER_PENDING) {
      throw new ForbiddenException("DNS is unavailable while transfer is pending");
    }

    const records = await this.domainsRepository.getDnsRecords(id);
    return records.map(mapDnsRecord);
  }

  async updateDnsRecords(id: string, userId: string, dto: UpdateDnsRecordsDto) {
    const domain = await this.domainsRepository.findByIdForUser(id, userId);
    if (!domain) {
      throw new NotFoundException("Domain not found");
    }
    if (domain.status !== DomainStatus.ACTIVE) {
      throw new BadRequestException("DNS can only be updated for active domains");
    }

    const previousRecords = await this.domainsRepository.getDnsRecords(id);
    const records = await this.domainsRepository.replaceDnsRecords(id, dto.records);

    if (domain.managementMode === DomainManagementMode.MANUAL) {
      await this.recordManualChangeAndNotify({
        domain,
        userId,
        type: "DNS",
        previousData: { records: previousRecords.map(mapDnsRecord) },
        requestedData: { records: records.map(mapDnsRecord) },
      });
    }

    return records.map(mapDnsRecord);
  }

  async updateNameservers(id: string, userId: string, dto: UpdateNameserversDto) {
    const domain = await this.domainsRepository.findByIdForUser(id, userId);
    if (!domain) {
      throw new NotFoundException("Domain not found");
    }
    if (domain.status !== DomainStatus.ACTIVE) {
      throw new BadRequestException("Nameservers can only be updated for active domains");
    }

    const normalized = dto.nameservers.map((ns) => ns.trim().toLowerCase()).filter(Boolean);
    if (normalized.length < 2) {
      throw new BadRequestException("At least two nameservers are required");
    }

    const previousNameservers = [...domain.nameservers];
    const updated = await this.domainsRepository.updateDomain(id, {
      nameservers: normalized,
    });

    if (domain.managementMode === DomainManagementMode.MANUAL) {
      await this.recordManualChangeAndNotify({
        domain,
        userId,
        type: "NAMESERVER",
        previousData: { nameservers: previousNameservers },
        requestedData: { nameservers: normalized },
      });
    }

    return {
      nameservers: updated.nameservers,
    };
  }

  async updateNsGlue(id: string, userId: string, dto: UpdateNsGlueDto) {
    const domain = await this.domainsRepository.findByIdForUser(id, userId);
    if (!domain) {
      throw new NotFoundException("Domain not found");
    }
    if (domain.status !== DomainStatus.ACTIVE) {
      throw new BadRequestException("Nameservers can only be updated for active domains");
    }

    const entries = normalizeNsGlueEntries(dto.entries);
    if (entries.length < 2) {
      throw new BadRequestException("At least two glue host records are required");
    }

    for (const entry of entries) {
      if (!isValidIpAddress(entry.ip)) {
        throw new BadRequestException("IP address must be a valid IPv4 or IPv6 format");
      }
    }

    const normalizedNameservers = dto.nameservers
      .map((ns) => ns.trim().toLowerCase())
      .filter(Boolean);
    if (normalizedNameservers.length < 2) {
      throw new BadRequestException("At least two nameservers are required");
    }

    const previousGlue = parseNsGlueRecords(domain.nsGlueRecords);
    const previousNameservers = [...domain.nameservers];

    const updated = await this.domainsRepository.updateDomain(id, {
      nsGlueRecords: entries as unknown as Prisma.InputJsonValue,
      nameservers: normalizedNameservers,
    });

    if (domain.managementMode === DomainManagementMode.MANUAL) {
      await this.recordManualChangeAndNotify({
        domain,
        userId,
        type: "NAMESERVER",
        previousData: {
          nsGlueRecords: previousGlue,
          nameservers: previousNameservers,
        },
        requestedData: {
          nsGlueRecords: entries,
          nameservers: normalizedNameservers,
        },
      });
    }

    return {
      nsGlueRecords: parseNsGlueRecords(updated.nsGlueRecords) as NsGlueEntry[],
      nameservers: updated.nameservers,
    };
  }

  private async recordManualChangeAndNotify(input: {
    domain: { id: string; name: string };
    userId: string;
    type: "DNS" | "NAMESERVER";
    previousData: unknown;
    requestedData: unknown;
  }) {
    const changeRequest = await this.domainsRepository.createChangeRequest({
      domainId: input.domain.id,
      userId: input.userId,
      type: input.type,
      previousData: input.previousData as object,
      requestedData: input.requestedData as object,
    });

    const user = await this.domainsRepository.findUserBrief(input.userId);
    const customerEmail = user?.email ?? "unknown";
    const customerName =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || customerEmail;

    await this.domainEmailService.sendManualChangeNotification({
      domainName: input.domain.name,
      customerEmail,
      customerName,
      changeType: input.type,
      previousData: input.previousData,
      requestedData: input.requestedData,
    });

    await this.domainsRepository.markChangeRequestNotified(changeRequest.id);
  }
}
