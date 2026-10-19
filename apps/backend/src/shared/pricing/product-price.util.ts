import type { ProductPrice } from "@prisma/client";
import { PriceCurrency, PricePeriod } from "@prisma/client";

import {
  discountPercent,
  parseCurrency,
  parsePeriod,
  type SupportedCurrency,
} from "@/shared/pricing/currency.util";

export interface ResolvedProductPrice {
  currency: SupportedCurrency;
  period: PricePeriod;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
  campaignActive: boolean;
}

export interface ProductCampaignPricing {
  campaignDiscountPercent?: number | null;
  campaignStartsAt?: Date | null;
  campaignEndsAt?: Date | null;
}

export function isProductCampaignActive(
  campaign?: ProductCampaignPricing | null,
  now = new Date(),
): boolean {
  const percent = campaign?.campaignDiscountPercent ?? 0;
  if (percent <= 0 || percent >= 100) return false;
  if (campaign?.campaignStartsAt && campaign.campaignStartsAt > now) return false;
  if (campaign?.campaignEndsAt && campaign.campaignEndsAt <= now) return false;
  return true;
}

function applyCampaignPrice(
  originalPrice: number,
  salePrice: number,
  campaign?: ProductCampaignPricing | null,
) {
  if (!isProductCampaignActive(campaign)) {
    return { originalPrice, salePrice, campaignActive: false };
  }
  const percent = campaign?.campaignDiscountPercent ?? 0;
  return {
    originalPrice: salePrice,
    salePrice: Math.round(salePrice * (1 - percent / 100) * 100) / 100,
    campaignActive: true,
  };
}

/** One price per currency. Prefer explicit one-time prices, then legacy base prices. */
export function oneTimeProductPrices<T extends { currency: string; period: string }>(
  prices: T[],
): Array<T & { period: "ONE_TIME" }> {
  const rank = (period: string) => (period === "ONE_TIME" ? 0 : period === "MONTHLY" ? 1 : 2);
  const selected = new Map<string, T>();
  for (const row of prices) {
    const current = selected.get(row.currency);
    if (!current || rank(row.period) < rank(current.period)) selected.set(row.currency, row);
  }
  return [...selected.values()].map((row) => ({ ...row, period: "ONE_TIME" }));
}

export function resolveProductPrice(
  prices: ProductPrice[],
  currencyInput?: string | null,
  periodInput?: string | null,
  campaign?: ProductCampaignPricing | null,
): ResolvedProductPrice | null {
  if (!prices.length) return null;

  const currency = parseCurrency(currencyInput);
  const period = periodInput === "ONE_TIME" ? "ONE_TIME" : parsePeriod(periodInput);

  const pick = (
    row: ProductPrice,
    resolvedCurrency: SupportedCurrency,
    resolvedPeriod: PricePeriod,
  ) => {
    const priced = applyCampaignPrice(Number(row.originalPrice), Number(row.salePrice), campaign);
    return {
      currency: resolvedCurrency,
      period: resolvedPeriod,
      originalPrice: priced.originalPrice,
      salePrice: priced.salePrice,
      discountPercent: discountPercent(priced.originalPrice, priced.salePrice),
      campaignActive: priced.campaignActive,
    };
  };

  if (period === "ONE_TIME") {
    const rows = oneTimeProductPrices(prices);
    const row =
      rows.find((p) => p.currency === currency) ??
      rows.find((p) => p.currency === "USD") ??
      rows[0];
    return row ? pick(row, row.currency as SupportedCurrency, "ONE_TIME") : null;
  }

  const exact = prices.find((p) => p.currency === currency && p.period === period);
  if (exact) return pick(exact, currency, period);

  const sameCurrencyMonthly = prices.find(
    (p) => p.currency === currency && p.period === PricePeriod.MONTHLY,
  );
  if (sameCurrencyMonthly) return pick(sameCurrencyMonthly, currency, "MONTHLY");

  const sameCurrencyAny = prices.find((p) => p.currency === currency);
  if (sameCurrencyAny) {
    return pick(sameCurrencyAny, currency, sameCurrencyAny.period);
  }

  const requestedPeriodAny = prices.find((p) => p.period === period);
  if (requestedPeriodAny) {
    return pick(requestedPeriodAny, requestedPeriodAny.currency as SupportedCurrency, period);
  }

  const usdMonthly = prices.find(
    (p) => p.currency === PriceCurrency.USD && p.period === PricePeriod.MONTHLY,
  );
  if (usdMonthly) return pick(usdMonthly, "USD", "MONTHLY");

  const anyMonthly = prices.find((p) => p.period === PricePeriod.MONTHLY);
  if (anyMonthly) {
    return pick(anyMonthly, anyMonthly.currency as SupportedCurrency, "MONTHLY");
  }

  const first = prices[0];
  return pick(first, first.currency as SupportedCurrency, first.period);
}

export function availableCurrenciesFromPrices(
  prices: Array<{ currency: string }>,
): SupportedCurrency[] {
  const set = new Set<SupportedCurrency>();
  for (const row of prices) {
    const currency = parseCurrency(row.currency);
    set.add(currency);
  }
  return (["USD", "EUR", "AZN"] as SupportedCurrency[]).filter((c) => set.has(c));
}

export function hasYearlyPricing(prices: Array<{ period: string }>): boolean {
  return prices.some((p) => p.period === "YEARLY" || p.period === PricePeriod.YEARLY);
}

export function mapProductPrices(prices: ProductPrice[], campaign?: ProductCampaignPricing | null) {
  return prices.map((p) => {
    const priced = applyCampaignPrice(Number(p.originalPrice), Number(p.salePrice), campaign);
    return {
      currency: p.currency,
      period: p.period,
      originalPrice: priced.originalPrice,
      salePrice: priced.salePrice,
      discountPercent: discountPercent(priced.originalPrice, priced.salePrice),
      campaignActive: priced.campaignActive,
    };
  });
}
