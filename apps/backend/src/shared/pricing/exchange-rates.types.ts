export type ExchangeRateSource = "cbar" | "fallback";

export interface ExchangeRatesSnapshot {
  date: string;
  usdToAzn: number;
  eurToAzn: number;
  usdToEur: number;
  source: ExchangeRateSource;
  fetchedAt: string;
}

export const FALLBACK_EXCHANGE_RATES: ExchangeRatesSnapshot = {
  date: "fallback",
  usdToAzn: 1.7,
  eurToAzn: 1.961,
  usdToEur: 1.7 / 1.961,
  source: "fallback",
  fetchedAt: new Date(0).toISOString(),
};
