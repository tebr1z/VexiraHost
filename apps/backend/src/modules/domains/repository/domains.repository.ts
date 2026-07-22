import { Injectable } from "@nestjs/common";
import type { DnsRecordType, Domain, DomainStatus, Prisma } from "@prisma/client";

import { PrismaService } from "@/database/database.module";

@Injectable()
export class DomainsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string) {
    return this.prisma.domain.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { dnsRecords: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.domain.findUnique({ where: { id } });
  }

  findByIdForUser(id: string, userId: string) {
    return this.prisma.domain.findFirst({ where: { id, userId } });
  }

  findByName(name: string) {
    return this.prisma.domain.findUnique({ where: { name: name.toLowerCase() } });
  }

  createDomain(data: {
    userId: string;
    name: string;
    tld: string;
    status: DomainStatus;
    registrarRef?: string;
    registeredAt?: Date;
    expiresAt?: Date;
    nameservers?: string[];
  }) {
    return this.prisma.domain.create({ data });
  }

  updateDomain(id: string, data: Prisma.DomainUpdateInput) {
    return this.prisma.domain.update({ where: { id }, data });
  }

  getDnsRecords(domainId: string) {
    return this.prisma.dnsRecord.findMany({
      where: { domainId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  }

  replaceDnsRecords(
    domainId: string,
    records: {
      type: DnsRecordType;
      name: string;
      value: string;
      ttl: number;
      priority?: number;
    }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.dnsRecord.deleteMany({ where: { domainId } });
      if (records.length === 0) return [];
      await tx.dnsRecord.createMany({
        data: records.map((record) => ({ ...record, domainId })),
      });
      return tx.dnsRecord.findMany({
        where: { domainId },
        orderBy: [{ type: "asc" }, { name: "asc" }],
      });
    });
  }

  createTransfer(data: {
    domainId: string;
    userId: string;
    authCodeHash: string;
    registrarRef?: string;
  }) {
    return this.prisma.domainTransfer.create({ data });
  }
}
