import type { PriceCurrency, PricePeriod } from "@prisma/client";

import type { ExchangeRatesSnapshot } from "./exchange-rates.types";

export interface ExpandedProductPrice {
  currency: PriceCurrency;
  period: PricePeriod;
  originalPrice: number;
  salePrice: number;
}

export interface UsdPriceMatrixInput {
  monthlyOriginal: number;
  monthlySale: number;
  yearlyOriginal?: number;
  yearlySale?: number;
  yearlyEnabled?: boolean;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function convertUsd(
  usdAmount: number,
  currency: "USD" | "EUR" | "AZN",
  rates: Pick<ExchangeRatesSnapshot, "usdToAzn" | "usdToEur">,
): number {
  if (currency === "USD") return roundMoney(usdAmount);
  if (currency === "AZN") return roundMoney(usdAmount * rates.usdToAzn);
  return roundMoney(usdAmount * rates.usdToEur);
}

export function expandUsdPricesToAllCurrencies(
  input: UsdPriceMatrixInput,
  rates: Pick<ExchangeRatesSnapshot, "usdToAzn" | "usdToEur">,
): ExpandedProductPrice[] {
  const currencies: Array<"USD" | "EUR" | "AZN"> = ["USD", "EUR", "AZN"];
  const rows: ExpandedProductPrice[] = [];

  const monthlyOriginal = input.monthlyOriginal || input.monthlySale;
  const monthlySale = input.monthlySale;

  for (const currency of currencies) {
    rows.push({
      currency,
      period: "MONTHLY",
      originalPrice: convertUsd(monthlyOriginal, currency, rates),
      salePrice: convertUsd(monthlySale, currency, rates),
    });
  }

  if (input.yearlyEnabled !== false) {
    const yearlyOriginal = input.yearlyOriginal ?? roundMoney(monthlyOriginal * 12);
    const yearlySale = input.yearlySale ?? roundMoney(monthlySale * 10);

    for (const currency of currencies) {
      rows.push({
        currency,
        period: "YEARLY",
        originalPrice: convertUsd(yearlyOriginal, currency, rates),
        salePrice: convertUsd(yearlySale, currency, rates),
      });
    }
  }

  return rows;
}

export function expandProductPricesFromUsdSource(
  prices: Array<{
    currency: string;
    period: string;
    originalPrice: number;
    salePrice: number;
  }>,
  rates: Pick<ExchangeRatesSnapshot, "usdToAzn" | "usdToEur">,
  yearlyEnabled = true,
): ExpandedProductPrice[] {
  const usdMonthly =
    prices.find((p) => p.currency === "USD" && p.period === "MONTHLY") ??
    prices.find((p) => p.period === "MONTHLY");
  const usdYearly = prices.find((p) => p.currency === "USD" && p.period === "YEARLY");

  if (!usdMonthly) {
    return prices as ExpandedProductPrice[];
  }

  return expandUsdPricesToAllCurrencies(
    {
      monthlyOriginal: usdMonthly.originalPrice,
      monthlySale: usdMonthly.salePrice,
      yearlyEnabled: yearlyEnabled && (!!usdYearly || yearlyEnabled),
      yearlyOriginal: usdYearly?.originalPrice,
      yearlySale: usdYearly?.salePrice,
    },
    rates,
  );
}
