"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { asString, asStringArray, CmsSectionShell } from "@/components/cms/cms-section-shell";
import { PlansSectionIntro } from "@/components/hosting/plans-section-intro";
import { PricingCard } from "@/components/landing/pricing-card";
import { BillingPeriodToggle } from "@/components/layout/billing-period-toggle";
import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAddToCartNavigation } from "@/features/auth/lib/use-add-to-cart-navigation";
import { listCatalogProducts, type CatalogProduct } from "@/features/catalog";
import type { PublicCmsSection } from "@/features/cms/types";
import { buildCartItemFromProduct } from "@/lib/cart-pricing";
import { cn } from "@/lib/cn";
import { useCartStore } from "@/stores/cart-store";
import { usePricingStore } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

export function CmsCatalogSection({ section }: { section: PublicCmsSection }): React.ReactElement {
  const t = useTranslations("pricing");
  const addItem = useCartStore((s) => s.addItem);
  const continueAfterAdd = useAddToCartNavigation();
  const currency = usePricingStore((s) => s.currency);
  const period = usePricingStore((s) => s.period);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const c = section.content;
  const categorySlug = asString(c.categorySlug) || asString(c.category) || "license";
  const productSlugs = asStringArray(c.productSlugs);
  const title = asString(c.title) || t("title");
  const subtitle = asString(c.subtitle) || t("subtitle");
  const eyebrow = asString(c.eyebrow) || t("eyebrow");
  const guarantees = asStringArray(c.guarantees);
  const sectionId = asString(c.anchorId) || `catalog-${categorySlug}`;

  useEffect(() => {
    setLoading(true);
    listCatalogProducts({ category: categorySlug, currency, period })
      .then((items) => {
        if (productSlugs.length === 0) {
          setProducts(items);
          return;
        }
        const allowed = new Set(productSlugs);
        setProducts(items.filter((p) => allowed.has(p.slug)));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [categorySlug, currency, period, productSlugs.join(",")]);

  const popularIndex = products.length >= 2 ? 1 : -1;
  const maxYearlySavings =
    products.length === 0 ? 0 : Math.max(...products.map((p) => p.yearlySavingsPercent ?? 0));

  const handleBuy = (product: CatalogProduct) => {
    addItem(buildCartItemFromProduct(product));
    toast(t("addedToCart"), "success");
    continueAfterAdd();
  };

  return (
    <CmsSectionShell design={section.design} className="apple-grouped" id={sectionId}>
      <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-4 lg:px-5">
        <PlansSectionIntro
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          guarantees={
            guarantees.length > 0 ? guarantees : [t("guarantee1"), t("guarantee2"), t("guarantee3")]
          }
          controls={
            <>
              <BillingPeriodToggle savingsPercent={maxYearlySavings} className="mb-0" />
              <CurrencySwitcher variant="segmented" />
            </>
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <LoadingSkeleton key={i} className="rounded-apple-lg h-[26rem]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-[var(--label-secondary)]">
            {asString(c.emptyProducts) || t("emptyProducts")}
          </p>
        ) : (
          <div
            className={cn(
              "grid gap-5",
              products.length === 1 && "mx-auto max-w-sm",
              products.length === 2 && "mx-auto max-w-3xl md:grid-cols-2",
              products.length >= 3 && "md:grid-cols-2 xl:grid-cols-3",
            )}
          >
            {products.map((product, index) => (
              <PricingCard
                key={product.id}
                product={product}
                featured={index === popularIndex}
                index={index}
                onSelect={() => handleBuy(product)}
              />
            ))}
          </div>
        )}
      </div>
    </CmsSectionShell>
  );
}
