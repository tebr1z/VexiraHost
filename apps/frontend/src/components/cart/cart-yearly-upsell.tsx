"use client";

import { useLocale, useTranslations } from "next-intl";

import { MaterialIcon } from "@/components/landing/material-icon";
import { formatMoney } from "@/lib/i18n/format";
import { cn } from "@/lib/cn";
import { hasYearlyUpsell } from "@/lib/cart-pricing";
import type { CartItem } from "@/stores/cart-store";
import { useCartStore } from "@/stores/cart-store";

export function CartYearlyUpsell({ item }: { item: CartItem }): React.ReactElement | null {
  const locale = useLocale();
  const t = useTranslations("cart");
  const updateItemBilling = useCartStore((s) => s.updateItemBilling);

  if (!hasYearlyUpsell(item) || typeof item.yearlyPrice !== "number") {
    return null;
  }

  const yearlyTotal = item.yearlyPrice * item.quantity;
  const monthlyAnnual = item.price * 12 * item.quantity;
  const savingsAmount = Math.max(0, monthlyAnnual - yearlyTotal);
  const savingsPercent = item.yearlySavingsPercent ?? 0;

  const handleSwitch = () => {
    updateItemBilling(item.productId, "YEARLY", item.yearlyPrice!);
  };

  return (
    <div
      className={cn(
        "mt-4 overflow-hidden rounded-2xl border",
        "border-[color-mix(in_srgb,var(--accent)_22%,var(--separator))]",
        "bg-gradient-to-br from-[color-mix(in_srgb,var(--accent)_6%,var(--bg-elevated))] to-[var(--bg-elevated)]",
        "shadow-[0_8px_24px_color-mix(in_srgb,var(--accent)_10%,transparent)]",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[color-mix(in_srgb,var(--accent)_12%,var(--separator))] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]">
            <MaterialIcon name="savings" className="text-[20px]" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent)]">
              {t("yearlyUpsellBadge")}
            </p>
            <p className="text-sm font-semibold text-[var(--label)]">{t("yearlyUpsellHeading")}</p>
          </div>
        </div>
        {savingsPercent > 0 && (
          <span className="shrink-0 rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-bold text-white">
            {t("yearlyUpsellPercent", { percent: savingsPercent })}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-sm text-[var(--label-tertiary)] line-through decoration-[var(--label-tertiary)]">
              {formatMoney(monthlyAnnual, item.currency, locale)}
            </span>
            <span className="text-xl font-bold tracking-tight text-[var(--label)]">
              {formatMoney(yearlyTotal, item.currency, locale)}
            </span>
            <span className="text-sm font-medium text-[var(--label-secondary)]">
              / {t("billingYearly")}
            </span>
          </div>
          <p className="text-sm text-[var(--label-secondary)]">
            {t("yearlyUpsellSavings", {
              savingsAmount: formatMoney(savingsAmount, item.currency, locale),
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSwitch}
          className="apple-btn apple-btn-primary inline-flex shrink-0 items-center justify-center gap-1.5 px-5 py-2.5 text-sm font-semibold sm:min-w-[10.5rem]"
        >
          {t("switchToYearly")}
          <MaterialIcon name="arrow_forward" className="text-[18px]" />
        </button>
      </div>
    </div>
  );
}
