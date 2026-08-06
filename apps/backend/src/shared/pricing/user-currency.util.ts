import { parseCurrency, type SupportedCurrency } from "@/shared/pricing/currency.util";

/**
 * Soft default only: Azerbaijan visitors start on AZN, everyone else on USD.
 * Currency is never hard-locked by geo; users can change anytime.
 */
export function resolveRegisterCurrency(input: {
  preferredCurrency?: string | null;
  countryCode?: string | null;
}): { currency: SupportedCurrency; locked: boolean } {
  if (input.preferredCurrency) {
    return { currency: parseCurrency(input.preferredCurrency), locked: false };
  }

  const country = input.countryCode?.toUpperCase();
  if (country === "AZ") {
    return { currency: "AZN", locked: false };
  }

  return { currency: "USD", locked: false };
}

/** Currency can always be changed by the customer. */
export function canChangeCurrency(_input?: {
  currencyLocked?: boolean | null;
  currencyChangedAt?: Date | null;
}): boolean {
  return true;
}

/** @deprecated Cooldown removed — kept for API compatibility. */
export function nextCurrencyChangeAt(_currencyChangedAt?: Date | null): Date | null {
  return null;
}
