import { defineRouting } from "next-intl/routing";

export const locales = ["en", "tr", "ru", "az", "de", "es", "fr", "it", "pt"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: true,
});
