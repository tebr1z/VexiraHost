import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";

import type { CreateTldPricingDto, UpdateTldPricingDto } from "../dto/tld-pricing.dto";

import { PrismaService } from "@/database/database.module";
import { TldPricingRepository } from "@/modules/domains/repository/tld-pricing.repository";

function mapTld(row: {
  id: string;
  tld: string;
  registerPrice: Decimal;
  renewPrice: Decimal;
  transferPrice: Decimal;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    tld: row.tld,
    registerPrice: Number(row.registerPrice),
    renewPrice: Number(row.renewPrice),
    transferPrice: Number(row.transferPrice),
    currency: row.currency,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class AdminDomainsService {
  constructor(
    private readonly tldPricingRepository: TldPricingRepository,
    private readonly prisma: PrismaService,
  ) {}

  async listDomains(q?: string) {
    const search = q?.trim();
    const rows = await this.prisma.domain.findMany({
      where:
        search && search.length >= 2
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { user: { email: { contains: search, mode: "insensitive" } } },
              ],
            }
          : undefined,
      orderBy: { createdAt: "desc" },
      take: 250,
      select: {
        id: true,
        name: true,
        status: true,
        managementMode: true,
        registrarSource: true,
        registrarRef: true,
        expiresAt: true,
        autoRenew: true,
        dnsProvider: true,
        dnsProviderStatus: true,
        dnsLastSyncedAt: true,
        billingAmount: true,
        billingCurrency: true,
        createdAt: true,
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        _count: {
          select: {
            dnsRecords: true,
            changeRequests: { where: { status: "PENDING" } },
          },
        },
      },
    });

    return rows.map((row) => ({
      ...row,
      billingAmount: row.billingAmount == null ? null : Number(row.billingAmount),
      dnsRecordCount: row._count.dnsRecords,
      pendingChangeCount: row._count.changeRequests,
      _count: undefined,
    }));
  }

  async listTlds() {
    const rows = await this.tldPricingRepository.listAll();
    return rows.map(mapTld);
  }

  async getTld(id: string) {
    const row = await this.tldPricingRepository.findById(id);
    if (!row) throw new NotFoundException("TLD not found");
    return mapTld(row);
  }

  async createTld(dto: CreateTldPricingDto) {
    const tld = dto.tld.trim().toLowerCase();
    const existing = await this.tldPricingRepository.findByTld(tld);
    if (existing) throw new ConflictException(`TLD .${tld} already exists`);

    const row = await this.tldPricingRepository.create({
      tld,
      registerPrice: dto.registerPrice,
      renewPrice: dto.renewPrice,
      transferPrice: dto.transferPrice,
      currency: dto.currency,
      isActive: dto.isActive,
      sortOrder: dto.sortOrder,
    });
    return mapTld(row);
  }

  async updateTld(id: string, dto: UpdateTldPricingDto) {
    const existing = await this.tldPricingRepository.findById(id);
    if (!existing) throw new NotFoundException("TLD not found");

    const row = await this.tldPricingRepository.update(id, dto);
    return mapTld(row);
  }

  async deleteTld(id: string) {
    const existing = await this.tldPricingRepository.findById(id);
    if (!existing) throw new NotFoundException("TLD not found");
    await this.tldPricingRepository.delete(id);
    return { deleted: true };
  }
}
