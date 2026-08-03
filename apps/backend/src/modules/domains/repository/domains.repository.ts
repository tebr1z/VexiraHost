import { Injectable } from "@nestjs/common";
import type {
  DomainChangeStatus,
  DomainChangeType,
  DomainManagementMode,
  DomainStatus,
  DnsRecordType,
  Prisma,
} from "@prisma/client";

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

  findAll(filters?: { managementMode?: DomainManagementMode; userId?: string }) {
    const where: Prisma.DomainWhereInput = {};
    if (filters?.managementMode) {
      where.managementMode = filters.managementMode;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    return this.prisma.domain.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        changeRequests: {
          where: { status: "PENDING" },
          select: { id: true },
        },
        _count: { select: { dnsRecords: true } },
      },
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
    managementMode?: DomainManagementMode;
    registrarSource?: string;
    adminNotes?: string;
    registrarRef?: string;
    registeredAt?: Date;
    expiresAt?: Date;
    nameservers?: string[];
    nsGlueRecords?: object;
    billingAmount?: number;
    billingCurrency?: string;
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

  createChangeRequest(data: {
    domainId: string;
    userId: string;
    type: DomainChangeType;
    previousData: Prisma.InputJsonValue;
    requestedData: Prisma.InputJsonValue;
  }) {
    return this.prisma.domainChangeRequest.create({ data });
  }

  listChangeRequests(filters?: { status?: DomainChangeStatus; limit?: number }) {
    return this.prisma.domainChangeRequest.findMany({
      where: filters?.status ? { status: filters.status } : undefined,
      orderBy: { createdAt: "desc" },
      take: filters?.limit ?? 100,
      include: {
        domain: { select: { id: true, name: true, managementMode: true, registrarSource: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  findChangeRequest(id: string) {
    return this.prisma.domainChangeRequest.findUnique({
      where: { id },
      include: {
        domain: { select: { id: true, name: true, managementMode: true, registrarSource: true } },
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  updateChangeRequest(
    id: string,
    data: {
      status: DomainChangeStatus;
      reviewedAt: Date;
      reviewedById: string;
    },
  ) {
    return this.prisma.domainChangeRequest.update({ where: { id }, data });
  }

  markChangeRequestNotified(id: string) {
    return this.prisma.domainChangeRequest.update({
      where: { id },
      data: { adminNotifiedAt: new Date() },
    });
  }

  findUserBrief(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true },
    });
  }
}
