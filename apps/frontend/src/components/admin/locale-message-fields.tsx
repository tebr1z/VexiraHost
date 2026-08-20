"use client";

import { useState } from "react";

import { SITE_LOCALES, type LocalizedText, type SiteLocale } from "@/lib/localized-text";

export function LocaleMessageFields({
  value,
  onChange,
  rows = 3,
  placeholder,
  singleLine = false,
}: {
  value: LocalizedText;
  onChange: (next: LocalizedText) => void;
  rows?: number;
  placeholder?: string;
  singleLine?: boolean;
}): React.ReactElement {
  const [locale, setLocale] = useState<SiteLocale>("az");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {SITE_LOCALES.map((code) => {
          const filled = Boolean(value[code].trim());
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase ${
                locale === code
                  ? "bg-primary text-on-primary"
                  : "bg-surface-container-low text-on-surface-variant"
              }`}
            >
              {code}
              {filled ? " •" : ""}
            </button>
          );
        })}
      </div>
      {singleLine ? (
        <input
          type="text"
          value={value[locale]}
          onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
          placeholder={placeholder}
          className="border-outline-variant/40 bg-surface w-full max-w-xl rounded-xl border px-4 py-2.5 text-sm"
        />
      ) : (
        <textarea
          value={value[locale]}
          onChange={(e) => onChange({ ...value, [locale]: e.target.value })}
          rows={rows}
          placeholder={placeholder}
          className="border-outline-variant/40 bg-surface w-full max-w-xl rounded-xl border px-4 py-2.5 text-sm"
        />
      )}
    </div>
  );
}
