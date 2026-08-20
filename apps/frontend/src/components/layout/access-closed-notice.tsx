"use client";

import { useTranslations } from "next-intl";

export function AccessClosedNotice({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}): React.ReactElement {
  const t = useTranslations("access");

  return (
    <div
      className={
        compact ? "w-full max-w-md text-center" : "mx-auto max-w-lg px-5 py-20 text-center"
      }
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
        <span className="material-symbols-outlined text-[28px] text-[var(--accent)]">
          construction
        </span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--label)]">
        {t("closedTitle")}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--label-secondary)]">
        {message.trim() || t("defaultMessage")}
      </p>
    </div>
  );
}
