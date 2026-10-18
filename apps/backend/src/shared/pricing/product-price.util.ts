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
): ResolvedProductPrice | null {
  if (!prices.length) return null;

  const currency = parseCurrency(currencyInput);
  const period = periodInput === "ONE_TIME" ? "ONE_TIME" : parsePeriod(periodInput);

  const pick = (
    row: ProductPrice,
    resolvedCurrency: SupportedCurrency,
    resolvedPeriod: PricePeriod,
  ) => {
    const originalPrice = Number(row.originalPrice);
    const salePrice = Number(row.salePrice);
    return {
      currency: resolvedCurrency,
      period: resolvedPeriod,
      originalPrice,
      salePrice,
      discountPercent: discountPercent(originalPrice, salePrice),
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

export function mapProductPrices(prices: ProductPrice[]) {
  return prices.map((p) => ({
    currency: p.currency,
    period: p.period,
    originalPrice: Number(p.originalPrice),
    salePrice: Number(p.salePrice),
    discountPercent: discountPercent(Number(p.originalPrice), Number(p.salePrice)),
  }));
}
