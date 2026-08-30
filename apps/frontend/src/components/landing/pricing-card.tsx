"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";

import { CATALOG_CATEGORY_ICONS } from "@/components/landing/catalog-category-nav";
import { MaterialIcon } from "@/components/landing/material-icon";
import type { CatalogProduct } from "@/features/catalog";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/i18n/format";

const CATEGORY_FEATURES: Record<string, string[]> = {
  HOSTING: ["f1", "f2", "f3"],
  VPS: ["f1", "f2", "f3"],
  DEDICATED: ["f1", "f2", "f3"],
  DOMAIN: ["f1", "f2"],
  SSL: ["f1", "f2"],
  EMAIL: ["f1", "f2", "f3"],
  LICENSE: ["f1", "f2", "f3"],
  BACKUP: ["f1", "f2"],
  WHATSAPP_API: ["f1", "f2", "f3"],
};

function billingLabel(cycle: string, t: ReturnType<typeof useTranslations<"pricing">>): string {
  if (cycle === "YEARLY") return t("yearly");
  if (cycle === "ONE_TIME") return t("oneTime");
  return t("monthly");
}

export function PricingCard({
  product,
  featured,
  index,
  onSelect,
}: {
  product: CatalogProduct;
  featured?: boolean;
  index: number;
  onSelect: () => void;
}): React.ReactElement {
  const locale = useLocale();
  const t = useTranslations("pricing");
  const tCat = useTranslations("dashboard.pages.products.categories");
  const reduceMotion = useReducedMotion();
  const featureKeys = CATEGORY_FEATURES[product.category] ?? ["f1", "f2"];
  const categoryIcon = CATALOG_CATEGORY_ICONS[product.category] ?? "deployed_code";
  const descriptionLines =
    product.description
      ?.split(/\n|•/)
      .map((l) => l.trim())
      .filter(Boolean) ?? [];

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={reduceMotion ? undefined : { y: -4 }}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[28px] border bg-[var(--bg-elevated)] p-6 transition-[border-color,box-shadow,transform] duration-300 sm:p-7",
        featured
          ? "border-[color-mix(in_srgb,var(--accent)_45%,var(--separator))] shadow-[0_20px_50px_color-mix(in_srgb,var(--accent)_10%,transparent)]"
          : "border-[var(--separator)] shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:border-[color-mix(in_srgb,var(--accent)_28%,var(--separator))]",
      )}
    >
      {featured ? (
        <div
          className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,transparent,var(--accent),transparent)]"
          aria-hidden
        />
      ) : null}

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              featured
                ? "bg-[var(--accent)] text-white"
                : "bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] text-[var(--accent)]",
            )}
          >
            <MaterialIcon name={categoryIcon} className="text-[22px]" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--label-tertiary)]">
              {tCat(product.category as never)}
            </p>
            <h3 className="mt-0.5 text-xl font-semibold tracking-tight text-[var(--label)] sm:text-[1.35rem]">
              {product.name}
            </h3>
          </div>
        </div>
        {featured ? (
          <span className="shrink-0 rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent)]">
            {t("popular")}
          </span>
        ) : null}
      </div>

      {product.description ? (
        <p className="relative mt-4 min-h-[2.75rem] text-sm leading-relaxed text-[var(--label-secondary)]">
          {descriptionLines[0] ?? product.description}
        </p>
      ) : (
        <div className="mt-4 min-h-[2.75rem]" />
      )}

      <div className="relative mt-6 flex items-baseline gap-1.5">
        <span className="text-[2.35rem] font-semibold leading-none tracking-[-0.04em] text-[var(--label)] sm:text-[2.6rem]">
          {formatMoney(product.price, product.currency, locale)}
        </span>
        <span className="text-sm text-[var(--label-secondary)]">
          {billingLabel(product.billingCycle, t)}
        </span>
      </div>

      <button
        type="button"
        onClick={onSelect}
        className={cn(
          "apple-btn relative mt-6 w-full",
          featured ? "apple-btn-primary" : "apple-btn-secondary",
        )}
      >
        {t("selectPlan")}
        <MaterialIcon
          name="arrow_forward"
          className="ml-1 text-[18px] transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </button>

      <ul className="relative mt-6 space-y-2.5 border-t border-[var(--separator)] pt-5">
        {descriptionLines.slice(1).map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-sm text-[var(--label-secondary)]">
            <MaterialIcon
              name="check_circle"
              className="mt-0.5 shrink-0 text-[16px] text-[var(--success)]"
            />
            <span>{line}</span>
          </li>
        ))}
        {featureKeys.map((key) => (
          <li key={key} className="flex items-start gap-2.5 text-sm text-[var(--label-secondary)]">
            <MaterialIcon
              name="check_circle"
              className="mt-0.5 shrink-0 text-[16px] text-[var(--success)]"
            />
            <span>{t(`categoryFeatures.${product.category}.${key}` as never)}</span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}
