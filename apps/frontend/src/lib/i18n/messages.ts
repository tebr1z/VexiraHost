import type { AbstractIntlMessages } from "next-intl";

import az from "../../../messages/az.json";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import tr from "../../../messages/tr.json";

import type { AppLocale } from "@/i18n/routing";

/** Shared locale catalogs — single import for layout + request (cache-bust). */
export const localeMessages: Record<AppLocale, AbstractIntlMessages> = {
  en: en as unknown as AbstractIntlMessages,
  tr: tr as unknown as AbstractIntlMessages,
  ru: ru as unknown as AbstractIntlMessages,
  az: az as unknown as AbstractIntlMessages,
};
