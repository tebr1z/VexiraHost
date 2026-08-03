import { Injectable } from "@nestjs/common";
import type { Prisma, ProductCategory, PromoDiscountType, PriceCurrency } from "@prisma/client";

import { PrismaService } from "@/database/database.module";
import { normalizePromoCode } from "@/shared/pricing/promo.util";

@Injectable()
export class AdminPromoRepository {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { redemptions: true } } },
    });
  }

  findById(id: string) {
    return this.prisma.promoCode.findUnique({
      where: { id },
      include: { _count: { select: { redemptions: true } } },
    });
  }

  findByCode(code: string) {
    return this.prisma.promoCode.findUnique({
      where: { code: normalizePromoCode(code) },
    });
  }

  create(data: {
    code: string;
    type: PromoDiscountType;
    value: number;
    currency?: PriceCurrency | null;
    maxDiscountAmount?: number | null;
    minOrderAmount?: number | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    maxRedemptions?: number | null;
    maxPerUser?: number | null;
    isActive?: boolean;
    appliesToAll?: boolean;
    productIds?: string[];
    categories?: ProductCategory[];
  }) {
    return this.prisma.promoCode.create({
      data: {
        code: normalizePromoCode(data.code),
        type: data.type,
        value: data.value,
        currency: data.currency ?? null,
        maxDiscountAmount: data.maxDiscountAmount ?? null,
        minOrderAmount: data.minOrderAmount ?? null,
        startsAt: data.startsAt ?? null,
        endsAt: data.endsAt ?? null,
        maxRedemptions: data.maxRedemptions ?? null,
        maxPerUser: data.maxPerUser ?? null,
        isActive: data.isActive ?? true,
        appliesToAll: data.appliesToAll ?? true,
        productIds: data.productIds ?? [],
        categories: data.categories ?? [],
      },
      include: { _count: { select: { redemptions: true } } },
    });
  }

  update(id: string, data: Prisma.PromoCodeUpdateInput) {
    return this.prisma.promoCode.update({
      where: { id },
      data,
      include: { _count: { select: { redemptions: true } } },
    });
  }

  delete(id: string) {
    return this.prisma.promoCode.delete({ where: { id } });
  }
}
