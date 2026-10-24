import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";

import { NotFoundView } from "@/components/errors/not-found-view";
import { routing, type AppLocale } from "@/i18n/routing";
import { getLocaleMessages } from "@/lib/i18n/messages";

export default async function NotFoundPage(): Promise<React.ReactElement> {
  const requestedLocale = await getLocale();
  const locale = routing.locales.includes(requestedLocale as AppLocale)
    ? (requestedLocale as AppLocale)
    : routing.defaultLocale;

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={await getLocaleMessages(locale)}
      timeZone="Asia/Baku"
    >
      <NotFoundView />
    </NextIntlClientProvider>
  );
}
