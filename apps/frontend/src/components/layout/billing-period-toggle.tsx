"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/cn";
import { usePricingStore, type AppPeriod } from "@/stores/pricing-store";

export function BillingPeriodToggle({
  className,
  savingsPercent = 0,
}: {
  className?: string;
  /** Max yearly savings vs 12× monthly — shown on the yearly option. */
  savingsPercent?: number;
}): React.ReactElement {
  const t = useTranslations("publicHosting");
  const period = usePricingStore((s) => s.period);
  const setPeriod = usePricingStore((s) => s.setPeriod);

  const options: { value: AppPeriod; label: string; badge?: string }[] = [
    { value: "MONTHLY", label: t("periodMonthly") },
    {
      value: "YEARLY",
      label: t("periodYearly"),
      badge: savingsPercent > 0 ? t("yearlySavingsBadge", { percent: savingsPercent }) : undefined,
    },
  ];

  return (
    <div className={cn("flex justify-center", className)}>
      <div className="apple-segmented" role="group" aria-label={t("billingPeriodLabel")}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            data-active={period === opt.value}
            onClick={() => setPeriod(opt.value)}
            className="apple-segmented-item inline-flex items-center gap-2"
          >
            <span>{opt.label}</span>
            {opt.badge && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  period === opt.value
                    ? "bg-white/20 text-white"
                    : "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]",
                )}
              >
                {opt.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
