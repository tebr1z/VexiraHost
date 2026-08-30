"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { HostingPageHero } from "@/components/hosting/hosting-page-hero";
import { HostingPlanCard } from "@/components/hosting/hosting-plan-card";
import { PlansSectionIntro } from "@/components/hosting/plans-section-intro";
import { BillingPeriodToggle } from "@/components/layout/billing-period-toggle";
import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAddToCartNavigation } from "@/features/auth/lib/use-add-to-cart-navigation";
import {
  listCatalogCategories,
  listCatalogProducts,
  type CatalogProduct,
} from "@/features/catalog";
import { listHostingPlans, type HostingPlan } from "@/features/hosting";
import { buildCartItemFromProduct } from "@/lib/cart-pricing";
import { cn } from "@/lib/cn";
import { mergePlansWithCatalogProducts, resolveHostingCategoryRef } from "@/lib/hosting-catalog";
import { useCartStore } from "@/stores/cart-store";
import { usePricingStore } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

export function HostingPlansSection(): React.ReactElement {
  const locale = useLocale();
  const t = useTranslations("publicHosting");
  const addItem = useCartStore((s) => s.addItem);
  const continueAfterAdd = useAddToCartNavigation();
  const currency = usePricingStore((s) => s.currency);
  const period = usePricingStore((s) => s.period);
  const [planEntries, setPlanEntries] = useState<
    Array<{ plan: HostingPlan; product: CatalogProduct }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const categories = await listCatalogCategories(locale);
        const categoryRef = resolveHostingCategoryRef(categories);
        const planList = await listHostingPlans();
        const productList = await listCatalogProducts({
          category: categoryRef,
          currency,
          period,
        });
        if (!cancelled) {
          setPlanEntries(mergePlansWithCatalogProducts(planList, productList));
        }
      } catch {
        if (!cancelled) setPlanEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currency, period, locale]);

  const popularIndex = planEntries.length >= 2 ? 1 : -1;
  const maxYearlySavings = useMemo(() => {
    if (planEntries.length === 0) return 0;
    return Math.max(...planEntries.map(({ product }) => product.yearlySavingsPercent ?? 0));
  }, [planEntries]);

  const handleSelect = (product: CatalogProduct) => {
    addItem(buildCartItemFromProduct(product));
    toast(t("addedToCart"), "success");
    continueAfterAdd();
  };

  return (
    <>
      <HostingPageHero />

      <section className="apple-grouped py-12 sm:py-16" id="hosting-plans">
        <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-4 lg:px-5">
          <PlansSectionIntro
            eyebrow={t("plansEyebrow")}
            title={t("plansTitle")}
            subtitle={t("plansSubtitle")}
            guarantees={[t("guarantee1"), t("guarantee2"), t("guarantee3")]}
            controls={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <BillingPeriodToggle savingsPercent={maxYearlySavings} className="mb-0" />
                <CurrencySwitcher variant="segmented" />
              </div>
            }
          />

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <LoadingSkeleton key={i} className="h-[28rem] rounded-2xl" />
              ))}
            </div>
          ) : planEntries.length === 0 ? (
            <p className="text-center text-[var(--label-secondary)]">{t("emptyPlans")}</p>
          ) : (
            <div
              className={cn(
                "grid gap-3 sm:gap-4",
                planEntries.length === 1 && "mx-auto max-w-sm",
                planEntries.length === 2 && "mx-auto max-w-3xl sm:grid-cols-2",
                planEntries.length === 3 && "mx-auto max-w-5xl sm:grid-cols-2 xl:grid-cols-3",
                planEntries.length >= 4 && "sm:grid-cols-2 xl:grid-cols-4",
              )}
            >
              {planEntries.map(({ plan, product }, index) => (
                <HostingPlanCard
                  key={plan.id}
                  plan={plan}
                  product={product}
                  featured={index === popularIndex}
                  onSelect={() => handleSelect(product)}
                />
              ))}
            </div>
          )}

          <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-[var(--label-tertiary)]">
            {period === "YEARLY" ? t("priceNoteYearly") : t("priceNote")}
          </p>
        </div>
      </section>
    </>
  );
}
