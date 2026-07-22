import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { DomainStatus, TransferStatus } from "@prisma/client";
import * as bcrypt from "bcryptjs";

import { MockRegistrarProvider } from "../providers/mock-registrar.provider";
import type { UpdateDnsRecordsDto } from "../dto";
import { DomainsRepository } from "../repository/domains.repository";

function extractTld(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  return parts[parts.length - 1] ?? "com";
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
  createdAt: Date;
  _count?: { dnsRecords: number };
}) {
  return {
    id: domain.id,
    name: domain.name,
    tld: domain.tld,
    status: domain.status,
    registeredAt: domain.registeredAt,
    expiresAt: domain.expiresAt,
    autoRenew: domain.autoRenew,
    nameservers: domain.nameservers,
    dnsRecordCount: domain._count?.dnsRecords ?? 0,
    createdAt: domain.createdAt,
  };
}

@Injectable()
export class DomainsService {
  constructor(
    private readonly domainsRepository: DomainsRepository,
    private readonly registrar: MockRegistrarProvider,
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
    return records.map((record) => ({
      id: record.id,
      type: record.type,
      name: record.name,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority,
    }));
  }

  async updateDnsRecords(id: string, userId: string, dto: UpdateDnsRecordsDto) {
    const domain = await this.domainsRepository.findByIdForUser(id, userId);
    if (!domain) {
      throw new NotFoundException("Domain not found");
    }
    if (domain.status !== DomainStatus.ACTIVE) {
      throw new BadRequestException("DNS can only be updated for active domains");
    }

    const records = await this.domainsRepository.replaceDnsRecords(id, dto.records);
    return records.map((record) => ({
      id: record.id,
      type: record.type,
      name: record.name,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority,
    }));
  }
}
