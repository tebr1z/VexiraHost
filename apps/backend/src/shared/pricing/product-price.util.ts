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
  const currency = parseCurrency(currencyInput);
  const period = parsePeriod(periodInput);

  const exact = prices.find((p) => p.currency === currency && p.period === period);
  if (exact) {
    const originalPrice = Number(exact.originalPrice);
    const salePrice = Number(exact.salePrice);
    return {
      currency,
      period,
      originalPrice,
      salePrice,
      discountPercent: discountPercent(originalPrice, salePrice),
    };
  }

  const sameCurrencyMonthly = prices.find(
    (p) => p.currency === currency && p.period === PricePeriod.MONTHLY,
  );
  if (sameCurrencyMonthly) {
    const originalPrice = Number(sameCurrencyMonthly.originalPrice);
    const salePrice = Number(sameCurrencyMonthly.salePrice);
    return {
      currency,
      period: "MONTHLY",
      originalPrice,
      salePrice,
      discountPercent: discountPercent(originalPrice, salePrice),
    };
  }

  const usdMonthly = prices.find(
    (p) => p.currency === PriceCurrency.USD && p.period === PricePeriod.MONTHLY,
  );
  if (usdMonthly) {
    const originalPrice = Number(usdMonthly.originalPrice);
    const salePrice = Number(usdMonthly.salePrice);
    return {
      currency: "USD",
      period: "MONTHLY",
      originalPrice,
      salePrice,
      discountPercent: discountPercent(originalPrice, salePrice),
    };
  }

  return null;
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
