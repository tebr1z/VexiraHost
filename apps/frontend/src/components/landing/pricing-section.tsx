"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  listCatalogCategories,
  listCatalogProducts,
  type CatalogCategory,
  type CatalogProduct,
} from "@/features/catalog";
import { useCartStore } from "@/stores/cart-store";
import { buildCartItemFromProduct } from "@/lib/cart-pricing";
import { usePricingStore } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

import { MaterialIcon } from "./material-icon";
import { PricingCard } from "./pricing-card";

export function PricingSection(): React.ReactElement {
  const router = useRouter();
  const t = useTranslations("pricing");
  const tCat = useTranslations("dashboard.pages.products.categories");
  const addItem = useCartStore((s) => s.addItem);
  const currency = usePricingStore((s) => s.currency);
  const period = usePricingStore((s) => s.period);

  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    listCatalogCategories()
      .then((items) => {
        setCategories(items);
        if (items[0]) setActiveCategory(items[0].id);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoadingCategories(false));
  }, []);

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
    router.push("/cart");
  };

  const popularIndex = products.length >= 2 ? 1 : -1;

  return (
    <section className="apple-grouped py-20 sm:py-28" id="pricing">
      <div className="mx-auto max-w-container-max px-5 md:px-8">
        <div className="mb-12 text-center">
          <h2 className="apple-section-title">{t("title")}</h2>
          <p className="apple-section-subtitle mx-auto mt-4">{t("subtitle")}</p>
        </div>

        <div className="mb-10 flex flex-wrap items-center justify-center gap-5 text-sm text-[var(--label-secondary)]">
          {[t("guarantee1"), t("guarantee2"), t("guarantee3")].map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5">
              <MaterialIcon name="verified" className="text-[16px] text-[var(--accent)]" />
              {item}
            </span>
          ))}
        </div>

        {loadingCategories ? (
          <div className="mb-10 flex justify-center">
            <LoadingSkeleton className="h-9 w-72 rounded-[9px]" />
          </div>
        ) : categories.length > 0 ? (
          <div className="mb-12 flex justify-center overflow-x-auto pb-1">
            <div className="apple-segmented">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  data-active={cat.id === activeCategory}
                  onClick={() => setActiveCategory(cat.id)}
                  className="apple-segmented-item"
                >
                  {tCat(cat.id as never)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {loadingProducts ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-[26rem] rounded-apple-lg" />
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
