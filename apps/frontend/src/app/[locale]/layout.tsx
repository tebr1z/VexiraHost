import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { LocaleHtmlUpdater } from "@/components/i18n/locale-html-updater";
import { LocaleShell } from "@/components/layout/locale-shell";
import { routing, type AppLocale } from "@/i18n/routing";

import az from "../../../messages/az.json";
import en from "../../../messages/en.json";
import ru from "../../../messages/ru.json";
import tr from "../../../messages/tr.json";

const localeMessages: Record<AppLocale, typeof en> = { en, tr, ru, az };

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export function generateStaticParams(): { locale: string }[] {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Props): Promise<React.ReactElement> {
  const { locale } = await params;

  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }

  const resolvedLocale = locale as AppLocale;
  setRequestLocale(resolvedLocale);
  const messages = localeMessages[resolvedLocale];

  return (
    <NextIntlClientProvider
      key={resolvedLocale}
      locale={resolvedLocale}
      messages={messages as unknown as AbstractIntlMessages}
    >
      <LocaleHtmlUpdater />
      <LocaleShell>{children}</LocaleShell>
    </NextIntlClientProvider>
  );
}
