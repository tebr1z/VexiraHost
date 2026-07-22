"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { listHostingServers, type HostingServer } from "@/features/admin";
import { useAccessTokenReady } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { slugify } from "@/lib/slug";

export interface HostingPlanFormValues {
  name: string;
  description: string;
  panel: "CPANEL" | "PLESK";
  serverId: string;
  diskGb: string;
  bandwidthGb: string;
  maxDomains: string;
  maxEmails: string;
  maxDatabases: string;
  price: string;
  isActive: boolean;
  sortOrder: string;
  pleskPlanName: string;
}

const DEFAULT: HostingPlanFormValues = {
  name: "",
  description: "",
  panel: "CPANEL",
  serverId: "",
  diskGb: "10",
  bandwidthGb: "100",
  maxDomains: "1",
  maxEmails: "5",
  maxDatabases: "2",
  price: "12",
  isActive: true,
  sortOrder: "0",
  pleskPlanName: "",
};

export function toHostingPlanPayload(values: HostingPlanFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    panel: values.panel,
    serverId: values.serverId,
    diskGb: Number(values.diskGb),
    bandwidthGb: Number(values.bandwidthGb),
    maxDomains: Number(values.maxDomains),
    maxEmails: Number(values.maxEmails),
    maxDatabases: Number(values.maxDatabases),
    price: Number(values.price),
    isActive: values.isActive,
    sortOrder: Number(values.sortOrder) || 0,
    pleskPlanName: values.pleskPlanName.trim() || null,
  };
}

export function HostingPlanForm({
  initialValues,
  currentSlug,
  submitLabel,
  onSubmit,
}: {
  initialValues?: Partial<HostingPlanFormValues>;
  currentSlug?: string;
  submitLabel: string;
  onSubmit: (values: HostingPlanFormValues) => Promise<void>;
}): React.ReactElement {
  const tf = useTranslations("admin.forms");
  const accessTokenReady = useAccessTokenReady();
  const [values, setValues] = useState<HostingPlanFormValues>({ ...DEFAULT, ...initialValues });
  const [servers, setServers] = useState<HostingServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seoSlug = useMemo(() => slugify(values.name), [values.name]);

  useEffect(() => {
    if (!accessTokenReady) return;
    listHostingServers().then(setServers).catch(() => undefined);
  }, [accessTokenReady]);

  const matchingServers = useMemo(
    () => servers.filter((server) => server.isActive && server.panel === values.panel),
    [servers, values.panel],
  );

  useEffect(() => {
    if (!values.serverId && matchingServers.length === 1) {
      setValues((prev) => ({ ...prev, serverId: matchingServers[0]!.id }));
      return;
    }

    if (values.serverId && !matchingServers.some((server) => server.id === values.serverId)) {
      setValues((prev) => ({ ...prev, serverId: matchingServers[0]?.id ?? "" }));
    }
  }, [matchingServers, values.serverId]);

  const set = (key: keyof HostingPlanFormValues, value: string | boolean) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.serverId) {
      setError(tf("hostingServerRequired"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(getApiErrorMessage(err, tf("saveFailed")));
    } finally {      setLoading(false);
    }
  };

  const field = "h-11 w-full rounded-xl border border-outline-variant px-4 text-sm";
  const numericFields: [keyof HostingPlanFormValues, string][] = [
    ["diskGb", tf("diskGb")],
    ["bandwidthGb", tf("bandwidthGb")],
    ["price", tf("pricePerMonth")],
    ["maxDomains", tf("maxDomains")],
    ["maxEmails", tf("maxEmails")],
    ["maxDatabases", tf("maxDatabases")],
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-outline-variant/50 bg-surface p-6">
      <div>
        <label className="mb-1 block text-sm font-medium">{tf("name")}</label>
        <input value={values.name} onChange={(e) => set("name", e.target.value)} required className={field} />
        {currentSlug ? (
          <p className="mt-1 text-xs text-on-surface-variant">
            {tf("currentSlug", { slug: currentSlug })}
          </p>
        ) : seoSlug ? (
          <p className="mt-1 text-xs text-on-surface-variant">
            {tf("seoSlugPreview", { slug: seoSlug })}
          </p>
        ) : (
          <p className="mt-1 text-xs text-on-surface-variant">{tf("seoSlugHelp")}</p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{tf("description")}</label>
        <textarea value={values.description} onChange={(e) => set("description", e.target.value)} rows={2} className={field} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("panel")}</label>
          <select
            value={values.panel}
            onChange={(e) => set("panel", e.target.value)}
            className={field}
          >
            <option value="CPANEL">cPanel</option>
            <option value="PLESK">Plesk</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("hostingServer")}</label>
          <select
            value={values.serverId}
            onChange={(e) => set("serverId", e.target.value)}
            required
            className={field}
            disabled={matchingServers.length === 0}
          >
            <option value="">{tf("selectHostingServer")}</option>
            {matchingServers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name} · {server.ipAddress}
              </option>
            ))}
          </select>
          {matchingServers.length === 0 ? (
            <p className="mt-1 text-xs text-error">{tf("noHostingServersForPanel")}</p>
          ) : (
            <p className="mt-1 text-xs text-on-surface-variant">{tf("hostingServerHelp")}</p>
          )}
        </div>
      </div>
      {values.panel === "PLESK" && (
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("pleskPlanName")}</label>
          <input
            value={values.pleskPlanName}
            onChange={(e) => set("pleskPlanName", e.target.value)}
            placeholder={tf("pleskPlanNamePlaceholder")}
            className={field}
          />
          <p className="mt-1 text-xs text-on-surface-variant">{tf("pleskPlanNameHelp")}</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {numericFields.map(([key, label]) => (
          <div key={key}>
            <label className="mb-1 block text-sm font-medium">{label}</label>
            <input
              value={values[key] as string}
              onChange={(e) => set(key, e.target.value)}
              required
              className={field}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={values.isActive} onChange={(e) => set("isActive", e.target.checked)} />
          {tf("active")}
        </label>
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("sortOrder")}</label>
          <input value={values.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} className={`${field} w-24`} />
        </div>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      <button
        type="submit"
        disabled={loading || matchingServers.length === 0}
        className="h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-on-primary disabled:opacity-60"
      >
        {loading ? tf("saving") : submitLabel}
      </button>
    </form>
  );
}
