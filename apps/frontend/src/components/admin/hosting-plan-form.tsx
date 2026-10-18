"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { formControlClassName } from "@/components/ui";
import {
  listHostingServers,
  listRemotePleskPlans,
  type HostingServer,
  type PleskRemotePlan,
} from "@/features/admin";
import { useAccessTokenReady } from "@/features/auth";
import { Link } from "@/i18n/navigation";
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
  autoDeployEnabled: boolean;
  autoDeployServerId: string;
  autoDeployDiskGb: string;
  autoDeployCpuPercent: string;
  autoDeployMemoryMb: string;
  autoDeployMaxApps: string;
  autoDeployAiEnabled: boolean;
  autoDeployAiMonthlyCredits: string;
  autoDeploySecurityScanEnabled: boolean;
}

const DEFAULT: HostingPlanFormValues = {
  name: "",
  description: "",
  panel: "PLESK",
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
  autoDeployEnabled: false,
  autoDeployServerId: "",
  autoDeployDiskGb: "1",
  autoDeployCpuPercent: "100",
  autoDeployMemoryMb: "1024",
  autoDeployMaxApps: "1",
  autoDeployAiEnabled: false,
  autoDeployAiMonthlyCredits: "0",
  autoDeploySecurityScanEnabled: true,
};

