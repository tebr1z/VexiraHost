"use client";

import { NextIntlClientProvider } from "next-intl";

import en from "../../messages/en.json";

import { NotFoundView } from "@/components/errors/not-found-view";

/**
 * Root-level 404 (outside [locale] layout). Provide a minimal intl context
 * so the shared NotFoundView / translations still work.
 */
export default function RootNotFoundPage(): React.ReactElement {
  return (
    <NextIntlClientProvider locale="en" messages={{ errors: en.errors }} timeZone="Asia/Baku">
      <NotFoundView />
    </NextIntlClientProvider>
  );
}
