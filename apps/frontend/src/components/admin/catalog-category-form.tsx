"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { slugify } from "@/lib/slug";

export interface CatalogCategoryFormValues {
  slug: string;
  name: string;
  nameAz: string;
  nameEn: string;
  nameTr: string;
  nameRu: string;
  sortOrder: string;
  isActive: boolean;
  systemType: string;
}

const SYSTEM_TYPES = [
  "",
  "HOSTING",
  "VPS",
  "DEDICATED",
  "DOMAIN",
  "LICENSE",
  "SSL",
  "EMAIL",
  "BACKUP",
] as const;

const DEFAULT: CatalogCategoryFormValues = {
  slug: "",
  name: "",
  nameAz: "",
  nameEn: "",
  nameTr: "",
  nameRu: "",
  sortOrder: "0",
  isActive: true,
  systemType: "",
};

export function toCatalogCategoryPayload(values: CatalogCategoryFormValues) {
  const names: Record<string, string> = {};
  if (values.nameAz.trim()) names.az = values.nameAz.trim();
  if (values.nameEn.trim()) names.en = values.nameEn.trim();
  if (values.nameTr.trim()) names.tr = values.nameTr.trim();
  if (values.nameRu.trim()) names.ru = values.nameRu.trim();

  return {
    slug: values.slug.trim().toLowerCase() || slugify(values.name),
    name: values.name.trim(),
    names: Object.keys(names).length ? names : null,
    sortOrder: Number(values.sortOrder) || 0,
    isActive: values.isActive,
    systemType: values.systemType || null,
  };
}

export function catalogCategoryToFormValues(cat: {
  slug: string;
  name: string;
  names: Record<string, string> | null;
  sortOrder: number;
  isActive: boolean;
  systemType: string | null;
}): CatalogCategoryFormValues {
  return {
    slug: cat.slug,
    name: cat.name,
    nameAz: cat.names?.az ?? "",
    nameEn: cat.names?.en ?? "",
    nameTr: cat.names?.tr ?? "",
    nameRu: cat.names?.ru ?? "",
    sortOrder: String(cat.sortOrder),
    isActive: cat.isActive,
    systemType: cat.systemType ?? "",
  };
}

export function CatalogCategoryForm({
  initialValues,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<CatalogCategoryFormValues>;
  submitLabel: string;
  onSubmit: (values: CatalogCategoryFormValues) => Promise<void>;
}) {
  const tf = useTranslations("admin.forms");
  const tp = useTranslations("admin.pages.categories");
  const [values, setValues] = useState<CatalogCategoryFormValues>({
    ...DEFAULT,
    ...initialValues,
  });
  const [saving, setSaving] = useState(false);
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
          <span className="text-on-surface text-sm font-medium">{tp("fieldName")}</span>
          <input
            required
            value={values.name}
            onChange={(e) => {
              const name = e.target.value;
              setValues((v) => ({
                ...v,
                name,
                slug: v.slug || slugify(name),
              }));
            }}
            className={inputClass}
            placeholder="Hosting"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("fieldSlug")}</span>
          <input
            required
            value={values.slug}
            onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value.toLowerCase() }))}
            className={inputClass}
            placeholder="hosting"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["nameAz", "AZ"],
            ["nameEn", "EN"],
            ["nameTr", "TR"],
            ["nameRu", "RU"],
          ] as const
        ).map(([field, label]) => (
          <label key={field} className="block space-y-1">
            <span className="text-on-surface text-sm font-medium">
              {tp("fieldNameLocale", { locale: label })}
            </span>
            <input
              value={values[field]}
              onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
              className={inputClass}
            />
          </label>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tp("fieldSystemType")}</span>
          <select
            value={values.systemType}
            onChange={(e) => setValues((v) => ({ ...v, systemType: e.target.value }))}
            className={inputClass}
          >
            {SYSTEM_TYPES.map((type) => (
              <option key={type || "none"} value={type}>
                {type || tp("systemTypeNone")}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-on-surface text-sm font-medium">{tf("sortOrder")}</span>
          <input
            type="number"
            value={values.sortOrder}
            onChange={(e) => setValues((v) => ({ ...v, sortOrder: e.target.value }))}
            className={inputClass}
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
          />
          {tf("active")}
        </label>
      </div>

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
