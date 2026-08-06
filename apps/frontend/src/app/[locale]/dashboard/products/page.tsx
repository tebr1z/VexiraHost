"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { EmptyState, LoadingSkeletonList, PageHeader } from "@/components/ui";
import { claimFreeAddon } from "@/features/addons";
import { useRequireAuth } from "@/features/auth";
import { listCatalogProducts, type CatalogProduct } from "@/features/catalog";
import { Link } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { buildCartItemFromProduct } from "@/lib/cart-pricing";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/i18n/format";
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
  "WHATSAPP_API",
] as const;

export default function DashboardProductsPage(): React.ReactElement | null {
  useRequireAuth();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tp = useTranslations("dashboard.pages.products");
  const th = useTranslations("dashboard.home");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
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

  const handleClaimFree = async (product: CatalogProduct) => {
    setClaimingId(product.id);
    try {
      await claimFreeAddon(product.id);
      toast(tp("freeClaimed"), "success");
      router.push("/dashboard/services");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("freeClaimFailed")), "error");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.products") },
        ]}
        actions={
          <Link href="/dashboard/cart" className="dashboard-btn-secondary">
            {t("nav.cart")} ({cartCount})
          </Link>
        }
      />

      {!loading && products.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-2 shadow-sm">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200",
                category === cat
                  ? "shadow-[var(--accent)]/15 bg-[var(--accent)] text-white shadow-md"
                  : "text-[var(--label-secondary)] hover:bg-[var(--fill-secondary)] hover:text-[var(--label-primary)]",
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
            <article
              key={product.id}
              className="hover:border-[var(--accent)]/20 group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="font-jakarta text-lg font-bold text-[var(--label-primary)]">
                  {product.name}
                </h3>
                <span className="shrink-0 rounded-full border border-[var(--separator)] bg-[var(--fill-secondary)] px-2.5 py-1 text-[11px] font-semibold text-[var(--label-secondary)]">
                  {tp(`categories.${product.category}`)}
                </span>
              </div>
              {product.description && (
                <p className="flex-1 text-sm leading-relaxed text-[var(--label-secondary)]">
                  {product.description}
                </p>
              )}
              {product.promoText && (
                <p className="mt-2 text-sm text-[var(--label-secondary)]">{product.promoText}</p>
              )}
              <p className="font-jakarta mt-5 text-2xl font-bold tracking-tight text-[var(--label-primary)]">
                {product.isFree
                  ? tp("free")
                  : `${formatMoney(product.price, product.currency, locale)}`}
                {!product.isFree && (
                  <span className="ml-1 text-sm font-normal text-[var(--label-secondary)]">
                    / {product.billingCycle.toLowerCase()}
                  </span>
                )}
              </p>
              {product.isFree ? (
                <button
                  type="button"
                  disabled={claimingId === product.id}
                  onClick={() => void handleClaimFree(product)}
                  className="dashboard-btn-primary mt-5 w-full disabled:opacity-60"
                >
                  {claimingId === product.id ? tp("claiming") : tp("getFree")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleAddToCart(product)}
                  className="dashboard-btn-primary mt-5 w-full"
                >
                  {th("addToCart")}
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
