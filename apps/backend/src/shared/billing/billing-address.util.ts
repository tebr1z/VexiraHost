export interface BillingAddress {
  fullName: string;
  line1: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
}

export function normalizeBillingAddress(input: unknown): BillingAddress | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const fullName = String(raw.fullName ?? "").trim();
  const line1 = String(raw.line1 ?? "").trim();
  const city = String(raw.city ?? "").trim();
  const region = String(raw.region ?? "").trim();
  const postalCode = String(raw.postalCode ?? "").trim();
  const country = String(raw.country ?? "").trim();

  if (![fullName, line1, city, region, postalCode, country].every((v) => v.length > 0)) {
    return null;
  }

  return { fullName, line1, city, region, postalCode, country };
}

export function isCompleteBillingAddress(input: unknown): boolean {
  return normalizeBillingAddress(input) !== null;
}
