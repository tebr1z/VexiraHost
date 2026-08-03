"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { listAdminProducts, type AdminProduct } from "@/features/admin";

export interface PromoCodeFormValues {
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  currency: "USD" | "EUR" | "AZN";
  maxDiscountAmount: string;
  minOrderAmount: string;
  startsAt: string;
  endsAt: string;
  maxRedemptions: string;
  maxPerUser: string;
  isActive: boolean;
  appliesToAll: boolean;
  productIds: string[];
  categories: string[];
}

const CATEGORIES = [
  "DOMAIN",
  "HOSTING",
  "VPS",
  "DEDICATED",
  "LICENSE",
  "SSL",
  "EMAIL",
  "BACKUP",
] as const;

const DEFAULT: PromoCodeFormValues = {
  code: "",
  type: "PERCENT",
  value: "20",
  currency: "AZN",
  maxDiscountAmount: "50",
  minOrderAmount: "",
  startsAt: "",
  endsAt: "",
  maxRedemptions: "",
  maxPerUser: "1",
  isActive: true,
  appliesToAll: true,
  productIds: [],
  categories: [],
};

function toIsoOrNull(local: string): string | null {
  if (!local.trim()) return null;
  const date = new Date(local);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function fromIso(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toPromoCodePayload(values: PromoCodeFormValues) {
  const maxDiscount =
    values.type === "PERCENT" && values.maxDiscountAmount.trim()
      ? Number(values.maxDiscountAmount)
      : null;
  const minOrder = values.minOrderAmount.trim() ? Number(values.minOrderAmount) : null;

  return {
    code: values.code.trim().toUpperCase(),
    type: values.type,
    value: Number(values.value),
    currency:
      values.type === "FIXED" || maxDiscount != null || minOrder != null ? values.currency : null,
    maxDiscountAmount: maxDiscount,
    minOrderAmount: minOrder,
    startsAt: toIsoOrNull(values.startsAt),
    endsAt: toIsoOrNull(values.endsAt),
    maxRedemptions: values.maxRedemptions.trim() ? Number(values.maxRedemptions) : null,
    maxPerUser: values.maxPerUser.trim() ? Number(values.maxPerUser) : null,
    isActive: values.isActive,
    appliesToAll: values.appliesToAll,
    productIds: values.appliesToAll ? [] : values.productIds,
    categories: values.appliesToAll ? [] : values.categories,
  };
}

export function promoCodeToFormValues(promo: {
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  currency: string | null;
  maxDiscountAmount: number | null;
  minOrderAmount: number | null;
  startsAt: string | null;
  endsAt: string | null;
  maxRedemptions: number | null;
  maxPerUser: number | null;
  isActive: boolean;
  appliesToAll: boolean;
  productIds: string[];
  categories: string[];
}): PromoCodeFormValues {
  return {
    code: promo.code,
    type: promo.type,
    value: String(promo.value),
    currency: (promo.currency as PromoCodeFormValues["currency"]) || "AZN",
    maxDiscountAmount: promo.maxDiscountAmount != null ? String(promo.maxDiscountAmount) : "",
    minOrderAmount: promo.minOrderAmount != null ? String(promo.minOrderAmount) : "",
    startsAt: fromIso(promo.startsAt),
    endsAt: fromIso(promo.endsAt),
    maxRedemptions: promo.maxRedemptions != null ? String(promo.maxRedemptions) : "",
    maxPerUser: promo.maxPerUser != null ? String(promo.maxPerUser) : "",
    isActive: promo.isActive,
    appliesToAll: promo.appliesToAll,
    productIds: promo.productIds,
    categories: promo.categories,
  };
}

export function PromoCodeForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<PromoCodeFormValues>;
  submitLabel: string;
  onSubmit: (values: PromoCodeFormValues) => Promise<void>;
}) {
  const tf = useTranslations("admin.forms");
  const tp = useTranslations("admin.pages.promoCodes");
  const [values, setValues] = useState<PromoCodeFormValues>({
    ...DEFAULT,
    ...initialValues,
  });
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<AdminProduct[]>([]);

  useEffect(() => {
    listAdminProducts()
      .then(setProducts)
      .catch(() => setProducts([]));
  }, []);

  const inputClass = "w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5";

  return (
    <form
      className="border-outline-variant/30 bg-surface-container-low space-y-4 rounded-2xl border p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
          await onSubmit(values);
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("fieldCode")}</span>
          <input
            required
            value={values.code}
            onChange={(e) => setValues((v) => ({ ...v, code: e.target.value.toUpperCase() }))}
            className={inputClass}
            placeholder="PROMO20"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("fieldType")}</span>
          <select
            value={values.type}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                type: e.target.value as PromoCodeFormValues["type"],
              }))
            }
            className={inputClass}
          >
            <option value="PERCENT">{tp("typePercent")}</option>
            <option value="FIXED">{tp("typeFixed")}</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("fieldValue")}</span>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={values.value}
            onChange={(e) => setValues((v) => ({ ...v, value: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("fieldCurrency")}</span>
          <select
            value={values.currency}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                currency: e.target.value as PromoCodeFormValues["currency"],
              }))
            }
            className={inputClass}
          >
            <option value="AZN">AZN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </label>
        {values.type === "PERCENT" ? (
          <label className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">{tp("fieldMaxDiscount")}</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={values.maxDiscountAmount}
              onChange={(e) => setValues((v) => ({ ...v, maxDiscountAmount: e.target.value }))}
              className={inputClass}
              placeholder="50"
            />
          </label>
        ) : (
          <div />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("fieldMinOrder")}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.minOrderAmount}
            onChange={(e) => setValues((v) => ({ ...v, minOrderAmount: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("fieldMaxPerUser")}</span>
          <input
            type="number"
            min="1"
            value={values.maxPerUser}
            onChange={(e) => setValues((v) => ({ ...v, maxPerUser: e.target.value }))}
            className={inputClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("fieldStartsAt")}</span>
          <input
            type="datetime-local"
            value={values.startsAt}
            onChange={(e) => setValues((v) => ({ ...v, startsAt: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("fieldEndsAt")}</span>
          <input
            type="datetime-local"
            value={values.endsAt}
            onChange={(e) => setValues((v) => ({ ...v, endsAt: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("fieldMaxRedemptions")}</span>
          <input
            type="number"
            min="1"
            value={values.maxRedemptions}
            onChange={(e) => setValues((v) => ({ ...v, maxRedemptions: e.target.value }))}
            className={inputClass}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
        />
        {tf("active")}
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.appliesToAll}
          onChange={(e) => setValues((v) => ({ ...v, appliesToAll: e.target.checked }))}
        />
        {tp("fieldAppliesToAll")}
      </label>

      {!values.appliesToAll ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="space-y-2">
            <legend className="text-on-surface text-sm font-medium">{tp("fieldCategories")}</legend>
            <div className="border-outline-variant/30 max-h-40 space-y-1 overflow-y-auto rounded-xl border p-3">
              {CATEGORIES.map((cat) => (
                <label key={cat} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.categories.includes(cat)}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        categories: e.target.checked
                          ? [...v.categories, cat]
                          : v.categories.filter((c) => c !== cat),
                      }))
                    }
                  />
                  {cat}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-on-surface text-sm font-medium">{tp("fieldProducts")}</legend>
            <div className="border-outline-variant/30 max-h-40 space-y-1 overflow-y-auto rounded-xl border p-3">
              {products.map((product) => (
                <label key={product.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.productIds.includes(product.id)}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        productIds: e.target.checked
                          ? [...v.productIds, product.id]
                          : v.productIds.filter((id) => id !== product.id),
                      }))
                    }
                  />
                  {product.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
      >
        {saving ? tf("saving") : submitLabel}
      </button>
    </form>
  );
}
