"use client";

import { NextIntlClientProvider } from "next-intl";

import { NotFoundView } from "@/components/errors/not-found-view";
import { localeMessages } from "@/lib/i18n/messages";

/**
 * Root-level 404 (outside [locale] layout). Provide a minimal intl context
 * so the shared NotFoundView / translations still work.
 */
export default function RootNotFoundPage(): React.ReactElement {
  return (
    <NextIntlClientProvider locale="en" messages={localeMessages.en}>
      <NotFoundView />
    </NextIntlClientProvider>
  );
}
