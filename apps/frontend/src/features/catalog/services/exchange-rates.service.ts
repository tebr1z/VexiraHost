import { apiClient } from "@/services/api-client";

export interface ExchangeRates {
  date: string;
  usdToAzn: number;
  eurToAzn: number;
  usdToEur: number;
  source: "cbar" | "fallback";
  fetchedAt: string;
}

export const FALLBACK_EXCHANGE_RATES: ExchangeRates = {
  date: "fallback",
  usdToAzn: 1.7,
  eurToAzn: 1.961,
  usdToEur: 1.7 / 1.961,
  source: "fallback",
  fetchedAt: new Date(0).toISOString(),
};

export async function fetchExchangeRates(): Promise<ExchangeRates> {
  try {
    const response = await apiClient.request<ExchangeRates>("/catalog/exchange-rates");
    return response.data ?? FALLBACK_EXCHANGE_RATES;
  } catch {
    return FALLBACK_EXCHANGE_RATES;
  }
}

export type PricingCurrency = "USD" | "EUR" | "AZN";

export function convertUsdPreview(
  usdAmount: number,
  currency: PricingCurrency,
  rates: Pick<ExchangeRates, "usdToAzn" | "usdToEur">,
): number {
  if (currency === "USD") return Math.round(usdAmount * 100) / 100;
  if (currency === "AZN") return Math.round(usdAmount * rates.usdToAzn * 100) / 100;
  return Math.round(usdAmount * rates.usdToEur * 100) / 100;
}

function toUsd(
  amount: number,
  from: PricingCurrency,
  rates: Pick<ExchangeRates, "usdToAzn" | "usdToEur">,
): number {
  if (from === "USD") return amount;
  if (from === "AZN") return rates.usdToAzn > 0 ? amount / rates.usdToAzn : amount;
  return rates.usdToEur > 0 ? amount / rates.usdToEur : amount;
}

/** Display-only FX between USD / EUR / AZN using daily CBAR (or fallback) rates. */
export function convertAmount(
  amount: number,
  from: string,
  to: PricingCurrency,
  rates: Pick<ExchangeRates, "usdToAzn" | "usdToEur">,
): number {
  const source = (from.toUpperCase() as PricingCurrency) || "USD";
  const fromCurrency: PricingCurrency =
    source === "EUR" || source === "AZN" || source === "USD" ? source : "USD";
  if (fromCurrency === to) return Math.round(amount * 100) / 100;
  return convertUsdPreview(toUsd(amount, fromCurrency, rates), to, rates);
}
