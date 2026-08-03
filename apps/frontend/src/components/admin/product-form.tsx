"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import {
  listAdminHostingPlans,
  listAdminCatalogCategories,
  type AdminCatalogCategory,
  type AdminHostingPlan,
  type AdminProductPrice,
} from "@/features/admin";
import { useAccessTokenReady } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { slugify } from "@/lib/slug";

type Currency = "USD" | "EUR" | "AZN";
type Period = "MONTHLY" | "YEARLY";
type DeliveryMode = "NONE" | "LICENSE_KEY" | "FILE" | "KEY_AND_FILE" | "MANUAL";

export interface ProductFormValues {
  name: string;
  description: string;
  category: string;
  catalogCategoryId: string;
  hostingPlanSlug: string;
  price: string;
  isActive: boolean;
  sortOrder: string;
  prices: Record<string, { originalPrice: string; salePrice: string }>;
  deliveryMode: DeliveryMode;
  isFree: boolean;
  licenseKeys: string;
  downloadUrl: string;
  downloadFileName: string;
  promoText: string;
  activationGuideText: string;
  activationGuideImageUrl: string;
  activationGuideVideoUrl: string;
}

const CATEGORIES = [
  "HOSTING",
  "VPS",
  "DEDICATED",
  "DOMAIN",
  "LICENSE",
  "SSL",
  "EMAIL",
  "BACKUP",
] as const;
const CURRENCIES: Currency[] = ["USD", "EUR", "AZN"];
const PERIODS: Period[] = ["MONTHLY", "YEARLY"];
const DELIVERY_MODES: DeliveryMode[] = ["MANUAL", "LICENSE_KEY", "FILE", "KEY_AND_FILE", "NONE"];

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
  catalogCategoryId: "",
  hostingPlanSlug: "",
  price: "12",
  isActive: true,
  sortOrder: "0",
  prices: defaultPrices("12"),
  deliveryMode: "MANUAL",
  isFree: false,
  licenseKeys: "",
  downloadUrl: "",
  downloadFileName: "",
  promoText: "",
  activationGuideText: "",
  activationGuideImageUrl: "",
  activationGuideVideoUrl: "",
};

