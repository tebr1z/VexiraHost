"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { listAdminHostingPlans, type AdminHostingPlan, type AdminProductPrice } from "@/features/admin";
import { useAccessTokenReady } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { slugify } from "@/lib/slug";

type Currency = "USD" | "EUR" | "AZN";
type Period = "MONTHLY" | "YEARLY";

export interface ProductFormValues {
  name: string;
  description: string;
  category: string;
  hostingPlanSlug: string;
  price: string;
  isActive: boolean;
  sortOrder: string;
  prices: Record<string, { originalPrice: string; salePrice: string }>;
}

const CATEGORIES = ["HOSTING", "VPS", "DEDICATED", "DOMAIN", "LICENSE", "SSL", "EMAIL", "BACKUP"] as const;
const CURRENCIES: Currency[] = ["USD", "EUR", "AZN"];
const PERIODS: Period[] = ["MONTHLY", "YEARLY"];

function priceKey(currency: Currency, period: Period) {
  return `${currency}:${period}`;
}

function defaultPrices(usdMonthly = "12"): ProductFormValues["prices"] {
  const usd = Number(usdMonthly) || 0;
  const eur = Math.round(usd * 0.92 * 100) / 100;
  const azn = Math.round(usd * 1.7 * 100) / 100;
  const values: ProductFormValues["prices"] = {};
  const map: Record<Currency, number> = { USD: usd, EUR: eur, AZN: azn };
  for (const currency of CURRENCIES) {
    const monthly = map[currency];
    values[priceKey(currency, "MONTHLY")] = {
      originalPrice: String(monthly),
      salePrice: String(monthly),
    };
    values[priceKey(currency, "YEARLY")] = {
      originalPrice: String(Math.round(monthly * 12 * 100) / 100),
      salePrice: String(Math.round(monthly * 10 * 100) / 100),
    };
  }
  return values;
}

const DEFAULT: ProductFormValues = {
  name: "",
  description: "",
  category: "HOSTING",
  hostingPlanSlug: "",
  price: "12",
  isActive: true,
  sortOrder: "0",
  prices: defaultPrices("12"),
};

export function pricesFromAdmin(list?: AdminProductPrice[], fallbackUsd = 12): ProductFormValues["prices"] {
  const base = defaultPrices(String(fallbackUsd));
  for (const row of list ?? []) {
    base[priceKey(row.currency, row.period)] = {
      originalPrice: String(row.originalPrice),
      salePrice: String(row.salePrice),
    };
  }
  return base;
}

export function toProductPayload(values: ProductFormValues) {
  const prices: AdminProductPrice[] = [];
  for (const currency of CURRENCIES) {
    for (const period of PERIODS) {
      const cell = values.prices[priceKey(currency, period)];
      prices.push({
        currency,
        period,
        originalPrice: Number(cell?.originalPrice || 0),
        salePrice: Number(cell?.salePrice || 0),
      });
    }
  }

  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    category: values.category,
    hostingPlanSlug: values.category === "HOSTING" ? values.hostingPlanSlug || null : null,
    price: Number(values.price),
    currency: "USD",
    isActive: values.isActive,
    sortOrder: Number(values.sortOrder) || 0,
    prices,
  };
}

