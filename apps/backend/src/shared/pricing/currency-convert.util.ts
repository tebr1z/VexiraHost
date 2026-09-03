import type { ExchangeRatesSnapshot } from "./exchange-rates.types";

export type LedgerCurrency = "USD" | "EUR" | "AZN";

function normalizeCurrency(code: string): LedgerCurrency {
  const upper = code.toUpperCase();
  if (upper === "EUR" || upper === "AZN" || upper === "USD") return upper;
  return "USD";
}

function toUsd(
  amount: number,
  from: LedgerCurrency,
  rates: Pick<ExchangeRatesSnapshot, "usdToAzn" | "usdToEur">,
): number {
  if (from === "USD") return amount;
  if (from === "AZN") return rates.usdToAzn > 0 ? amount / rates.usdToAzn : amount;
  return rates.usdToEur > 0 ? amount / rates.usdToEur : amount;
}

function fromUsd(
  usdAmount: number,
  to: LedgerCurrency,
  rates: Pick<ExchangeRatesSnapshot, "usdToAzn" | "usdToEur">,
): number {
  if (to === "USD") return Math.round(usdAmount * 100) / 100;
  if (to === "AZN") return Math.round(usdAmount * rates.usdToAzn * 100) / 100;
  return Math.round(usdAmount * rates.usdToEur * 100) / 100;
}

/** Convert between USD / EUR / AZN using CBAR (or fallback) rates. */
export function convertLedgerAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Pick<ExchangeRatesSnapshot, "usdToAzn" | "usdToEur">,
): number {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  if (from === to) return Math.round(amount * 100) / 100;
  return fromUsd(toUsd(amount, from, rates), to, rates);
}
