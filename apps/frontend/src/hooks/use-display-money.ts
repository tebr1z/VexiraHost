"use client";

import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import {
  convertAmount,
  FALLBACK_EXCHANGE_RATES,
  fetchExchangeRates,
  type ExchangeRates,
  type PricingCurrency,
} from "@/features/catalog/services/exchange-rates.service";
import { formatMoney } from "@/lib/i18n/format";
import { usePricingStore, type AppCurrency } from "@/stores/pricing-store";

export function useExchangeRates(): ExchangeRates {
  const [rates, setRates] = useState<ExchangeRates>(FALLBACK_EXCHANGE_RATES);

  useEffect(() => {
    let cancelled = false;
    void fetchExchangeRates().then((next) => {
      if (!cancelled) setRates(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return rates;
}

/** Format any ledger amount into the user's preferred display currency (CBAR daily rates). */
export function useDisplayMoney(): {
  currency: AppCurrency;
  rates: ExchangeRates;
  convert: (amount: number, fromCurrency: string) => number;
  format: (amount: number, fromCurrency: string) => string;
} {
  const locale = useLocale();
  const currency = usePricingStore((s) => s.currency);
  const rates = useExchangeRates();

  const convert = useCallback(
    (amount: number, fromCurrency: string) =>
      convertAmount(amount, fromCurrency, currency as PricingCurrency, rates),
    [currency, rates],
  );

  const format = useCallback(
    (amount: number, fromCurrency: string) =>
      formatMoney(convert(amount, fromCurrency), currency, locale),
    [convert, currency, locale],
  );

  return { currency, rates, convert, format };
}
