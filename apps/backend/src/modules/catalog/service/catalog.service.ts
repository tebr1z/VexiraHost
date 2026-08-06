import { Injectable, NotFoundException } from "@nestjs/common";
import type { ProductCategory } from "@prisma/client";

import { CatalogRepository } from "../repository/catalog.repository";

import { CbarExchangeService } from "@/shared/pricing/cbar-exchange.service";
import { yearlySavingsPercent } from "@/shared/pricing/currency.util";
import {
  availableCurrenciesFromPrices,
  hasYearlyPricing,
  mapProductPrices,
  resolveProductPrice,
} from "@/shared/pricing/product-price.util";

function localizeName(name: string, names: unknown, locale?: string): string {
  if (!locale || !names || typeof names !== "object") return name;
  const map = names as Record<string, string>;
  return map[locale] || map.en || name;
}

function mapProduct(
  product: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    category: ProductCategory;
    catalogCategoryId?: string | null;
    hostingPlanSlug: string | null;
    price: { toString(): string } | number;
    currency: string;
    billingCycle: string;
    isFree?: boolean;
    deliveryMode?: string;
    downloadUrl?: string | null;
    downloadFileName?: string | null;
    promoText?: string | null;
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
  const resolved = resolveProductPrice(product.prices as never, currency, period);
  const allPrices = mapProductPrices(product.prices as never);

  const monthly = allPrices.find(
    (p) => p.currency === (resolved?.currency ?? "USD") && p.period === "MONTHLY",
  );
  const yearly = allPrices.find(
    (p) => p.currency === (resolved?.currency ?? "USD") && p.period === "YEARLY",
  );
  const availableCurrencies = availableCurrenciesFromPrices(allPrices);
  const yearlyAvailable = hasYearlyPricing(allPrices);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category,
    catalogCategoryId: product.catalogCategoryId ?? null,
    hostingPlanSlug: product.hostingPlanSlug,
    price: product.isFree ? 0 : (resolved?.salePrice ?? Number(product.price)),
    originalPrice: product.isFree ? 0 : (resolved?.originalPrice ?? Number(product.price)),
    currency: resolved?.currency ?? product.currency,
    billingCycle: product.isFree ? "ONE_TIME" : (resolved?.period ?? product.billingCycle),
    discountPercent: product.isFree ? 0 : (resolved?.discountPercent ?? 0),
    yearlySavingsPercent:
      product.isFree || !monthly || !yearly
        ? 0
        : yearlySavingsPercent(monthly.salePrice, yearly.salePrice),
    availableCurrencies,
    yearlyAvailable,
    prices: allPrices,
    isFree: product.isFree ?? false,
    deliveryMode: product.deliveryMode ?? "NONE",
    downloadFileName: product.downloadFileName ?? null,
    promoText: product.promoText ?? null,
  };
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly catalogRepository: CatalogRepository,
    private readonly cbarExchange: CbarExchangeService,
  ) {}

  getExchangeRates() {
    return this.cbarExchange.getRates();
  }

  async listProducts(categorySlugOrId?: string, currency?: string, period?: string) {
    let catalogCategoryId: string | undefined;
    let legacyCategory: ProductCategory | undefined;

    if (categorySlugOrId) {
      const cat = await this.catalogRepository.findCatalogCategoryBySlugOrId(categorySlugOrId);
      if (cat) {
        catalogCategoryId = cat.id;
      } else if (
        ["HOSTING", "VPS", "DEDICATED", "DOMAIN", "SSL", "EMAIL", "LICENSE", "BACKUP"].includes(
          categorySlugOrId,
        )
      ) {
        legacyCategory = categorySlugOrId as ProductCategory;
      }
    }

    const [products, sellablePlans] = await Promise.all([
      this.catalogRepository.findActiveProducts({
        category: legacyCategory,
        catalogCategoryId,
      }),
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

  async listCategories(locale?: string) {
    const [categories, products] = await Promise.all([
      this.catalogRepository.findActiveCatalogCategories(),
      this.listProducts(),
    ]);

    const counts = new Map<string, number>();
    for (const product of products) {
      if (!product.catalogCategoryId) continue;
      counts.set(product.catalogCategoryId, (counts.get(product.catalogCategoryId) ?? 0) + 1);
    }

    return categories
      .map((cat) => ({
        id: cat.id,
        slug: cat.slug,
        name: localizeName(cat.name, cat.names, locale),
        systemType: cat.systemType ?? null,
        productCount: counts.get(cat.id) ?? 0,
      }))
      .filter((cat) => cat.productCount > 0);
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
