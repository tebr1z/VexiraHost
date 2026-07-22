import {
  parseCurrency,
  type SupportedCurrency,
} from "@/shared/pricing/currency.util";

/** Days before an unlocked user may change preferred currency again. */
export const CURRENCY_CHANGE_COOLDOWN_DAYS = 30;

export function nextCurrencyChangeAt(currencyChangedAt?: Date | null): Date | null {
  if (!currencyChangedAt) return null;
  return new Date(
    currencyChangedAt.getTime() + CURRENCY_CHANGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
  );
}

export function canChangeCurrency(input: {
  currencyLocked?: boolean | null;
  currencyChangedAt?: Date | null;
}): boolean {
  if (input.currencyLocked) return false;
  const next = nextCurrencyChangeAt(input.currencyChangedAt);
  if (!next) return true;
  return Date.now() >= next.getTime();
}

export function resolveRegisterCurrency(input: {
  preferredCurrency?: string | null;
  countryCode?: string | null;
}): { currency: SupportedCurrency; locked: boolean } {
  const country = input.countryCode?.toUpperCase();
  if (country === "AZ") {
    return { currency: "AZN", locked: true };
  }

  return {
    currency: parseCurrency(input.preferredCurrency),
    locked: false,
  };
}
