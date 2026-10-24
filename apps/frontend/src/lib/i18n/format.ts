const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  tr: "tr-TR",
  ru: "ru-RU",
  az: "az-AZ",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
  pt: "pt-PT",
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

/** Fixed decimal/currency rules prevent Node/browser ICU differences in server-rendered prices. */
export function formatStorefrontMoney(amount: number, currency = "USD", locale = "en"): string {
  if (!Number.isFinite(amount)) return "—";
  const language = locale.toLowerCase().slice(0, 2);
  const english = language === "en";
  const group = english ? "," : ["ru", "fr"].includes(language) ? "\u00a0" : ".";
  const [integer, fraction] = amount.toFixed(2).split(".");
  const number =
    integer!.replace(/\B(?=(\d{3})+(?!\d))/g, group) + (english ? "." : ",") + fraction;
  const symbol = ({ USD: "$", EUR: "€", AZN: "₼" } as Record<string, string>)[currency] ?? currency;
  return ["de", "es", "ru", "fr", "it", "pt"].includes(language)
    ? `${number}\u00a0${symbol}`
    : `${symbol}\u00a0${number}`;
}
