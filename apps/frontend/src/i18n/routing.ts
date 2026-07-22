import { defineRouting } from "next-intl/routing";

export const locales = ["en", "tr", "ru", "az"] as const;
export type AppLocale = (typeof locales)[number];

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale: "en",
  localePrefix: "never",
  localeDetection: true,
});
