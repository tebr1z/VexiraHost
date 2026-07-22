import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";

import { TldPricingRepository } from "@/modules/domains/repository/tld-pricing.repository";

import type { CreateTldPricingDto, UpdateTldPricingDto } from "../dto/tld-pricing.dto";

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
  constructor(private readonly tldPricingRepository: TldPricingRepository) {}

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
