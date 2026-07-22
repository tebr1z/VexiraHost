"use client";

import { motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";

import { MaterialIcon } from "@/components/landing/material-icon";
import type { CatalogProduct } from "@/features/catalog";
import { formatMoney } from "@/lib/i18n/format";
import { cn } from "@/lib/cn";

const CATEGORY_FEATURES: Record<string, string[]> = {
  HOSTING: ["f1", "f2", "f3"],
  VPS: ["f1", "f2", "f3"],
  DEDICATED: ["f1", "f2", "f3"],
  DOMAIN: ["f1", "f2"],
  SSL: ["f1", "f2"],
  EMAIL: ["f1", "f2"],
  LICENSE: ["f1", "f2"],
  BACKUP: ["f1", "f2"],
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
  const featureKeys = CATEGORY_FEATURES[product.category] ?? ["f1", "f2"];
  const descriptionLines =
    product.description?.split(/\n|•/).map((l) => l.trim()).filter(Boolean) ?? [];

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className={cn(
        "apple-card flex h-full flex-col p-6 sm:p-7",
        featured && "ring-1 ring-[var(--accent)]",
      )}
    >
      {featured && (
        <span className="mb-4 inline-flex w-fit rounded-full bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
          {t("popular")}
        </span>
      )}

      <p className="text-xs font-medium uppercase tracking-wide text-[var(--label-tertiary)]">
        {tCat(product.category as never)}
      </p>
      <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--label)]">{product.name}</h3>

      {product.description && (
        <p className="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-[var(--label-secondary)]">
          {descriptionLines[0] ?? product.description}
        </p>
      )}

      <div className="my-6 flex items-end gap-1">
        <span className="text-4xl font-semibold tracking-tight text-[var(--label)]">
          {formatMoney(product.price, product.currency, locale)}
        </span>
        <span className="mb-1 text-sm text-[var(--label-secondary)]">
          {billingLabel(product.billingCycle, t)}
        </span>
      </div>

      <button type="button" onClick={onSelect} className="apple-btn apple-btn-primary w-full">
        {t("selectPlan")}
      </button>

      <ul className="mt-6 space-y-2.5 border-t-[0.5px] border-[var(--separator)] pt-5">
        {descriptionLines.slice(1).map((line) => (
          <li key={line} className="flex items-start gap-2 text-sm text-[var(--label-secondary)]">
            <MaterialIcon name="check" className="mt-0.5 shrink-0 text-[16px] text-[var(--success)]" />
            <span>{line}</span>
          </li>
        ))}
        {featureKeys.map((key) => (
          <li key={key} className="flex items-start gap-2 text-sm text-[var(--label-secondary)]">
            <MaterialIcon name="check" className="mt-0.5 shrink-0 text-[16px] text-[var(--success)]" />
            <span>{t(`categoryFeatures.${product.category}.${key}` as never)}</span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}
