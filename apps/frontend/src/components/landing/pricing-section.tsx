"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

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
              <LoadingSkeleton className="h-9 w-72 rounded-[9px]" />
            ) : categories.length > 0 ? (
              <div className="apple-segmented max-w-full overflow-x-auto">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    data-active={cat.id === activeCategory}
                    onClick={() => setActiveCategory(cat.id)}
                    className="apple-segmented-item"
                  >
                    {cat.name}
                  </button>
                ))}
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
