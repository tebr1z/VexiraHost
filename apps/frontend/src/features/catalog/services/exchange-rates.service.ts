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

export function convertUsdPreview(
  usdAmount: number,
  currency: "USD" | "EUR" | "AZN",
  rates: Pick<ExchangeRates, "usdToAzn" | "usdToEur">,
): number {
  if (currency === "USD") return Math.round(usdAmount * 100) / 100;
  if (currency === "AZN") return Math.round(usdAmount * rates.usdToAzn * 100) / 100;
  return Math.round(usdAmount * rates.usdToEur * 100) / 100;
}
