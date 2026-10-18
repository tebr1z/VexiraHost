"use client";

import { useTranslations } from "next-intl";

import { PricingCard } from "@/components/landing/pricing-card";
import type { CatalogProduct } from "@/features/catalog";
import type { HostingPlan } from "@/features/hosting";

export function HostingPlanCard({
  plan,
  product,
  featured,
  index = 0,
  onSelect,
}: {
  plan: HostingPlan;
  product?: CatalogProduct;
  featured?: boolean;
  index?: number;
  onSelect: () => void;
}): React.ReactElement {
  const t = useTranslations("publicHosting");
  if (!product) {
    return (
      <article className="home-price-card">
        <h3>{plan.name}</h3>
        <p className="home-plan-description">{t("priceUnavailable")}</p>
      </article>
    );
  }
  return (
    <PricingCard
      product={product}
      plan={plan}
      featured={featured}
      index={index}
      onSelect={onSelect}
      showDetails
    />
  );
}
