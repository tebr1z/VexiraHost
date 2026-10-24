export const AUTH_EMAIL_LOCALES = ["en", "tr", "ru", "az"] as const;

export type AuthEmailLocale = (typeof AUTH_EMAIL_LOCALES)[number];

export const SITE_AUTH_LOCALES = [...AUTH_EMAIL_LOCALES, "de", "es", "fr", "it", "pt"] as const;
export function normalizeSiteLocale(locale?: string | null): string | null {
  const normalized = locale?.trim().toLowerCase().slice(0, 2);
  return SITE_AUTH_LOCALES.includes(normalized as (typeof SITE_AUTH_LOCALES)[number])
    ? normalized!
    : null;
}
export function resolveSiteLocale(locale?: string | null): string {
  return normalizeSiteLocale(locale) ?? "en";
}
const MAX_LOCALE_HISTORY = 3;

export function normalizeEmailLocale(locale?: string | null): AuthEmailLocale | null {
  if (!locale) return null;
  const normalized = locale.trim().toLowerCase().slice(0, 2);
  if (AUTH_EMAIL_LOCALES.includes(normalized as AuthEmailLocale)) {
    return normalized as AuthEmailLocale;
  }
  return null;
}

/** Always returns a safe locale — defaults to English, never throws. */
export function resolveAuthEmailLocale(locale?: string | null): AuthEmailLocale {
  return normalizeEmailLocale(locale) ?? "en";
}

/**
 * Prefer explicit locale, then newest entry in localeHistory, else English.
 * Never throws; ignores invalid values.
 */
export function resolveUserEmailLocale(input?: {
  locale?: string | null;
  localeHistory?: string[] | null;
}): AuthEmailLocale {
  const explicit = normalizeEmailLocale(input?.locale);
  if (explicit) return explicit;

  const history = Array.isArray(input?.localeHistory) ? input.localeHistory : [];
  for (const entry of history) {
    const fromHistory = normalizeEmailLocale(entry);
    if (fromHistory) return fromHistory;
  }

  return "en";
}

/** Newest-first history, deduped, capped at 3. Invalid locales are ignored. */
export function mergeLocaleHistory(
  current: string[] | null | undefined,
  next?: string | null,
): string[] {
  const normalized = normalizeSiteLocale(next);
  const existing = (Array.isArray(current) ? current : [])
    .map((entry) => normalizeSiteLocale(entry))
    .filter((entry): entry is string => entry != null);

  if (!normalized) {
    return existing.slice(0, MAX_LOCALE_HISTORY);
  }

  return [normalized, ...existing.filter((entry) => entry !== normalized)].slice(
    0,
    MAX_LOCALE_HISTORY,
  );
}