function formatServerCapacity(server: HostingServer): string {
  const count = server.activeAccountCount ?? Math.max(0, server.accountCount);
  if (server.maxAccounts == null) return `${count}/∞`;
  return `${count}/${server.maxAccounts}`;
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
    autoDeployEnabled: values.autoDeployEnabled,
    autoDeployServerId: values.autoDeployEnabled ? values.autoDeployServerId : null,
    autoDeployDiskGb: Number(values.autoDeployDiskGb),
    autoDeployCpuPercent: Number(values.autoDeployCpuPercent),
    autoDeployMemoryMb: Number(values.autoDeployMemoryMb),
    autoDeployMaxApps: Number(values.autoDeployMaxApps),
    autoDeployAiEnabled: values.autoDeployAiEnabled,
    autoDeployAiMonthlyCredits: Number(values.autoDeployAiMonthlyCredits) || 0,
    autoDeploySecurityScanEnabled: values.autoDeploySecurityScanEnabled,
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
  const tw = useTranslations("admin.forms.serverWorkflow");
  const accessTokenReady = useAccessTokenReady();
  const [values, setValues] = useState<HostingPlanFormValues>({ ...DEFAULT, ...initialValues });
  const [servers, setServers] = useState<HostingServer[]>([]);
  const [serversLoaded, setServersLoaded] = useState(false);
  const [serversError, setServersError] = useState<string | null>(null);
  const [remotePlans, setRemotePlans] = useState<PleskRemotePlan[]>([]);
  const [remotePlansLoading, setRemotePlansLoading] = useState(false);
  const [remotePlansError, setRemotePlansError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seoSlug = useMemo(() => slugify(values.name), [values.name]);

  useEffect(() => {
    if (!accessTokenReady) return;
    let cancelled = false;
    listHostingServers()
      .then((data) => {
        if (cancelled) return;
        setServers(data);
        setServersLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) setServersError(getApiErrorMessage(err, tw("loadServersFailed")));
      });
    return () => {
      cancelled = true;
    };
  }, [accessTokenReady, tw]);

  const matchingServers = useMemo(
    () => servers.filter((server) => server.isActive && server.panel === values.panel),
    [servers, values.panel],
  );

  useEffect(() => {
    if (!serversLoaded) return;
    const validIds = new Set(matchingServers.map((server) => server.id));
    setValues((prev) => {
      const nextIds = prev.serverIds.filter((id) => validIds.has(id));
      if (nextIds.length === prev.serverIds.length) return prev;
      return { ...prev, serverIds: nextIds };
    });
  }, [matchingServers, serversLoaded]);

  useEffect(() => {
    if (!accessTokenReady || values.panel !== "PLESK" || values.serverIds.length === 0) {
      setRemotePlans([]);
      setRemotePlansError(null);
      return;
    }
    let cancelled = false;
    setRemotePlansLoading(true);
    setRemotePlansError(null);
    Promise.all(values.serverIds.map((serverId) => listRemotePleskPlans(serverId)))
      .then((groups) => {
        if (cancelled) return;
        const common = (groups[0] ?? []).filter((plan) =>
          groups.every((group) => group.some((candidate) => candidate.name === plan.name)),
        );
        setRemotePlans(common);
      })
      .catch((err) => {
        if (!cancelled) setRemotePlansError(getApiErrorMessage(err, tf("pleskPlanNameHelp")));
      })
      .finally(() => {
        if (!cancelled) setRemotePlansLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessTokenReady, values.panel, values.serverIds, tf]);

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
    if (!serversLoaded) return;
    if (values.serverIds.length === 0) {
      setError(tf("hostingServerRequired"));
      return;
    }
    if (values.autoDeployEnabled && values.panel !== "PLESK") {
      setError(tf("autoDeployRequiresPlesk"));
      return;
    }
    if (values.autoDeployEnabled && !values.autoDeployServerId) {
      setError(tf("autoDeployServerRequired"));
      return;
    }
    if (values.panel === "PLESK" && !values.pleskPlanName.trim()) {
      setError(tf("pleskPlanNameHelp"));
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

  const field = formControlClassName;
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
  const deployServers = servers.filter((server) => server.isActive && server.deployNodeEnabled);

  return (
    <form
      onSubmit={handleSubmit}
      className="border-outline-variant/50 bg-surface space-y-4 rounded-2xl border p-6"
    >
      <div>
        <label htmlFor="hosting-plan-name" className="mb-1 block text-sm font-medium">
          {tf("name")}
        </label>
        <input
          id="hosting-plan-name"
          minLength={2}
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
        <label htmlFor="hosting-plan-description" className="mb-1 block text-sm font-medium">
          {tf("description")}
        </label>
        <textarea
          id="hosting-plan-description"
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          className={field}
        />
      </div>
      <div>
        <label htmlFor="hosting-plan-panel" className="mb-1 block text-sm font-medium">
          {tf("panel")}
        </label>
        <select
          id="hosting-plan-panel"
          value={values.panel}
          onChange={(e) =>
            setValues((prev) => ({
              ...prev,
              panel: e.target.value as HostingPlanFormValues["panel"],
              autoDeployEnabled: e.target.value === "PLESK" && prev.autoDeployEnabled,
            }))
          }
          className={`${field} sm:max-w-xs`}
        >
          <option value="CPANEL">cPanel</option>
          <option value="PLESK">Plesk</option>
        </select>
      </div>

      <div className="border-outline-variant/60 bg-surface-container-low/40 space-y-3 rounded-xl border p-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            {values.panel === "PLESK" ? tf("pleskServers") : tf("hostingServers")}
          </label>
          <p className="text-on-surface-variant mb-3 text-xs">
            {values.panel === "PLESK" ? tf("pleskServersHelp") : tf("hostingServersHelp")}
          </p>
          {serversError ? (
            <p role="alert" className="text-error text-sm">
              {serversError}
            </p>
          ) : !serversLoaded ? (
            <p className="text-on-surface-variant text-sm">{tw("loadingServers")}</p>
          ) : matchingServers.length === 0 ? (
            <p className="text-error text-xs">{tf("noHostingServersForPanel")}</p>
          ) : (
            <ul className="space-y-2">
              {matchingServers.map((server) => {
                const selected = values.serverIds.includes(server.id);
                const full =
                  server.maxAccounts != null && server.activeAccountCount >= server.maxAccounts;
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
                        <span className="text-on-surface font-medium">{server.name}</span>
                        <span className="text-on-surface-variant mt-0.5 block break-all text-xs">
                          {values.panel === "PLESK"
                            ? tf("pleskPanelUrl", { url: server.hostname })
                            : server.hostname}{" "}
                          · {server.ipAddress}
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
        <div className="border-outline-variant/60 bg-surface-container-low/40 space-y-3 rounded-xl border p-4">
          <label htmlFor="hosting-plan-plesk-name" className="mb-1 block text-sm font-medium">
            {tf("pleskPlanName")}
          </label>
          <select
            id="hosting-plan-plesk-name"
            value={values.pleskPlanName}
            onChange={(e) => {
              const name = e.target.value;
              const remote = remotePlans.find((plan) => plan.name === name);
              setValues((prev) => ({
                ...prev,
                pleskPlanName: name,
                ...(remote
                  ? {
                      diskGb: String(remote.diskGb),
                      bandwidthGb: String(remote.bandwidthGb),
                      maxDomains: String(remote.maxDomains),
                      maxEmails: String(remote.maxEmails),
                      maxDatabases: String(remote.maxDatabases),
                    }
                  : {}),
              }));
            }}
            required
            disabled={remotePlansLoading || values.serverIds.length === 0}
            className={field}
          >
            <option value="">
              {remotePlansLoading ? tw("loadingPlans") : tf("pleskPlanNamePlaceholder")}
            </option>
            {values.pleskPlanName &&
            !remotePlans.some((plan) => plan.name === values.pleskPlanName) ? (
              <option value={values.pleskPlanName}>{values.pleskPlanName}</option>
            ) : null}
            {remotePlans.map((plan) => (
              <option key={plan.name} value={plan.name}>
                {plan.name} · {plan.diskGb} GB · {plan.maxDomains} domain
              </option>
            ))}
          </select>
          <p className="text-on-surface-variant text-xs">{tf("pleskPlanNameHelp")}</p>
          {remotePlansError ? <p className="text-error text-xs">{remotePlansError}</p> : null}
        </div>
      )}

      {values.panel === "PLESK" ? (
        <div className="border-outline-variant/60 bg-surface-container-low/40 space-y-4 rounded-xl border p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={values.autoDeployEnabled}
              onChange={(e) => {
                const enabled = e.target.checked;
                setValues((prev) => ({
                  ...prev,
                  autoDeployEnabled: enabled,
                  autoDeployServerId:
                    prev.autoDeployServerId ||
                    orderedSelected.find((server) => server.deployNodeEnabled)?.id ||
                    "",
                }));
              }}
            />
            <span>
              <span className="font-medium">{tf("autoDeployEnabled")}</span>
              <span className="text-on-surface-variant mt-1 block text-xs">
                {tf("autoDeployEnabledHelp")}
              </span>
            </span>
          </label>
          {values.autoDeployEnabled ? (
            <div className="space-y-4 border-t border-[var(--separator)] pt-4">
              <div>
                <label
                  htmlFor="hosting-plan-deploy-server"
                  className="mb-1 block text-sm font-medium"
                >
                  {tf("autoDeployServer")}
                </label>
                <select
                  id="hosting-plan-deploy-server"
                  value={values.autoDeployServerId}
                  onChange={(e) => set("autoDeployServerId", e.target.value)}
                  className={field}
                  required
                >
                  <option value="">{tf("autoDeployServerPlaceholder")}</option>
                  {deployServers.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.name} · {server.ipAddress} · {server.deployHealth}
                    </option>
                  ))}
                </select>
                <p className="text-on-surface-variant mt-2 text-xs">{tw("separateQuotas")}</p>
                {serversLoaded && deployServers.length === 0 ? (
                  <p className="text-error mt-2 text-xs">
                    {tw("noDeployServers")}{" "}
                    <Link
                      href="/t4abriz/panel/hosting/servers/new"
                      className="font-semibold underline"
                    >
                      {tw("addServer")}
                    </Link>
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["autoDeployCpuPercent", "cpuLimit", 10, 3200],
                    ["autoDeployMemoryMb", "memoryLimit", 128, 262144],
                  ] as const
                ).map(([key, label, min, max]) => (
                  <label key={key} className="block text-xs font-medium">
                    <span className="mb-1 block">{tw(label)}</span>
                    <input
                      type="number"
                      required
                      min={min}
                      max={max}
                      step={1}
                      value={values[key]}
                      onChange={(event) => set(key, event.target.value)}
                      className={field}
                    />
                  </label>
                ))}
                <div>
                  <label
                    htmlFor="hosting-plan-deploy-disk"
                    className="mb-1 block text-xs font-medium"
                  >
                    {tf("autoDeployDiskGb")}
                  </label>
                  <input
                    id="hosting-plan-deploy-disk"
                    type="number"
                    min={1}
                    required
                    value={values.autoDeployDiskGb}
                    onChange={(e) => set("autoDeployDiskGb", e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label
                    htmlFor="hosting-plan-deploy-apps"
                    className="mb-1 block text-xs font-medium"
                  >
                    {tf("autoDeployMaxApps")}
                  </label>
                  <input
                    id="hosting-plan-deploy-apps"
                    type="number"
                    min={1}
                    required
                    value={values.autoDeployMaxApps}
                    onChange={(e) => set("autoDeployMaxApps", e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <label
                    htmlFor="hosting-plan-ai-credits"
                    className="mb-1 block text-xs font-medium"
                  >
                    {tf("autoDeployAiCredits")}
                  </label>
                  <input
                    id="hosting-plan-ai-credits"
                    type="number"
                    min={0}
                    value={values.autoDeployAiMonthlyCredits}
                    onChange={(e) => set("autoDeployAiMonthlyCredits", e.target.value)}
                    className={field}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <p className="text-on-surface-variant w-full text-xs leading-relaxed">
                  {tw("resourceLimitsHint")}
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.autoDeployAiEnabled}
                    onChange={(e) => set("autoDeployAiEnabled", e.target.checked)}
                  />
                  {tf("autoDeployAiEnabled")}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={values.autoDeploySecurityScanEnabled}
                    onChange={(e) => set("autoDeploySecurityScanEnabled", e.target.checked)}
                  />
                  {tf("autoDeploySecurityScanEnabled")}
                </label>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {numericFields.map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`hosting-plan-${key}`} className="mb-1 block text-sm font-medium">
              {label}
            </label>
            <input
              id={`hosting-plan-${key}`}
              type="number"
              min={["maxEmails", "maxDatabases", "price"].includes(key) ? 0 : 1}
              step={key === "price" ? "0.01" : "1"}
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
          <label htmlFor="hosting-plan-sort" className="mb-1 block text-sm font-medium">
            {tf("sortOrder")}
          </label>
          <input
            id="hosting-plan-sort"
            type="number"
            value={values.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
            className={`${field} w-24`}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-error text-sm">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={
          loading ||
          !serversLoaded ||
          matchingServers.length === 0 ||
          (values.autoDeployEnabled && deployServers.length === 0)
        }
        className="bg-primary text-on-primary h-11 rounded-xl px-6 text-sm font-semibold disabled:opacity-60"
      >
        {loading ? tf("saving") : submitLabel}
      </button>
    </form>
  );
}
