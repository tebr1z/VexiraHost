"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, LoadingSkeletonList, PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import { listCatalogProducts, type CatalogProduct } from "@/features/catalog";
import { formatMoney } from "@/lib/i18n/format";
import { buildCartItemFromProduct } from "@/lib/cart-pricing";
import { cn } from "@/lib/cn";
import { useCartStore } from "@/stores/cart-store";
import { usePricingStore } from "@/stores/pricing-store";
import { toast } from "@/stores/toast-store";

const CATEGORY_ORDER = [
  "ALL",
  "HOSTING",
  "VPS",
  "DEDICATED",
  "DOMAIN",
  "SSL",
  "EMAIL",
  "LICENSE",
  "BACKUP",
] as const;

export default function DashboardProductsPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.products");
  const th = useTranslations("dashboard.home");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("ALL");
  const addItem = useCartStore((s) => s.addItem);
  const cartCount = useCartStore((s) => s.items.length);
  const currency = usePricingStore((s) => s.currency);
  const period = usePricingStore((s) => s.period);

  useEffect(() => {
    setLoading(true);
    listCatalogProducts({ currency, period })
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [currency, period]);

  const categories = useMemo(() => {
    const present = new Set(products.map((p) => p.category));
    return CATEGORY_ORDER.filter((c) => c === "ALL" || present.has(c));
  }, [products]);

  const filtered = useMemo(
    () => (category === "ALL" ? products : products.filter((p) => p.category === category)),
    [products, category],
  );

  const handleAddToCart = (product: CatalogProduct) => {
    addItem(buildCartItemFromProduct(product));
    toast(tp("addedToCart"), "success");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.products") },
        ]}
        actions={
          <Link
            href="/dashboard/cart"
            className="inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-primary hover:border-primary/30"
          >
            {t("nav.cart")} ({cartCount})
          </Link>
        }
      />

      {!loading && products.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition",
                category === cat
                  ? "bg-primary text-on-primary"
                  : "border border-slate-200 bg-white text-on-surface-variant hover:border-primary/30",
              )}
            >
              {cat === "ALL" ? tp("allCategories") : tp(`categories.${cat}`)}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <LoadingSkeletonList rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState title={tp("empty")} actionLabel={t("nav.cart")} actionHref="/dashboard/cart" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((product) => (
            <article key={product.id} className="panel-card flex flex-col rounded-lg p-5">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="font-jakarta text-lg font-semibold text-primary">{product.name}</h3>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-on-surface-variant">
                  {tp(`categories.${product.category}`)}
                </span>
              </div>
              {product.description && (
                <p className="flex-1 text-sm leading-relaxed text-on-surface-variant">{product.description}</p>
              )}
              <p className="mt-4 font-jakarta text-xl font-bold text-primary">
                {formatMoney(product.price, product.currency, locale)}
                <span className="ml-1 text-sm font-normal text-on-surface-variant">
                  / {product.billingCycle.toLowerCase()}
                </span>
              </p>
              <button
                type="button"
                onClick={() => handleAddToCart(product)}
                className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-semibold text-on-primary hover:bg-primary-dark"
              >
                {th("addToCart")}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
