import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { NotFoundView } from "@/components/errors/not-found-view";
import { routing, type AppLocale } from "@/i18n/routing";
import { localeMessages } from "@/lib/i18n/messages";

/**
 * Ensures notFound() under /t4abriz always uses the same public 404 template,
 * even if a parent segment tries to style the area differently.
 */
export default async function StaffAreaNotFound(): Promise<React.ReactElement> {
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
