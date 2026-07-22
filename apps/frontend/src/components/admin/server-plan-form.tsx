"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

export interface ServerPlanFormValues {
  slug: string;
  name: string;
  description: string;
  type: "VPS" | "DEDICATED";
  cpuCores: string;
  ramGb: string;
  diskGb: string;
  bandwidthGbps: string;
  regions: string;
  price: string;
  isActive: boolean;
  sortOrder: string;
}

const DEFAULT: ServerPlanFormValues = {
  slug: "",
  name: "",
  description: "",
  type: "VPS",
  cpuCores: "2",
  ramGb: "4",
  diskGb: "80",
  bandwidthGbps: "1",
  regions: "fra-01, nyc-01, sin-01",
  price: "29",
  isActive: true,
  sortOrder: "0",
};

export function toServerPlanPayload(values: ServerPlanFormValues, includeSlug: boolean) {
  return {
    ...(includeSlug ? { slug: values.slug.trim().toLowerCase() } : {}),
    name: values.name.trim(),
    description: values.description.trim() || undefined,
    type: values.type,
    cpuCores: Number(values.cpuCores),
    ramGb: Number(values.ramGb),
    diskGb: Number(values.diskGb),
    bandwidthGbps: Number(values.bandwidthGbps),
    regions: values.regions.split(",").map((r) => r.trim()).filter(Boolean),
    price: Number(values.price),
    isActive: values.isActive,
    sortOrder: Number(values.sortOrder) || 0,
  };
}

export function ServerPlanForm({
  initialValues,
  includeSlug = true,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<ServerPlanFormValues>;
  includeSlug?: boolean;
  submitLabel: string;
  onSubmit: (values: ServerPlanFormValues) => Promise<void>;
}): React.ReactElement {
  const tf = useTranslations("admin.forms");
  const [values, setValues] = useState<ServerPlanFormValues>({ ...DEFAULT, ...initialValues });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof ServerPlanFormValues, value: string | boolean) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tf("saveFailed");
      setError(msg ?? tf("saveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const field = "h-11 w-full rounded-xl border border-outline-variant px-4 text-sm";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-outline-variant/50 bg-surface p-6">
      {includeSlug && (
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("slug")}</label>
          <input value={values.slug} onChange={(e) => set("slug", e.target.value)} required className={field} />
        </div>
      )}
      <div>
        <label className="mb-1 block text-sm font-medium">{tf("name")}</label>
        <input value={values.name} onChange={(e) => set("name", e.target.value)} required className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("type")}</label>
          <select value={values.type} onChange={(e) => set("type", e.target.value)} className={field}>
            <option value="VPS">VPS</option>
            <option value="DEDICATED">Dedicated</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("pricePerMonth")}</label>
          <input value={values.price} onChange={(e) => set("price", e.target.value)} required className={field} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {(
          [
            ["cpuCores", tf("vcpu")],
            ["ramGb", tf("ramGb")],
            ["diskGb", tf("diskGb")],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            <input
              value={values[key]}
              onChange={(e) => set(key, e.target.value)}
              required
              className={field}
            />
          </div>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{tf("regionsComma")}</label>
        <input value={values.regions} onChange={(e) => set("regions", e.target.value)} className={field} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} />
        {tf("active")}
      </label>
      {error && <p className="text-sm text-error">{error}</p>}
      <button type="submit" disabled={loading} className="h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-on-primary disabled:opacity-60">
        {loading ? tf("saving") : submitLabel}
      </button>
    </form>
  );
}
