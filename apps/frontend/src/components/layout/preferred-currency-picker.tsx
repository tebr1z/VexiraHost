"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import type { AppCurrency } from "@/stores/pricing-store";

const OPTIONS: AppCurrency[] = ["USD", "EUR", "AZN"];

const SYMBOLS: Record<AppCurrency, string> = {
  USD: "$",
  EUR: "€",
  AZN: "₼",
};

const NAME_KEYS: Record<AppCurrency, "currencyUsd" | "currencyEur" | "currencyAzn"> = {
  USD: "currencyUsd",
  EUR: "currencyEur",
  AZN: "currencyAzn",
};

/** Site-styled segmented currency picker for register / cart (controlled). */
export function PreferredCurrencyPicker({
  value,
  onChange,
  locked = false,
  className,
}: {
  value: AppCurrency;
  onChange: (next: AppCurrency) => void;
  locked?: boolean;
  className?: string;
}): React.ReactElement {
  const t = useTranslations("pricing");
  const active = locked ? "AZN" : value;

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-on-surface text-sm font-medium">{t("preferredCurrency")}</p>
      <div
        className="apple-segmented apple-segmented-solid apple-segmented-block w-full"
        role="group"
        aria-label={t("preferredCurrency")}
      >
        {OPTIONS.map((code) => {
          const isActive = active === code;
          const disabled = locked && code !== "AZN";
          return (
            <button
              key={code}
              type="button"
              data-active={isActive}
              disabled={disabled}
              title={locked ? t("azLocked") : t(NAME_KEYS[code])}
              onClick={() => {
                if (!disabled) onChange(code);
              }}
              className={cn(
                "apple-segmented-item flex flex-1 flex-col items-center gap-0.5 py-2 disabled:cursor-not-allowed disabled:opacity-45",
                isActive && "font-semibold",
              )}
            >
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[11px] font-bold text-[var(--accent)]"
                  aria-hidden
                >
                  {SYMBOLS[code]}
                </span>
                <span className="text-sm tracking-wide">{code}</span>
              </span>
              <span className="hidden text-[10px] font-normal text-[var(--label-tertiary)] sm:block">
                {t(NAME_KEYS[code])}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-on-surface-variant text-xs">
        {locked ? t("azLocked") : t("registerCurrencyHint")}
      </p>
    </div>
  );
}
