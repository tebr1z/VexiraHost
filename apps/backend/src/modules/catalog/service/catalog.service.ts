import { Injectable, NotFoundException } from "@nestjs/common";
import type { ProductCategory } from "@prisma/client";

import {
  mapProductPrices,
  resolveProductPrice,
} from "@/shared/pricing/product-price.util";
import { yearlySavingsPercent } from "@/shared/pricing/currency.util";

import { CatalogRepository } from "../repository/catalog.repository";

function mapProduct(
  product: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    category: ProductCategory;
    hostingPlanSlug: string | null;
    price: { toString(): string } | number;
    currency: string;
    billingCycle: string;
    prices: Array<{
      currency: string;
      period: string;
      originalPrice: { toString(): string } | number;
      salePrice: { toString(): string } | number;
    }>;
  },
  currency?: string,
  period?: string,
) {
  const resolved = resolveProductPrice(
    product.prices as never,
    currency,
    period,
  );
  const allPrices = mapProductPrices(product.prices as never);

  const monthly = allPrices.find((p) => p.currency === (resolved?.currency ?? "USD") && p.period === "MONTHLY");
  const yearly = allPrices.find((p) => p.currency === (resolved?.currency ?? "USD") && p.period === "YEARLY");

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    hostingPlanSlug: product.hostingPlanSlug,
    price: resolved?.salePrice ?? Number(product.price),
    originalPrice: resolved?.originalPrice ?? Number(product.price),
    currency: resolved?.currency ?? product.currency,
    billingCycle: resolved?.period ?? product.billingCycle,
    discountPercent: resolved?.discountPercent ?? 0,
    yearlySavingsPercent:
      monthly && yearly ? yearlySavingsPercent(monthly.salePrice, yearly.salePrice) : 0,
    prices: allPrices,
  };
}

@Injectable()
export class CatalogService {
  constructor(private readonly catalogRepository: CatalogRepository) {}

  async listProducts(category?: ProductCategory, currency?: string, period?: string) {
    const [products, sellablePlans] = await Promise.all([
      this.catalogRepository.findActiveProducts(category),
      this.catalogRepository.findSellableHostingPlanSlugs(),
    ]);
    const sellableSlugs = new Set(sellablePlans.map((p) => p.slug));

    return products
      .filter((product) => {
        if (product.category !== "HOSTING") return true;
        return Boolean(product.hostingPlanSlug && sellableSlugs.has(product.hostingPlanSlug));
      })
      .map((p) => mapProduct(p, currency, period));
  }

  listCategories() {
    const order: ProductCategory[] = [
      "HOSTING",
      "VPS",
      "DEDICATED",
      "DOMAIN",
      "SSL",
      "EMAIL",
      "LICENSE",
      "BACKUP",
    ];

    return this.listProducts().then((products) => {
      const counts = new Map<ProductCategory, number>();
      for (const product of products) {
        counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
      }
      return order
        .filter((category) => (counts.get(category) ?? 0) > 0)
        .map((category) => ({
          id: category,
          productCount: counts.get(category) ?? 0,
        }));
    });
  }

  async getProduct(slug: string, currency?: string, period?: string) {
    const product = await this.catalogRepository.findBySlug(slug);
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    if (product.category === "HOSTING") {
      const sellable = await this.catalogRepository.findSellableHostingPlanSlugs();
      const sellableSlugs = new Set(sellable.map((p) => p.slug));
      if (!product.hostingPlanSlug || !sellableSlugs.has(product.hostingPlanSlug)) {
        throw new NotFoundException("Product not found");
      }
    }
    return mapProduct(product, currency, period);
  }
}
