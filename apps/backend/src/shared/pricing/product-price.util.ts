import type { ProductPrice } from "@prisma/client";
import { PriceCurrency, PricePeriod } from "@prisma/client";

import {
  discountPercent,
  parseCurrency,
  parsePeriod,
  type SupportedCurrency,
  type SupportedPeriod,
} from "@/shared/pricing/currency.util";

export interface ResolvedProductPrice {
  currency: SupportedCurrency;
  period: SupportedPeriod;
  originalPrice: number;
  salePrice: number;
  discountPercent: number;
}

export function resolveProductPrice(
  prices: ProductPrice[],
  currencyInput?: string | null,
  periodInput?: string | null,
): ResolvedProductPrice | null {
  if (!prices.length) return null;

  const currency = parseCurrency(currencyInput);
  const period = parsePeriod(periodInput);

  const pick = (
    row: ProductPrice,
    resolvedCurrency: SupportedCurrency,
    resolvedPeriod: SupportedPeriod,
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

  const exact = prices.find((p) => p.currency === currency && p.period === period);
  if (exact) return pick(exact, currency, period);

  const sameCurrencyMonthly = prices.find(
    (p) => p.currency === currency && p.period === PricePeriod.MONTHLY,
  );
  if (sameCurrencyMonthly) return pick(sameCurrencyMonthly, currency, "MONTHLY");

  const sameCurrencyAny = prices.find((p) => p.currency === currency);
  if (sameCurrencyAny) {
    return pick(
      sameCurrencyAny,
      currency,
      sameCurrencyAny.period === PricePeriod.YEARLY ? "YEARLY" : "MONTHLY",
    );
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
  return pick(
    first,
    first.currency as SupportedCurrency,
    first.period === PricePeriod.YEARLY ? "YEARLY" : "MONTHLY",
  );
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
