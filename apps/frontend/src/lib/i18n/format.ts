const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  tr: "tr-TR",
  ru: "ru-RU",
  az: "az-AZ",
};

export function resolveIntlLocale(locale: string): string {
  return LOCALE_MAP[locale] ?? "en-US";
}

export function formatMoney(amount: number, currency = "USD", locale = "en"): string {
  return new Intl.NumberFormat(resolveIntlLocale(locale), {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatDate(value: string | Date, locale = "en"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value: string | Date, locale = "en"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
