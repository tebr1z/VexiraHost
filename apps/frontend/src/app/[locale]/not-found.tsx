import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { NotFoundView } from "@/components/errors/not-found-view";
import { routing, type AppLocale } from "@/i18n/routing";
import { localeMessages } from "@/lib/i18n/messages";

export default async function NotFoundPage(): Promise<React.ReactElement> {
  const requestedLocale = await getLocale();
  const locale = routing.locales.includes(requestedLocale as AppLocale)
    ? (requestedLocale as AppLocale)
    : routing.defaultLocale;

  return (
    <NextIntlClientProvider locale={locale} messages={localeMessages[locale]} timeZone="Asia/Baku">
      <NotFoundView />
    </NextIntlClientProvider>
  );
}
