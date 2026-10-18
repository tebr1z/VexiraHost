"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PlansSectionIntro } from "@/components/hosting/plans-section-intro";
import { PricingCard } from "@/components/landing/pricing-card";
import { BillingPeriodToggle } from "@/components/layout/billing-period-toggle";
import { MarketingShell } from "@/components/layout/marketing-shell";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAddToCartNavigation } from "@/features/auth/lib/use-add-to-cart-navigation";
import {
  listCatalogCategories,
  listCatalogProducts,
  type CatalogCategory,
  type CatalogProduct,
} from "@/features/catalog";
import { Link, useRouter } from "@/i18n/navigation";
import { buildCartItemFromProduct } from "@/lib/cart-pricing";
import { cn } from "@/lib/cn";
import { filterCatalogProductsForPeriod } from "@/lib/hosting-catalog";
import { useCartStore } from "@/stores/cart-store";
import { usePricingStore } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

export default function CategoryProductsPage(): React.ReactElement {
  const params = useParams();
  const categorySlug = params.categorySlug as string;
  const locale = useLocale();
  const router = useRouter();
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
      .then((items) => setProducts(filterCatalogProductsForPeriod(items, period)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [categorySlug, currency, period]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleBuy = (product: CatalogProduct) => {
    if (product.requiresQuote) {
      router.push("/contact");
      return;
    }
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
        <div className="public-catalog-container">
          <Link
            href="/#pricing"
            className="mb-6 inline-flex text-sm text-[var(--label-secondary)] hover:text-[var(--accent)]"
          >
            ← {t("backHome")}
          </Link>

          <PlansSectionIntro
            headingLevel={1}
            eyebrow={t("eyebrow")}
            title={activeCategory?.name ?? t("title")}
            subtitle={t("subtitle")}
            guarantees={[t("guarantee1"), t("guarantee2"), t("guarantee3")]}
            controls={
              <div className="flex flex-wrap items-center justify-center gap-3">
                {activeCategory?.systemType !== "LICENSE" &&
                products.some(
                  (product) =>
                    product.category !== "LICENSE" && product.billingCycle !== "ONE_TIME",
                ) ? (
                  <BillingPeriodToggle savingsPercent={maxYearlySavings} className="mb-0" />
                ) : null}
              </div>
            }
          />

          {categories.length > 1 ? (
            <nav className="public-catalog-nav" aria-label={t("title")}>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/products/${cat.slug}`}
                  aria-current={cat.slug === categorySlug ? "page" : undefined}
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
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
