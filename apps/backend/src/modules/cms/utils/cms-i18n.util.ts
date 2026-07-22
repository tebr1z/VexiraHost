export type I18nText = {
  tr: string;
  en?: string;
  az?: string;
  ru?: string;
};

export function resolveI18nText(labels: unknown, locale: string): string {
  const record = labels as I18nText;
  const normalized = locale.toLowerCase().split("-")[0];
  const value =
    (normalized === "tr" && record.tr) ||
    (normalized === "en" && record.en) ||
    (normalized === "az" && record.az) ||
    (normalized === "ru" && record.ru) ||
    record.en ||
    record.tr ||
    record.az ||
    record.ru;
  return value ?? "";
}

function isI18nText(value: unknown): value is I18nText {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.tr === "string";
}

export function resolveContentDeep(value: unknown, locale: string): unknown {
  if (isI18nText(value)) return resolveI18nText(value, locale);
  if (Array.isArray(value)) return value.map((item) => resolveContentDeep(item, locale));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = resolveContentDeep(nested, locale);
    }
    return out;
  }
  return value;
}

export function toJsonValue(value: unknown): import("@prisma/client").Prisma.InputJsonValue {
  return value as import("@prisma/client").Prisma.InputJsonValue;
}
