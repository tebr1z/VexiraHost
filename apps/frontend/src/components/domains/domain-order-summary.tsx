"use client";
import { useLocale, useTranslations } from "next-intl";

import { formatMoney } from "@/lib/i18n/format";
export function DomainOrderSummary({ metadata }: { metadata: unknown }) {
  const t = useTranslations("hostingDomain");
  const locale = useLocale();
  const value = (
    metadata as {
      domainOrder?: { mode?: string; name?: string; price?: number; currency?: string };
    } | null
  )?.domainOrder;
  if (
    !value ||
    !["register", "transfer"].includes(value.mode ?? "") ||
    typeof value.price !== "number"
  )
    return null;
  return (
    <div className="mt-3 rounded-xl border border-[var(--separator)] p-3 text-sm">
      <p className="font-semibold">
        {t("orderTitle")} · {value.name}
      </p>
      <p>
        {t(value.mode!)} · {formatMoney(value.price, value.currency, locale)} / {t("year")}
      </p>
      <p className="mt-1 text-[var(--label-secondary)]">
        {t(value.mode === "transfer" ? "transferNote" : "processingNote")}
      </p>
    </div>
  );
}