export function ProductForm({
  initialValues,
  currentSlug,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<ProductFormValues>;
  currentSlug?: string;
  submitLabel: string;
  onSubmit: (values: ProductFormValues) => Promise<void>;
}): React.ReactElement {
  const tf = useTranslations("admin.forms");
  const accessTokenReady = useAccessTokenReady();
  const [values, setValues] = useState<ProductFormValues>({
    ...DEFAULT,
    ...initialValues,
    prices: initialValues?.prices ?? DEFAULT.prices,
  });
  const [plans, setPlans] = useState<AdminHostingPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seoSlug = useMemo(() => slugify(values.name), [values.name]);

  useEffect(() => {
    if (!accessTokenReady) return;
    listAdminHostingPlans().then(setPlans).catch(() => undefined);
  }, [accessTokenReady]);

  const set = (key: keyof ProductFormValues, value: string | boolean) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const setPriceCell = (key: string, field: "originalPrice" | "salePrice", value: string) => {
    setValues((prev) => ({
      ...prev,
      prices: {
        ...prev.prices,
        [key]: {
          originalPrice: prev.prices[key]?.originalPrice ?? "0",
          salePrice: prev.prices[key]?.salePrice ?? "0",
          [field]: value,
        },
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(getApiErrorMessage(err, tf("saveFailed")));
    } finally {
      setLoading(false);
    }
  };

  const field = "h-11 w-full rounded-xl border border-outline-variant px-4 text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-outline-variant/50 bg-surface p-6">
      <div>
        <label className="mb-1 block text-sm font-medium">{tf("name")}</label>
        <input value={values.name} onChange={(e) => set("name", e.target.value)} required className={field} />
        {currentSlug ? (
          <p className="mt-1 text-xs text-on-surface-variant">{tf("currentSlug", { slug: currentSlug })}</p>
        ) : seoSlug ? (
          <p className="mt-1 text-xs text-on-surface-variant">{tf("seoSlugPreview", { slug: seoSlug })}</p>
        ) : (
          <p className="mt-1 text-xs text-on-surface-variant">{tf("seoSlugHelp")}</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{tf("description")}</label>
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className={field}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("category")}</label>
          <select value={values.category} onChange={(e) => set("category", e.target.value)} className={field}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tf.has(`productCategories.${c}`) ? tf(`productCategories.${c}`) : c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("price")} (USD base)</label>
          <input
            value={values.price}
            onChange={(e) => {
              set("price", e.target.value);
              setValues((prev) => ({ ...prev, price: e.target.value, prices: defaultPrices(e.target.value) }));
            }}
            required
            className={field}
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">USD / EUR / AZN · Monthly / Yearly</h3>
        <div className="overflow-x-auto rounded-xl border border-outline-variant/50">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-container-low text-left">
              <tr>
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2">Period</th>
                <th className="px-3 py-2">Original</th>
                <th className="px-3 py-2">Sale</th>
              </tr>
            </thead>
            <tbody>
              {CURRENCIES.flatMap((currency) =>
                PERIODS.map((period) => {
                  const key = priceKey(currency, period);
                  const cell = values.prices[key] ?? { originalPrice: "0", salePrice: "0" };
                  return (
                    <tr key={key} className="border-t border-outline-variant/40">
                      <td className="px-3 py-2 font-medium">{currency}</td>
                      <td className="px-3 py-2">{period === "MONTHLY" ? "Monthly" : "Yearly"}</td>
                      <td className="px-3 py-2">
                        <input
                          value={cell.originalPrice}
                          onChange={(e) => setPriceCell(key, "originalPrice", e.target.value)}
                          className="h-9 w-28 rounded-lg border border-outline-variant px-2"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={cell.salePrice}
                          onChange={(e) => setPriceCell(key, "salePrice", e.target.value)}
                          className="h-9 w-28 rounded-lg border border-outline-variant px-2"
                        />
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </div>

      {values.category === "HOSTING" && (
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("hostingPlan")}</label>
          <select
            value={values.hostingPlanSlug}
            onChange={(e) => set("hostingPlanSlug", e.target.value)}
            required
            className={field}
          >
            <option value="">{tf("selectPlan")}</option>
            {plans
              .filter((p) => p.serverId)
              .map((p) => (
                <option key={p.id} value={p.slug}>
                  {p.name} · {p.server?.name ?? "—"} ({p.slug})
                </option>
              ))}
          </select>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} />
        {tf("active")}
      </label>
      {error && <p className="text-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-on-primary disabled:opacity-60"
      >
        {loading ? tf("saving") : submitLabel}
      </button>
    </form>
  );
}
