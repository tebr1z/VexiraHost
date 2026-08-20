export const SITE_LOCALES = ["az", "en", "tr", "ru"] as const;
export type SiteLocale = (typeof SITE_LOCALES)[number];
export type LocalizedText = Record<SiteLocale, string>;

export function emptyLocalizedText(): LocalizedText {
  return { az: "", en: "", tr: "", ru: "" };
}

export function parseLocalizedText(raw: unknown): LocalizedText {
  const empty = emptyLocalizedText();
  if (raw == null) return empty;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return empty;
    try {
      return parseLocalizedText(JSON.parse(trimmed) as unknown);
    } catch {
      return { az: trimmed, en: trimmed, tr: trimmed, ru: trimmed };
    }
  }

  if (typeof raw !== "object" || Array.isArray(raw)) return empty;
  const record = raw as Record<string, unknown>;
  return {
    az: typeof record.az === "string" ? record.az : "",
    en: typeof record.en === "string" ? record.en : "",
    tr: typeof record.tr === "string" ? record.tr : "",
    ru: typeof record.ru === "string" ? record.ru : "",
  };
}

export function pickLocalizedText(value: LocalizedText | undefined, locale?: string): string {
  if (!value) return "";
  const short = (locale ?? "").toLowerCase().slice(0, 2) as SiteLocale;
  if (SITE_LOCALES.includes(short) && value[short].trim()) {
    return value[short].trim();
  }
  for (const code of SITE_LOCALES) {
    if (value[code].trim()) return value[code].trim();
  }
  return "";
}
