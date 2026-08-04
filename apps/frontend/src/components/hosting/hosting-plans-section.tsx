"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { HostingPageHero } from "@/components/hosting/hosting-page-hero";
import { HostingPlanCard } from "@/components/hosting/hosting-plan-card";
import { PlansSectionIntro } from "@/components/hosting/plans-section-intro";
import { BillingPeriodToggle } from "@/components/layout/billing-period-toggle";
import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAddToCartNavigation } from "@/features/auth/lib/use-add-to-cart-navigation";
import { listCatalogProducts, type CatalogProduct } from "@/features/catalog";
import { listHostingPlans, type HostingPlan } from "@/features/hosting";
import { useRouter } from "@/i18n/navigation";
import { buildCartItemFromProduct } from "@/lib/cart-pricing";
import { cn } from "@/lib/cn";
import { useCartStore } from "@/stores/cart-store";
import { usePricingStore } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

export function HostingPlansSection(): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("publicHosting");
  const addItem = useCartStore((s) => s.addItem);
  const continueAfterAdd = useAddToCartNavigation();
  const currency = usePricingStore((s) => s.currency);
  const period = usePricingStore((s) => s.period);
  const [plans, setPlans] = useState<HostingPlan[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listHostingPlans(),
      listCatalogProducts({ category: "HOSTING", currency, period }),
    ])
      .then(([planList, productList]) => {
        setPlans(planList);
        setProducts(productList);
      })
      .finally(() => setLoading(false));
  }, [currency, period]);

  const productBySlug = useMemo(() => {
    const map = new Map<string, CatalogProduct>();
    for (const product of products) {
      if (product.hostingPlanSlug) map.set(product.hostingPlanSlug, product);
    }
    return map;
  }, [products]);

  const popularIndex = plans.length >= 2 ? 1 : -1;
  const maxYearlySavings = useMemo(() => {
    if (products.length === 0) return 0;
    return Math.max(...products.map((p) => p.yearlySavingsPercent ?? 0));
  }, [products]);

  const handleSelect = (plan: HostingPlan) => {
    const product = productBySlug.get(plan.slug);
    if (product) {
      addItem(buildCartItemFromProduct(product));
      toast(t("addedToCart"), "success");
      continueAfterAdd();
      return;
    }
    router.push("/register");
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
              <>
                <BillingPeriodToggle savingsPercent={maxYearlySavings} className="mb-0" />
                <CurrencySwitcher variant="segmented" />
              </>
            }
          />

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <LoadingSkeleton key={i} className="h-[28rem] rounded-2xl" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <p className="text-center text-[var(--label-secondary)]">{t("emptyPlans")}</p>
          ) : (
            <div
              className={cn(
                "grid gap-3 sm:gap-4",
                plans.length === 1 && "mx-auto max-w-sm",
                plans.length === 2 && "mx-auto max-w-3xl sm:grid-cols-2",
                plans.length === 3 && "mx-auto max-w-5xl sm:grid-cols-2 xl:grid-cols-3",
                plans.length >= 4 && "sm:grid-cols-2 xl:grid-cols-4",
              )}
            >
              {plans.map((plan, index) => (
                <HostingPlanCard
                  key={plan.id}
                  plan={plan}
                  product={productBySlug.get(plan.slug)}
                  featured={index === popularIndex}
                  onSelect={() => handleSelect(plan)}
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
