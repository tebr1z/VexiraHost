"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { listHostingServers, type HostingServer } from "@/features/admin";
import { useAccessTokenReady } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { slugify } from "@/lib/slug";

export type HostingDistributionMode = "FAILOVER" | "BALANCED";

export interface HostingPlanFormValues {
  name: string;
  description: string;
  panel: "CPANEL" | "PLESK";
  serverIds: string[];
  distributionMode: HostingDistributionMode;
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
  serverIds: [],
  distributionMode: "FAILOVER",
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

function formatServerCapacity(server: HostingServer): string {
  if (server.maxAccounts == null) return `${server.accountCount}/∞`;
  return `${server.accountCount}/${server.maxAccounts}`;
}

export function toHostingPlanPayload(values: HostingPlanFormValues) {
  const serverIds = values.serverIds.filter(Boolean);
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    panel: values.panel,
    serverIds,
    serverId: serverIds[0]!,
    distributionMode: values.distributionMode,
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
    listHostingServers()
      .then(setServers)
      .catch(() => undefined);
  }, [accessTokenReady]);

  const matchingServers = useMemo(
    () => servers.filter((server) => server.isActive && server.panel === values.panel),
    [servers, values.panel],
  );

  useEffect(() => {
    const validIds = new Set(matchingServers.map((server) => server.id));
    setValues((prev) => {
      const nextIds = prev.serverIds.filter((id) => validIds.has(id));
      if (nextIds.length === prev.serverIds.length) return prev;
      return { ...prev, serverIds: nextIds };
    });
  }, [matchingServers]);

  const set = (key: keyof HostingPlanFormValues, value: string | boolean | string[]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const toggleServer = (serverId: string) => {
    setValues((prev) => {
      if (prev.serverIds.includes(serverId)) {
        return { ...prev, serverIds: prev.serverIds.filter((id) => id !== serverId) };
      }
      return { ...prev, serverIds: [...prev.serverIds, serverId] };
    });
  };

  const moveServer = (serverId: string, direction: -1 | 1) => {
    setValues((prev) => {
      const index = prev.serverIds.indexOf(serverId);
      if (index < 0) return prev;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.serverIds.length) return prev;
      const next = [...prev.serverIds];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item!);
      return { ...prev, serverIds: next };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (values.serverIds.length === 0) {
      setError(tf("hostingServerRequired"));
      return;
    }

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
  const numericFields: [keyof HostingPlanFormValues, string][] = [
    ["diskGb", tf("diskGb")],
    ["bandwidthGb", tf("bandwidthGb")],
    ["price", tf("pricePerMonth")],
    ["maxDomains", tf("maxDomains")],
    ["maxEmails", tf("maxEmails")],
    ["maxDatabases", tf("maxDatabases")],
  ];

  const orderedSelected = values.serverIds
    .map((id) => matchingServers.find((server) => server.id === id))
    .filter((server): server is HostingServer => Boolean(server));

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
          className={field}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{tf("panel")}</label>
        <select
          value={values.panel}
          onChange={(e) => set("panel", e.target.value)}
          className={`${field} sm:max-w-xs`}
        >
          <option value="CPANEL">cPanel</option>
          <option value="PLESK">Plesk</option>
        </select>
      </div>

      <div className="border-outline-variant/60 bg-surface-container-low/40 space-y-3 rounded-xl border p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("hostingServers")}</label>
          <p className="text-on-surface-variant mb-3 text-xs">{tf("hostingServersHelp")}</p>
          {matchingServers.length === 0 ? (
            <p className="text-error text-xs">{tf("noHostingServersForPanel")}</p>
          ) : (
            <ul className="space-y-2">
              {matchingServers.map((server) => {
                const selected = values.serverIds.includes(server.id);
                const full =
                  server.maxAccounts != null && server.accountCount >= server.maxAccounts;
                return (
                  <li key={server.id}>
                    <label className="border-outline-variant/50 bg-surface flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected}
                        onChange={() => toggleServer(server.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="text-on-surface font-medium">
                          {server.name} · {server.ipAddress}
                        </span>
                        <span className="text-on-surface-variant mt-0.5 block text-xs">
                          {tf("serverCapacity", { capacity: formatServerCapacity(server) })}
                          {full ? ` · ${tf("salesLimitReached")}` : ""}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {orderedSelected.length > 1 ? (
          <div>
            <label className="mb-1 block text-sm font-medium">{tf("serverPriority")}</label>
            <p className="text-on-surface-variant mb-2 text-xs">{tf("serverPriorityHelp")}</p>
            <ol className="space-y-2">
              {orderedSelected.map((server, index) => (
                <li
                  key={server.id}
                  className="border-outline-variant/50 bg-surface flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="text-on-surface-variant w-6 shrink-0">{index + 1}.</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{server.name}</span>
                  <button
                    type="button"
                    className="border-outline-variant rounded-md border px-2 py-1 text-xs disabled:opacity-40"
                    disabled={index === 0}
                    onClick={() => moveServer(server.id, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="border-outline-variant rounded-md border px-2 py-1 text-xs disabled:opacity-40"
                    disabled={index === orderedSelected.length - 1}
                    onClick={() => moveServer(server.id, 1)}
                  >
                    ↓
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-sm font-medium">{tf("distributionMode")}</label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="border-outline-variant/50 bg-surface flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 text-sm">
              <input
                type="radio"
                name="distributionMode"
                className="mt-1"
                checked={values.distributionMode === "FAILOVER"}
                onChange={() => set("distributionMode", "FAILOVER")}
              />
              <span>
                <span className="font-medium">{tf("distributionFailover")}</span>
                <span className="text-on-surface-variant mt-0.5 block text-xs">
                  {tf("distributionFailoverHelp")}
                </span>
              </span>
            </label>
            <label className="border-outline-variant/50 bg-surface flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 text-sm">
              <input
                type="radio"
                name="distributionMode"
                className="mt-1"
                checked={values.distributionMode === "BALANCED"}
                onChange={() => set("distributionMode", "BALANCED")}
              />
              <span>
                <span className="font-medium">{tf("distributionBalanced")}</span>
                <span className="text-on-surface-variant mt-0.5 block text-xs">
                  {tf("distributionBalancedHelp")}
                </span>
              </span>
            </label>
          </div>
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
          <p className="text-on-surface-variant mt-1 text-xs">{tf("pleskPlanNameHelp")}</p>
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
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />
          {tf("active")}
        </label>
        <div>
          <label className="mb-1 block text-sm font-medium">{tf("sortOrder")}</label>
          <input
            value={values.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
            className={`${field} w-24`}
          />
        </div>
      </div>
      {error && <p className="text-error text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading || matchingServers.length === 0}
        className="bg-primary text-on-primary h-11 rounded-xl px-6 text-sm font-semibold disabled:opacity-60"
      >
        {loading ? tf("saving") : submitLabel}
      </button>
    </form>
  );
}
