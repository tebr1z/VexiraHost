export const AUTH_EMAIL_LOCALES = ["en", "tr", "ru", "az"] as const;

export type AuthEmailLocale = (typeof AUTH_EMAIL_LOCALES)[number];

export function resolveAuthEmailLocale(locale?: string | null): AuthEmailLocale {
  if (locale && AUTH_EMAIL_LOCALES.includes(locale as AuthEmailLocale)) {
    return locale as AuthEmailLocale;
  }
  return "en";
}
