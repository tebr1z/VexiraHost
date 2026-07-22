"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export interface TldPricingFormValues {
  tld: string;
  registerPrice: string;
  renewPrice: string;
  transferPrice: string;
  isActive: boolean;
  sortOrder: string;
}

const DEFAULT: TldPricingFormValues = {
  tld: "",
  registerPrice: "9.99",
  renewPrice: "9.99",
  transferPrice: "9.99",
  isActive: true,
  sortOrder: "0",
};

export function toTldPricingPayload(values: TldPricingFormValues, includeTld: boolean) {
  return {
    ...(includeTld ? { tld: values.tld.trim().toLowerCase().replace(/^\./, "") } : {}),
    registerPrice: Number(values.registerPrice),
    renewPrice: Number(values.renewPrice),
    transferPrice: Number(values.transferPrice),
    currency: "USD",
    isActive: values.isActive,
    sortOrder: Number(values.sortOrder) || 0,
  };
}

export function TldPricingForm({
  initialValues,
  includeTld = true,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<TldPricingFormValues>;
  includeTld?: boolean;
  submitLabel: string;
  onSubmit: (values: TldPricingFormValues) => Promise<void>;
}) {
  const tf = useTranslations("admin.forms");
  const [values, setValues] = useState<TldPricingFormValues>({ ...DEFAULT, ...initialValues });
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="space-y-4 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-6"
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
      {includeTld && (
        <label className="block space-y-1">
          <span className="text-sm font-medium text-on-surface">{tf("tld")}</span>
          <input
            required
            value={values.tld}
            onChange={(e) => setValues((v) => ({ ...v, tld: e.target.value }))}
            placeholder={tf("tldPlaceholder")}
            className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5"
          />
        </label>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["registerPrice", tf("registerPrice")],
            ["renewPrice", tf("renewPrice")],
            ["transferPrice", tf("transferPrice")],
          ] as const
        ).map(([field, label]) => (
          <label key={field} className="block space-y-1">
            <span className="text-sm font-medium text-on-surface">{label}</span>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={values[field]}
              onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
              className="w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
          />
          {tf("active")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          {tf("sortOrder")}
          <input
            type="number"
            value={values.sortOrder}
            onChange={(e) => setValues((v) => ({ ...v, sortOrder: e.target.value }))}
            className="w-20 rounded-xl border border-outline-variant/40 bg-surface px-3 py-1.5"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-60"
      >
        {saving ? tf("saving") : submitLabel}
      </button>
    </form>
  );
}
