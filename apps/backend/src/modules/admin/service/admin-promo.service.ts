import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { ProductCategory, PromoDiscountType, PriceCurrency } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import type { CreatePromoCodeDto, UpdatePromoCodeDto } from "../dto/promo-code.dto";
import { AdminPromoRepository } from "../repository/admin-promo.repository";

function mapPromo(row: {
  id: string;
  code: string;
  type: string;
  value: Decimal;
  currency: string | null;
  maxDiscountAmount: Decimal | null;
  minOrderAmount: Decimal | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxRedemptions: number | null;
  maxPerUser: number | null;
  isActive: boolean;
  appliesToAll: boolean;
  productIds: string[];
  categories: string[];
  createdAt: Date;
  updatedAt: Date;
  _count?: { redemptions: number };
}) {
  return {
    id: row.id,
    code: row.code,
    type: row.type,
    value: Number(row.value),
    currency: row.currency,
    maxDiscountAmount: row.maxDiscountAmount != null ? Number(row.maxDiscountAmount) : null,
    minOrderAmount: row.minOrderAmount != null ? Number(row.minOrderAmount) : null,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    maxRedemptions: row.maxRedemptions,
    maxPerUser: row.maxPerUser,
    isActive: row.isActive,
    appliesToAll: row.appliesToAll,
    productIds: row.productIds,
    categories: row.categories,
    redemptionCount: row._count?.redemptions ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function parseDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return new Date(value);
}

@Injectable()
export class AdminPromoService {
  constructor(private readonly promoRepository: AdminPromoRepository) {}

  async list() {
    const rows = await this.promoRepository.list();
    return rows.map(mapPromo);
  }

  async get(id: string) {
    const row = await this.promoRepository.findById(id);
    if (!row) throw new NotFoundException("Promo code not found");
    return mapPromo(row);
  }

  async create(dto: CreatePromoCodeDto) {
    const existing = await this.promoRepository.findByCode(dto.code);
    if (existing) throw new ConflictException(`Promo code ${dto.code} already exists`);

    const appliesToAll = dto.appliesToAll ?? true;
    const row = await this.promoRepository.create({
      code: dto.code,
      type: dto.type as PromoDiscountType,
      value: dto.value,
      currency: (dto.currency as PriceCurrency | undefined) ?? null,
      maxDiscountAmount: dto.maxDiscountAmount ?? null,
      minOrderAmount: dto.minOrderAmount ?? null,
      startsAt: parseDate(dto.startsAt) ?? null,
      endsAt: parseDate(dto.endsAt) ?? null,
      maxRedemptions: dto.maxRedemptions ?? null,
      maxPerUser: dto.maxPerUser ?? null,
      isActive: dto.isActive ?? true,
      appliesToAll,
      productIds: appliesToAll ? [] : (dto.productIds ?? []),
      categories: appliesToAll ? [] : ((dto.categories ?? []) as ProductCategory[]),
    });
    return mapPromo(row);
  }

  async update(id: string, dto: UpdatePromoCodeDto) {
    const existing = await this.promoRepository.findById(id);
    if (!existing) throw new NotFoundException("Promo code not found");

    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const clash = await this.promoRepository.findByCode(dto.code);
      if (clash) throw new ConflictException(`Promo code ${dto.code} already exists`);
    }

    const appliesToAll = dto.appliesToAll ?? existing.appliesToAll;
    const row = await this.promoRepository.update(id, {
      ...(dto.code != null ? { code: dto.code.trim().toUpperCase() } : {}),
      ...(dto.type != null ? { type: dto.type as PromoDiscountType } : {}),
      ...(dto.value != null ? { value: dto.value } : {}),
      ...(dto.currency !== undefined ? { currency: dto.currency as PriceCurrency | null } : {}),
      ...(dto.maxDiscountAmount !== undefined ? { maxDiscountAmount: dto.maxDiscountAmount } : {}),
      ...(dto.minOrderAmount !== undefined ? { minOrderAmount: dto.minOrderAmount } : {}),
      ...(dto.startsAt !== undefined ? { startsAt: parseDate(dto.startsAt) } : {}),
      ...(dto.endsAt !== undefined ? { endsAt: parseDate(dto.endsAt) } : {}),
      ...(dto.maxRedemptions !== undefined ? { maxRedemptions: dto.maxRedemptions } : {}),
      ...(dto.maxPerUser !== undefined ? { maxPerUser: dto.maxPerUser } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      ...(dto.appliesToAll !== undefined ? { appliesToAll: dto.appliesToAll } : {}),
      productIds: appliesToAll ? [] : (dto.productIds ?? existing.productIds),
      categories: appliesToAll
        ? []
        : ((dto.categories ?? existing.categories) as ProductCategory[]),
    });
    return mapPromo(row);
  }

  async delete(id: string) {
    const existing = await this.promoRepository.findById(id);
    if (!existing) throw new NotFoundException("Promo code not found");
    await this.promoRepository.delete(id);
    return { deleted: true };
  }
}
