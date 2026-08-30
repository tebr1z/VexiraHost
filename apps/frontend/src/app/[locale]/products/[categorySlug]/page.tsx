"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PlansSectionIntro } from "@/components/hosting/plans-section-intro";
import { PricingCard } from "@/components/landing/pricing-card";
import { BillingPeriodToggle } from "@/components/layout/billing-period-toggle";
import { CurrencySwitcher } from "@/components/layout/currency-switcher";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAddToCartNavigation } from "@/features/auth/lib/use-add-to-cart-navigation";
import {
  listCatalogCategories,
  listCatalogProducts,
  type CatalogCategory,
  type CatalogProduct,
} from "@/features/catalog";
import { Link } from "@/i18n/navigation";
import { buildCartItemFromProduct } from "@/lib/cart-pricing";
import { cn } from "@/lib/cn";
import { useCartStore } from "@/stores/cart-store";
import { usePricingStore } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

export default function CategoryProductsPage(): React.ReactElement {
  const params = useParams();
  const categorySlug = params.categorySlug as string;
  const locale = useLocale();
  const t = useTranslations("catalogPage");
  const tp = useTranslations("pricing");
  const addItem = useCartStore((s) => s.addItem);
  const continueAfterAdd = useAddToCartNavigation();
  const currency = usePricingStore((s) => s.currency);
  const period = usePricingStore((s) => s.period);

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === categorySlug) ?? null,
    [categories, categorySlug],
  );

  useEffect(() => {
    listCatalogCategories(locale)
      .then(setCategories)
      .catch(() => setCategories([]));
  }, [locale]);

  const loadProducts = useCallback(() => {
    if (!categorySlug) return;
    setLoading(true);
    listCatalogProducts({ category: categorySlug, currency, period })
      .then(setProducts)
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [categorySlug, currency, period]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleBuy = (product: CatalogProduct) => {
    addItem(buildCartItemFromProduct(product));
    toast(tp("addedToCart"), "success");
    continueAfterAdd();
  };

  const popularIndex = products.length >= 2 ? 1 : -1;
  const maxYearlySavings =
    products.length === 0 ? 0 : Math.max(...products.map((p) => p.yearlySavingsPercent ?? 0));

  return (
    <MarketingShell>
      <section className="apple-grouped py-16 sm:py-20">
        <div className="max-w-container-max mx-auto px-5 md:px-8">
          <Link
            href="/#pricing"
            className="mb-6 inline-flex text-sm text-[var(--label-secondary)] hover:text-[var(--accent)]"
          >
            ← {t("backHome")}
          </Link>

          <PlansSectionIntro
            eyebrow={t("eyebrow")}
            title={activeCategory?.name ?? t("title")}
            subtitle={t("subtitle")}
            guarantees={[t("guarantee1"), t("guarantee2"), t("guarantee3")]}
            controls={
              <div className="flex flex-wrap items-center justify-center gap-3">
                <BillingPeriodToggle savingsPercent={maxYearlySavings} className="mb-0" />
                <CurrencySwitcher variant="segmented" />
              </div>
            }
          />

          {categories.length > 1 ? (
            <div className="mb-10 flex justify-center overflow-x-auto pb-1">
              <div className="apple-segmented">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/products/${cat.slug}`}
                    data-active={cat.slug === categorySlug}
                    className="apple-segmented-item"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <LoadingSkeleton key={i} className="rounded-apple-lg h-[26rem]" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-[var(--label-secondary)]">{t("empty")}</p>
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
      </section>
    </MarketingShell>
  );
}
