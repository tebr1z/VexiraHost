import { getRequestConfig } from "next-intl/server";

import { localeMessages } from "./messages";

import { routing, type AppLocale } from "@/i18n/routing";

export type Locale = AppLocale;
export { locales } from "@/i18n/routing";
export const defaultLocale = routing.defaultLocale;

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as AppLocale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale: locale as AppLocale,
    messages: localeMessages[locale as AppLocale],
  };
});
