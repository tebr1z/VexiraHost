export const SUPPORTED_CURRENCIES = ["USD", "EUR", "AZN"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const SUPPORTED_PERIODS = ["MONTHLY", "YEARLY"] as const;
export type SupportedPeriod = (typeof SUPPORTED_PERIODS)[number];

/** EU member states → EUR */
export const EU_COUNTRY_CODES = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
]);

export function currencyForCountry(countryCode?: string | null): SupportedCurrency {
  const code = countryCode?.toUpperCase();
  if (code === "AZ") return "AZN";
  if (code && EU_COUNTRY_CODES.has(code)) return "EUR";
  return "USD";
}

export function parseCurrency(value?: string | null): SupportedCurrency {
  const upper = value?.toUpperCase();
  if (upper === "EUR" || upper === "AZN" || upper === "USD") return upper;
  return "USD";
}

export function parsePeriod(value?: string | null): SupportedPeriod {
  return value?.toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY";
}

export function discountPercent(original: number, sale: number): number {
  if (original <= 0 || sale >= original) return 0;
  return Math.round(((original - sale) / original) * 100);
}

export function yearlySavingsPercent(monthlySale: number, yearlySale: number): number {
  if (monthlySale <= 0) return 0;
  const annualFromMonthly = monthlySale * 12;
  if (yearlySale >= annualFromMonthly) return 0;
  return Math.round(((annualFromMonthly - yearlySale) / annualFromMonthly) * 100);
}
