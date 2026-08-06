"use client";

import { useLocale, useTranslations } from "next-intl";

import { MaterialIcon } from "@/components/landing/material-icon";
import type { CatalogProduct } from "@/features/catalog";
import type { HostingPlan } from "@/features/hosting/services/hosting.service";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/i18n/format";
import { usePricingStore } from "@/stores/pricing-store";

const FEATURE_BADGES = [
  { key: "ssl", icon: "lock" },
  { key: "backup", icon: "cloud_sync" },
  { key: "webmail", icon: "mail" },
  { key: "migration", icon: "sync_alt" },
  { key: "wordpress", icon: "language" },
  { key: "support", icon: "support_agent" },
] as const;

export function HostingPlanCard({
  plan,
  product,
  featured,
  onSelect,
}: {
  plan: HostingPlan;
  product?: CatalogProduct;
  featured?: boolean;
  onSelect: () => void;
}): React.ReactElement {
  const locale = useLocale();
  const t = useTranslations("publicHosting");
  const period = usePricingStore((s) => s.period);
  const isYearly = period === "YEARLY";

  const price = product?.price ?? plan.price;
  const currency = product?.currency ?? plan.currency;
  const discount = isYearly
    ? (product?.discountPercent ?? 0)
    : (product?.yearlySavingsPercent ?? 0);
  const originalPrice =
    product?.originalPrice && product.originalPrice > price
      ? product.originalPrice
      : discount > 0
        ? price / (1 - discount / 100)
        : null;

  const descriptionLines =
    plan.description
      ?.split(/\n|•/)
      .map((l) => l.trim())
      .filter(Boolean) ?? [];
  const tagline = descriptionLines[0] ?? null;
  const isPlesk = plan.panel === "PLESK";

  const mainSpecs = [
    { value: plan.maxDomains, label: t("specDomainsCreate") },
    { value: `${plan.diskGb} GB`, label: t("specStorage") },
    { value: plan.maxEmails, label: t("specMailboxesFree") },
    { value: `${plan.bandwidthGb} GB`, label: t("specBandwidth") },
  ];

  return (
    <article
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-[var(--bg-elevated)] p-4 sm:p-5",
        featured
          ? "z-[1] border-[var(--accent)] shadow-[0_12px_40px_color-mix(in_srgb,var(--accent)_22%,transparent)] ring-1 ring-[var(--accent)] xl:-mt-1 xl:pb-6 xl:pt-6"
          : "border-[var(--separator)] shadow-sm",
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--accent)] px-4 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          {t("mostPopular")}
        </span>
      )}

      {discount > 0 && (
        <span className="mb-3 inline-flex w-fit rounded-md bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] px-2.5 py-1 text-xs font-bold text-[var(--accent)]">
          {isYearly
            ? t("discountPercent", { percent: discount })
            : t("yearlySavingsHint", { percent: discount })}
        </span>
      )}

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
            isPlesk
              ? "bg-[color-mix(in_srgb,#0ea5e9_14%,transparent)] text-[#0284c7]"
              : "bg-[color-mix(in_srgb,#f97316_14%,transparent)] text-[#c2410c]",
          )}
        >
          <MaterialIcon name={isPlesk ? "dashboard" : "tune"} className="text-[14px]" />
          {plan.panel}
        </span>
      </div>
      <h3 className="mt-2 text-xl font-bold tracking-tight text-[var(--label)] sm:text-[1.35rem]">
        {plan.name}
      </h3>
      {tagline && (
        <p className="mt-1.5 min-h-[2.5rem] text-sm leading-snug text-[var(--label-secondary)]">
          {tagline}
        </p>
      )}

      <div className="mt-4">
        {originalPrice != null && originalPrice > price && (
          <p className="text-sm text-[var(--label-tertiary)] line-through decoration-[var(--label-tertiary)]">
            {formatMoney(originalPrice, currency, locale)}
          </p>
        )}
        <div
          className={cn(
            "flex items-end gap-1",
            originalPrice != null && originalPrice > price ? "mt-0.5" : "",
          )}
        >
          <span className="text-[2rem] font-bold leading-none tracking-tight text-[var(--label)]">
            {formatMoney(price, currency, locale)}
          </span>
          <span className="mb-1 text-sm font-medium text-[var(--label-secondary)]">
            {isYearly ? t("perYear") : t("perMonth")}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className="apple-btn apple-btn-primary mt-4 w-full py-3 text-[15px] font-semibold"
      >
        {t("selectPlan")}
      </button>

      <ul className="mt-5 space-y-2 border-t border-[var(--separator)] pt-4">
        {mainSpecs.map((spec) => (
          <li key={spec.label} className="text-sm leading-snug text-[var(--label-secondary)]">
            <strong className="font-bold text-[var(--label)]">{spec.value}</strong> {spec.label}
          </li>
        ))}
      </ul>

      <p className="mb-3 mt-5 text-xs font-semibold text-[var(--label)]">{t("featuresTitle")}</p>

      <div className="grid grid-cols-2 gap-2">
        {FEATURE_BADGES.map((badge) => (
          <div
            key={badge.key}
            className="flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--separator)_75%,transparent)] bg-[color-mix(in_srgb,var(--bg-secondary)_70%,transparent)] px-2.5 py-2"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]">
              <MaterialIcon name={badge.icon} className="text-[15px] text-[var(--accent)]" />
            </span>
            <span className="text-[11px] font-medium leading-snug text-[var(--label-secondary)]">
              {t(`badges.${badge.key}`)}
            </span>
          </div>
        ))}
      </div>

      {descriptionLines.length > 1 ? (
        <ul className="mt-4 space-y-2">
          {descriptionLines.slice(1).map((line) => (
            <li
              key={line}
              className="flex items-start gap-2 text-[13px] leading-snug text-[var(--label-secondary)]"
            >
              <MaterialIcon
                name="check"
                className="mt-0.5 shrink-0 text-[15px] text-[var(--success)]"
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
