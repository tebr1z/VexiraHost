"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { PricingCard } from "./pricing-card";

import { PlansSectionIntro } from "@/components/hosting/plans-section-intro";
import { MaterialIcon } from "@/components/landing/material-icon";
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

const CATEGORY_ICONS: Record<string, string> = {
  HOSTING: "language",
  VPS: "memory",
  DEDICATED: "dns",
  DOMAIN: "public",
  WHATSAPP_API: "chat",
  SSL: "verified_user",
  EMAIL: "mail",
  LICENSE: "key",
  BACKUP: "backup",
};

function categoryIcon(category: CatalogCategory): string {
  return CATEGORY_ICONS[(category.systemType ?? category.slug).toUpperCase()] ?? "deployed_code";
}

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
        setCategories(items);
        setActiveCategory((prev) => {
          if (prev && items.some((c) => c.id === prev)) return prev;
          return items[0]?.id ?? null;
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
    <section className="apple-grouped py-20 sm:py-28" id="pricing">
      <div className="max-w-container-max mx-auto px-5 md:px-8">
        <PlansSectionIntro
          eyebrow={t("eyebrow")}
          title={t("title")}
          subtitle={t("subtitle")}
          guarantees={[t("guarantee1"), t("guarantee2"), t("guarantee3")]}
          controls={
            loadingCategories ? (
              <LoadingSkeleton className="h-10 w-56 rounded-xl" />
            ) : categories.length > 0 ? (
              <div className="w-full">
                <div
                  className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:hidden"
                  role="tablist"
                  aria-label={t("title")}
                >
                  {categories.map((cat) => (
                    <motion.button
                      key={cat.id}
                      type="button"
                      role="tab"
                      aria-selected={cat.id === activeCategory}
                      data-active={cat.id === activeCategory}
                      onClick={() => setActiveCategory(cat.id)}
                      whileTap={reduceMotion ? undefined : { scale: 0.96 }}
                      className="flex shrink-0 snap-start items-center gap-2 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm font-semibold text-[var(--label-secondary)] shadow-sm transition-colors data-[active=true]:border-[color-mix(in_srgb,var(--accent)_35%,var(--separator))] data-[active=true]:bg-[color-mix(in_srgb,var(--accent)_10%,var(--bg-elevated))] data-[active=true]:text-[var(--accent)]"
                    >
                      <MaterialIcon name={categoryIcon(cat)} className="text-[18px] opacity-70" />
                      <span>{cat.name}</span>
                    </motion.button>
                  ))}
                </div>

                <div
                  className="hidden max-w-full gap-1 overflow-x-auto rounded-[20px] border border-[color-mix(in_srgb,var(--separator)_85%,transparent)] bg-[color-mix(in_srgb,var(--bg-secondary)_82%,transparent)] p-1.5 sm:flex"
                  role="tablist"
                  aria-label={t("title")}
                >
                  {categories.map((cat) => (
                    <motion.button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveCategory(cat.id)}
                      role="tab"
                      aria-selected={cat.id === activeCategory}
                      whileHover={reduceMotion ? undefined : { y: -2 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                      className="group relative flex min-w-[104px] flex-1 items-center justify-center gap-2 overflow-hidden rounded-[14px] px-3 py-2.5 text-sm font-semibold text-[var(--label-secondary)] transition-colors hover:text-[var(--label)] data-[active=true]:text-[var(--accent)]"
                      data-active={cat.id === activeCategory}
                    >
                      {cat.id === activeCategory && (
                        <motion.span
                          layoutId="active-catalog-category"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          className="absolute inset-0 rounded-[14px] border border-[color-mix(in_srgb,var(--accent)_25%,var(--separator))] bg-[var(--bg-elevated)] shadow-[0_8px_20px_color-mix(in_srgb,var(--accent)_12%,transparent)]"
                        />
                      )}
                      <MaterialIcon
                        name={categoryIcon(cat)}
                        className="relative text-[18px] text-[var(--label-tertiary)] transition-colors group-data-[active=true]:text-[var(--accent)]"
                      />
                      <span className="relative whitespace-nowrap">{cat.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : null
          }
        />

        {loadingProducts ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <LoadingSkeleton key={i} className="rounded-apple-lg h-[26rem]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-[var(--label-secondary)]">{t("emptyProducts")}</p>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {products.map((product, index) => (
              <PricingCard
                key={product.id}
                product={product}
                index={index}
                featured={index === popularIndex}
                onSelect={() => handleBuy(product)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
