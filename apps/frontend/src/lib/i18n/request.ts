import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";

import { routing, type AppLocale } from "@/i18n/routing";

import az from "../../../messages/az.json";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import tr from "../../../messages/tr.json";

const messages: Record<AppLocale, typeof en> = { en, tr, ru, az };

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
    messages: messages[locale as AppLocale] as unknown as AbstractIntlMessages,
  };
});
