"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { CatalogCategoryNav } from "./catalog-category-nav";
import { HomeIcon } from "./home-icon";
import { PricingCard } from "./pricing-card";

import { BillingPeriodToggle } from "@/components/layout/billing-period-toggle";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAddToCartNavigation } from "@/features/auth/lib/use-add-to-cart-navigation";
import {
  listCatalogCategories,
  listCatalogProducts,
  type CatalogCategory,
  type CatalogProduct,
} from "@/features/catalog";
import { listHostingPlans, type HostingPlan } from "@/features/hosting";
import { Link, useRouter } from "@/i18n/navigation";
import { buildCartItemFromProduct } from "@/lib/cart-pricing";
import { cn } from "@/lib/cn";
import { filterCatalogProductsForPeriod } from "@/lib/hosting-catalog";
import { useCartStore } from "@/stores/cart-store";
import { usePricingStore } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

function visibleCategories(items: CatalogCategory[]) {
  return items.filter(
    (item) => !["DOMAIN", "SSL", "BACKUP"].includes((item.systemType ?? item.slug).toUpperCase()),
  );
}

type PricingInitialData = {
  categories: CatalogCategory[];
  products: CatalogProduct[];
  plans: HostingPlan[];
};

export function PricingSection({
  initialData,
}: {
  initialData?: PricingInitialData;
}): React.ReactElement {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("pricing");
  const th = useTranslations("homeRedesign");
  const addItem = useCartStore((s) => s.addItem);
  const continueAfterAdd = useAddToCartNavigation();
  const currency = usePricingStore((s) => s.currency);
  const period = usePricingStore((s) => s.period);
  const initialCategories = initialData ? visibleCategories(initialData.categories) : [];
  const [categories, setCategories] = useState<CatalogCategory[]>(initialCategories);
  const [activeCategory, setActiveCategory] = useState<string | null>(
    initialCategories.find((item) => item.systemType === "HOSTING")?.id ??
      initialCategories[0]?.id ??
      null,
  );
  const [products, setProducts] = useState<CatalogProduct[]>(initialData?.products ?? []);
  const [plans, setPlans] = useState<HostingPlan[]>(initialData?.plans ?? []);
  const [loadingCategories, setLoadingCategories] = useState(!initialData);
  const [loadingProducts, setLoadingProducts] = useState(!initialData);
  const [categoryError, setCategoryError] = useState(false);
  const [productError, setProductError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const loadError = categoryError || productError;

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listCatalogCategories(locale), listHostingPlans()])
      .then(([categoryRows, planRows]) => {
        if (cancelled) return;
        const visible = visibleCategories(categoryRows);
        setCategories(visible);
        setPlans(planRows);
        setCategoryError(false);
        if (visible.length === 0) {
          setProducts([]);
          setLoadingProducts(false);
        }
        setActiveCategory((current) =>
          visible.some((item) => item.id === current)
            ? current
            : (visible.find((item) => item.systemType === "HOSTING")?.id ?? visible[0]?.id ?? null),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setCategoryError(true);
          setLoadingProducts(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingCategories(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, retryKey]);

  useEffect(() => {
    if (!activeCategory) return;
    let cancelled = false;
    setLoadingProducts(true);
    setProductError(false);
    void listCatalogProducts({ category: activeCategory, currency, period })
      .then((rows) => {
        if (!cancelled) setProducts(filterCatalogProductsForPeriod(rows, period));
      })
      .catch(() => {
        if (!cancelled) {
          setProductError(true);
          setProducts([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCategory, currency, period, retryKey]);

  const planBySlug = useMemo(() => new Map(plans.map((plan) => [plan.slug, plan])), [plans]);
  const active = categories.find((category) => category.id === activeCategory);
  const isHosting = (active?.systemType ?? active?.slug)?.toUpperCase() === "HOSTING";
  const savingsPercent = Math.max(
    0,
    ...products.map((product) => product.yearlySavingsPercent ?? 0),
  );
  const visibleProducts = products.slice(0, 4);

  function handleBuy(product: CatalogProduct) {
    if (product.requiresQuote) {
      router.push("/contact");
      return;
    }
    addItem(buildCartItemFromProduct(product));
    toast(t("addedToCart"), "success");
    continueAfterAdd();
  }

  return (
    <section
      className="home-pricing home-section"
      id="pricing"
      aria-labelledby="home-pricing-title"
    >
      <div className="home-container">
        <div className="home-section-heading home-pricing-heading">
          <div>
            <p className="home-eyebrow">{th("pricingEyebrow")}</p>
            <h2 id="home-pricing-title">{th("pricingTitle")}</h2>
            <p>{th("pricingDescription")}</p>
          </div>
          {(active?.systemType ?? active?.slug)?.toUpperCase() !== "LICENSE" &&
          products.some((product) => product.billingCycle !== "ONE_TIME") ? (
            <BillingPeriodToggle savingsPercent={savingsPercent} className="home-billing-toggle" />
          ) : null}
        </div>
        {loadingCategories ? (
          <LoadingSkeleton className="mb-8 h-12 w-full rounded-xl" />
        ) : (
          <CatalogCategoryNav
            categories={categories}
            activeId={activeCategory}
            onChange={setActiveCategory}
            label={t("eyebrow")}
          />
        )}
        <div
          className={cn(
            "home-plan-grid",
            visibleProducts.length === 3 && "home-plan-grid-three",
            visibleProducts.length <= 2 && "home-plan-grid-small",
          )}
          aria-busy={loadingProducts && !loadError}
          aria-live="polite"
        >
          {loadError ? (
            <div className="home-pricing-empty">
              <p>{th("loadFailed")}</p>
              <button
                type="button"
                className="home-text-link"
                onClick={() => setRetryKey((value) => value + 1)}
              >
                {th("retry")}
                <HomeIcon name="arrow" />
              </button>
            </div>
          ) : loadingProducts ? (
            Array.from({ length: 4 }).map((_, index) => (
              <LoadingSkeleton key={index} className="h-[29rem] rounded-[20px]" />
            ))
          ) : products.length === 0 ? (
            <p className="home-pricing-empty">{t("emptyProducts")}</p>
          ) : (
            visibleProducts.map((product, index) => (
              <PricingCard
                key={product.id}
                product={product}
                index={index}
                plan={
                  isHosting && product.hostingPlanSlug
                    ? planBySlug.get(product.hostingPlanSlug)
                    : undefined
                }
                featured={products.length > 1 && index === 1}
                onSelect={() => handleBuy(product)}
              />
            ))
          )}
        </div>
        {isHosting && !loadError ? (
          <div className="home-pricing-footnote">
            <p>
              <HomeIcon name="shield" />
              <span>
                {th("included")}: <strong>{t("categoryFeatures.HOSTING.f1")}</strong> ·{" "}
                {t("categoryFeatures.HOSTING.f2")} · {t("categoryFeatures.HOSTING.f3")}
              </span>
            </p>
            <Link href="/hosting" className="home-text-link">
              {th("allPlans")}
              <HomeIcon name="arrow" />
            </Link>
          </div>
        ) : null}
        {!isHosting && active && products.length > 4 && !loadingProducts ? (
          <div className="home-pricing-footnote">
            <Link href={`/products/${active.slug}`} className="home-text-link">
              {th("viewAllProducts", { count: products.length })}
              <HomeIcon name="arrow" />
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
