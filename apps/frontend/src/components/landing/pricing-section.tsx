"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { CatalogCategoryNav } from "./catalog-category-nav";
import { PricingCard } from "./pricing-card";

import { PlansSectionIntro } from "@/components/hosting/plans-section-intro";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import { useAddToCartNavigation } from "@/features/auth/lib/use-add-to-cart-navigation";
import {
  listCatalogCategories,
  listCatalogProducts,
  type CatalogCategory,
  type CatalogProduct,
} from "@/features/catalog";
import { buildCartItemFromProduct } from "@/lib/cart-pricing";
import { useCartStore } from "@/stores/cart-store";
import { usePricingStore } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

export function PricingSection(): React.ReactElement {
  const locale = useLocale();
  const t = useTranslations("pricing");
  const addItem = useCartStore((s) => s.addItem);
  const continueAfterAdd = useAddToCartNavigation();
  const currency = usePricingStore((s) => s.currency);
  const period = usePricingStore((s) => s.period);
  const reduceMotion = useReducedMotion();

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    setLoadingCategories(true);
    listCatalogCategories(locale)
      .then((items) => {
        // Domain search lives in the hero — keep DOMAIN out of plan categories.
        const visible = items.filter((c) => {
          const key = (c.systemType ?? c.slug).toUpperCase();
          return key !== "DOMAIN" && c.slug.toLowerCase() !== "domain";
        });
        setCategories(visible);
        setActiveCategory((prev) => {
          if (prev && visible.some((c) => c.id === prev)) return prev;
          return visible[0]?.id ?? null;
        });
      })
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, [locale]);

  const loadProducts = useCallback(
    (category: string | null) => {
      if (!category) {
        setProducts([]);
        setLoadingProducts(false);
        return;
      }
      setLoadingProducts(true);
      listCatalogProducts({ category, currency, period })
        .then(setProducts)
        .catch(() => setProducts([]))
        .finally(() => setLoadingProducts(false));
    },
    [currency, period],
  );

  useEffect(() => {
    if (activeCategory) loadProducts(activeCategory);
  }, [activeCategory, loadProducts]);

  const handleBuy = (product: CatalogProduct) => {
    addItem(buildCartItemFromProduct(product));
    toast(t("addedToCart"), "success");
    continueAfterAdd();
  };

  const popularIndex = products.length >= 2 ? 1 : -1;

  return (
    <section className="apple-grouped relative overflow-hidden py-20 sm:py-28" id="pricing">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 opacity-80"
        aria-hidden
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--accent) 6%, transparent), transparent 70%)",
        }}
      />

      <div className="max-w-container-max relative mx-auto px-5 md:px-8">
        <PlansSectionIntro
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          guarantees={[t("guarantee1"), t("guarantee2"), t("guarantee3")]}
          controls={
            loadingCategories ? (
              <LoadingSkeleton className="h-11 w-full max-w-3xl rounded-xl" />
            ) : categories.length > 0 ? (
              <CatalogCategoryNav
                categories={categories}
                activeId={activeCategory}
                onChange={setActiveCategory}
                label={t("title")}
              />
            ) : null
          }
        />

        {loadingProducts ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-[26rem] rounded-[28px]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-[var(--label-secondary)]">{t("emptyProducts")}</p>
        ) : (
          <motion.div
            key={activeCategory ?? "none"}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {products.map((product, index) => (
              <PricingCard
                key={product.id}
                product={product}
                index={index}
                featured={index === popularIndex}
                onSelect={() => handleBuy(product)}
              />
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}
