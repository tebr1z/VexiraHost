"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/** Keeps `<html lang>` in sync when locale changes without a full reload. */
export function LocaleHtmlUpdater(): null {
  const locale = useLocale();

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return null;
}
