export const SITE_LOCALES = ["az", "en", "tr", "ru", "de", "es", "fr", "it", "pt"] as const;
export type SiteLocale = (typeof SITE_LOCALES)[number];

export type LocalizedText = Record<"az" | "en" | "tr" | "ru", string> &
  Partial<Record<"de" | "es" | "fr" | "it" | "pt", string>>;

export function emptyLocalizedText(): LocalizedText {
  return { az: "", en: "", tr: "", ru: "", de: "", es: "", fr: "", it: "", pt: "" };
}

export function parseLocalizedText(raw: unknown): LocalizedText {
  const empty = emptyLocalizedText();
  if (raw == null) return empty;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return empty;
    try {
      return parseLocalizedText(JSON.parse(trimmed));
    } catch {
      return {
        az: trimmed,
        en: trimmed,
        tr: trimmed,
        ru: trimmed,
        de: trimmed,
        es: trimmed,
        fr: trimmed,
        it: trimmed,
        pt: trimmed,
      };
    }
  }

  if (typeof raw !== "object" || Array.isArray(raw)) return empty;

  const record = raw as Record<string, unknown>;
  return {
    fr: typeof record.fr === "string" ? record.fr : "",
    it: typeof record.it === "string" ? record.it : "",
    pt: typeof record.pt === "string" ? record.pt : "",
    de: typeof record.de === "string" ? record.de : "",
    es: typeof record.es === "string" ? record.es : "",
    az: typeof record.az === "string" ? record.az : "",
    en: typeof record.en === "string" ? record.en : "",
    tr: typeof record.tr === "string" ? record.tr : "",
    ru: typeof record.ru === "string" ? record.ru : "",
  };
}

export function stringifyLocalizedText(value: LocalizedText): string {
  return JSON.stringify({
    fr: value.fr?.trim() ?? "",
    it: value.it?.trim() ?? "",
    pt: value.pt?.trim() ?? "",
    de: value.de?.trim() ?? "",
    es: value.es?.trim() ?? "",
    az: value.az.trim(),
    en: value.en.trim(),
    tr: value.tr.trim(),
    ru: value.ru.trim(),
  });
}

export function pickLocalizedText(value: LocalizedText, locale?: string): string {
  const short = (locale ?? "").toLowerCase().slice(0, 2) as SiteLocale;
  if (SITE_LOCALES.includes(short) && value[short]?.trim()) {
    return value[short]?.trim() ?? "";
  }
  for (const code of SITE_LOCALES) {
    if (value[code]?.trim()) return value[code]?.trim() ?? "";
  }
  return "";
}
