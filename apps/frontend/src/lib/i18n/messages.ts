import type { AbstractIntlMessages } from "next-intl";
import { cache } from "react";

import type { AppLocale } from "@/i18n/routing";
const loaders = {
  fr: () => import("../../../messages/fr.json"),
  it: () => import("../../../messages/it.json"),
  pt: () => import("../../../messages/pt.json"),
  en: () => import("../../../messages/en.json"),
  az: () => import("../../../messages/az.json"),
  tr: () => import("../../../messages/tr.json"),
  ru: () => import("../../../messages/ru.json"),
  de: () => import("../../../messages/de.json"),
  es: () => import("../../../messages/es.json"),
};
/** Load only the selected catalog. Other languages never enter the browser's shared bundle. */
export const getLocaleMessages = cache(
  async (locale: AppLocale): Promise<AbstractIntlMessages> =>
    (await loaders[locale]()).default as unknown as AbstractIntlMessages,
);