export function pricesFromAdmin(
  list?: AdminProductPrice[],
  fallbackUsd = 12,
): ProductFormValues["prices"] {
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

  const isLicense = values.category === "LICENSE";

  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    category: values.category,
    catalogCategoryId: values.catalogCategoryId || null,
    hostingPlanSlug: values.category === "HOSTING" ? values.hostingPlanSlug || null : null,
    price: values.isFree && isLicense ? 0 : Number(values.price),
    currency: "USD",
    billingCycle: values.isFree && isLicense ? "ONE_TIME" : "MONTHLY",
    isActive: values.isActive,
    sortOrder: Number(values.sortOrder) || 0,
    prices,
    deliveryMode: isLicense ? values.deliveryMode : "NONE",
    isFree: isLicense ? values.isFree : false,
    licenseKeys: isLicense ? values.licenseKeys.trim() || null : null,
    downloadUrl: isLicense ? values.downloadUrl.trim() || null : null,
    downloadFileName: isLicense ? values.downloadFileName.trim() || null : null,
    promoText: isLicense ? values.promoText.trim() || null : null,
    activationGuideText: isLicense ? values.activationGuideText.trim() || null : null,
    activationGuideImageUrl: isLicense ? values.activationGuideImageUrl.trim() || null : null,
    activationGuideVideoUrl: isLicense ? values.activationGuideVideoUrl.trim() || null : null,
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
  const [catalogCategories, setCatalogCategories] = useState<AdminCatalogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seoSlug = useMemo(() => slugify(values.name), [values.name]);
  const isHosting = values.category === "HOSTING";
  const isLicense = values.category === "LICENSE";
  const needsKey = values.deliveryMode === "LICENSE_KEY" || values.deliveryMode === "KEY_AND_FILE";
  const needsFile =
    values.deliveryMode === "FILE" ||
    values.deliveryMode === "KEY_AND_FILE" ||
    values.deliveryMode === "MANUAL";

  useEffect(() => {
    if (!accessTokenReady) return;
    listAdminHostingPlans()
      .then(setPlans)
      .catch(() => undefined);
    listAdminCatalogCategories()
      .then(setCatalogCategories)
      .catch(() => undefined);
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
  const area = "w-full rounded-xl border border-outline-variant px-4 py-3 text-sm";

  return (
    <form
      onSubmit={handleSubmit}
      className="border-outline-variant/50 bg-surface space-y-4 rounded-2xl border p-6"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">{tf("name")}</label>
        <input
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          required
          className={field}
        />
        {currentSlug ? (
          <p className="text-on-surface-variant mt-1 text-xs">
            {tf("currentSlug", { slug: currentSlug })}
          </p>
        ) : seoSlug ? (
          <p className="text-on-surface-variant mt-1 text-xs">
            {tf("seoSlugPreview", { slug: seoSlug })}
          </p>
        ) : (
          <p className="text-on-surface-variant mt-1 text-xs">{tf("seoSlugHelp")}</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{tf("description")}</label>
        <textarea
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className={area}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("catalogCategory")}</label>
          <select
            value={values.catalogCategoryId}
            onChange={(e) => {
              const id = e.target.value;
              const selected = catalogCategories.find((c) => c.id === id);
              setValues((prev) => ({
                ...prev,
                catalogCategoryId: id,
                category: selected?.systemType || prev.category,
              }));
            }}
            className={field}
          >
            <option value="">{tf.has("selectCategory") ? tf("selectCategory") : "—"}</option>
            {catalogCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("category")}</label>
          <select
            value={values.category}
            onChange={(e) => set("category", e.target.value)}
            className={field}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {tf.has(`productCategories.${c}`) ? tf(`productCategories.${c}`) : c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isHosting && (
        <div className="border-outline-variant/60 bg-surface-container-low/40 space-y-3 rounded-xl border p-4">
          <h3 className="text-sm font-semibold">{tf("hostingSection")}</h3>
          <p className="text-on-surface-variant text-xs">{tf("hostingSectionHint")}</p>
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
        </div>
      )}

      {isLicense && (
        <div className="border-outline-variant/60 bg-surface-container-low/40 space-y-4 rounded-xl border p-4">
          <div>
            <h3 className="text-sm font-semibold">{tf("licenseSection")}</h3>
            <p className="text-on-surface-variant mt-1 text-xs">{tf("licenseSectionHint")}</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.isFree}
              onChange={(e) => {
                const free = e.target.checked;
                setValues((prev) => ({
                  ...prev,
                  isFree: free,
                  price: free ? "0" : prev.price === "0" ? "12" : prev.price,
                  prices: free ? defaultPrices("0") : prev.prices,
                }));
              }}
            />
            {tf("isFreeApp")}
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium">{tf("deliveryMode")}</label>
            <select
              value={values.deliveryMode}
              onChange={(e) => set("deliveryMode", e.target.value)}
              className={field}
            >
              {DELIVERY_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {tf(`deliveryModes.${mode}`)}
                </option>
              ))}
            </select>
          </div>

          {needsKey && (
            <div>
              <label className="mb-1 block text-sm font-medium">{tf("licenseKeys")}</label>
              <textarea
                value={values.licenseKeys}
                onChange={(e) => set("licenseKeys", e.target.value)}
                rows={4}
                placeholder={tf("licenseKeysPlaceholder")}
                className={area}
              />
              <p className="text-on-surface-variant mt-1 text-xs">{tf("licenseKeysHelp")}</p>
            </div>
          )}

          {needsFile && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium">{tf("downloadUrl")}</label>
                <input
                  value={values.downloadUrl}
                  onChange={(e) => set("downloadUrl", e.target.value)}
                  placeholder="https://..."
                  className={field}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">{tf("downloadFileName")}</label>
                <input
                  value={values.downloadFileName}
                  onChange={(e) => set("downloadFileName", e.target.value)}
                  placeholder="app-setup.exe"
                  className={field}
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">{tf("promoText")}</label>
            <textarea
              value={values.promoText}
              onChange={(e) => set("promoText", e.target.value)}
              rows={3}
              placeholder={tf("promoTextPlaceholder")}
              className={area}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{tf("activationGuideText")}</label>
            <textarea
              value={values.activationGuideText}
              onChange={(e) => set("activationGuideText", e.target.value)}
              rows={4}
              placeholder={tf("activationGuideTextPlaceholder")}
              className={area}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {tf("activationGuideImageUrl")}
              </label>
              <input
                value={values.activationGuideImageUrl}
                onChange={(e) => set("activationGuideImageUrl", e.target.value)}
                placeholder="https://.../guide.png"
                className={field}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                {tf("activationGuideVideoUrl")}
              </label>
              <input
                value={values.activationGuideVideoUrl}
                onChange={(e) => set("activationGuideVideoUrl", e.target.value)}
                placeholder="https://youtube.com/..."
                className={field}
              />
            </div>
          </div>
        </div>
      )}

      {!values.isFree && (
        <>
          <div>
            <label className="mb-1 block text-sm font-medium">{tf("price")} (USD base)</label>
            <input
              value={values.price}
              onChange={(e) => {
                set("price", e.target.value);
                setValues((prev) => ({
                  ...prev,
                  price: e.target.value,
                  prices: defaultPrices(e.target.value),
                }));
              }}
              required
              className={field}
            />
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">USD / EUR / AZN · Monthly / Yearly</h3>
            <div className="border-outline-variant/50 overflow-x-auto rounded-xl border">
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
                        <tr key={key} className="border-outline-variant/40 border-t">
                          <td className="px-3 py-2 font-medium">{currency}</td>
                          <td className="px-3 py-2">
                            {period === "MONTHLY" ? "Monthly" : "Yearly"}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={cell.originalPrice}
                              onChange={(e) => setPriceCell(key, "originalPrice", e.target.value)}
                              className="border-outline-variant h-9 w-28 rounded-lg border px-2"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              value={cell.salePrice}
                              onChange={(e) => setPriceCell(key, "salePrice", e.target.value)}
                              className="border-outline-variant h-9 w-28 rounded-lg border px-2"
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
        </>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => set("isActive", e.target.checked)}
        />
        {tf("active")}
      </label>
      {error && <p className="text-error text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="bg-primary text-on-primary h-11 rounded-xl px-6 text-sm font-semibold disabled:opacity-60"
      >
        {loading ? tf("saving") : submitLabel}
      </button>
    </form>
  );
}
