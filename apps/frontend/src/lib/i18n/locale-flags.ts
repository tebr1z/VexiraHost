import type { AppLocale } from "@/i18n/routing";

/** ISO 3166-1 alpha-2 codes for flagcdn.com */
export const LOCALE_COUNTRY: Record<AppLocale, string> = {
  en: "gb",
  tr: "tr",
  ru: "ru",
  az: "az",
};

export function flagUrl(locale: AppLocale, width = 40): string {
  return `https://flagcdn.com/w${width}/${LOCALE_COUNTRY[locale]}.png`;
}
