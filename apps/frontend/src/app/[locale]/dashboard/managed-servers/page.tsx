"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  createManagedServer,
  fixManagedServerFinding,
  getManagedServerCatalog,
  installManagedServerFeatures,
  listManagedServers,
  runManagedServerAction,
  type CreateManagedServerInput,
  type ManagedServer,
  type ManagedServerCatalog,
  type ManagedServerFeature,
} from "@/features/managed-servers/managed-servers.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/cn";
import { toast } from "@/stores/toast-store";

const initialForm: CreateManagedServerInput = {
  name: "",
  host: "",
  sshPort: 22,
  sshUsername: "root",
  sshPassword: "",
  packageCode: "WEB_APP",
  selectedFeatures: [],
};

function percent(used: number | null, total: number | null): number {
  if (!used || !total) return 0;
  return Math.min(100, Math.max(0, Math.round((used / total) * 100)));
}

function Metric({
  icon,
  label,
  value,
  progress,
}: {
  icon: string;
  label: string;
  value: string;
  progress?: number;
}) {
  return (
    <div className="bg-[var(--bg-secondary)]/70 rounded-2xl border border-[var(--separator)] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--label-tertiary)]">
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
        {label}
      </div>
      <p className="mt-2 text-lg font-semibold text-[var(--label-primary)]">{value}</p>
      {progress !== undefined ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--fill-tertiary)]">
          <div
            className={cn(
              "h-full rounded-full",
              progress > 85 ? "bg-red-500" : progress > 65 ? "bg-amber-500" : "bg-emerald-500",
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default function ManagedServersPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("managedServers");
  const td = useTranslations("dashboard");
  const [catalog, setCatalog] = useState<ManagedServerCatalog | null>(null);
  const [servers, setServers] = useState<ManagedServer[]>([]);
  const [form, setForm] = useState(initialForm);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [installSelection, setInstallSelection] = useState<Record<string, ManagedServerFeature[]>>(
    {},
  );

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [catalogData, serverData] = await Promise.all([
          getManagedServerCatalog(),
          listManagedServers(),
        ]);
        setCatalog(catalogData);
        setServers(serverData);
      } catch (error) {
        if (!silent) toast(getApiErrorMessage(error, t("loadError")), "error");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const hasActiveTask = servers.some((server) =>
      server.tasks?.some((task) => ["QUEUED", "RUNNING"].includes(task.status)),
    );
    if (!hasActiveTask) return;
    const timer = setInterval(() => void load(true), 4000);
    return () => clearInterval(timer);
  }, [servers, load]);

  const packageFeatures = useMemo(
    () => catalog?.packages.find((item) => item.code === form.packageCode)?.features ?? [],
    [catalog, form.packageCode],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("create");
    try {
      await createManagedServer({
        ...form,
        selectedFeatures: Array.from(new Set([...packageFeatures, ...form.selectedFeatures])),
      });
      setForm(initialForm);
      setShowCreate(false);
      toast(t("created"), "success");
      await load(true);
    } catch (error) {
      toast(getApiErrorMessage(error, t("createError")), "error");
    } finally {
      setBusy(null);
    }
  };

  const runAction = async (
    server: ManagedServer,
    action: "check" | "security-scan" | "optimization-scan",
  ) => {
    setBusy(`${server.id}:${action}`);
    try {
      await runManagedServerAction(server.id, action);
      toast(t("taskStarted"), "success");
      await load(true);
    } catch (error) {
      toast(getApiErrorMessage(error, t("taskError")), "error");
    } finally {
      setBusy(null);
    }
  };

  const install = async (server: ManagedServer) => {
    const features = installSelection[server.id] ?? [];
    if (!features.length) return toast(t("selectFeature"), "error");
    setBusy(`${server.id}:install`);
    try {
      const result = await installManagedServerFeatures(server.id, features);
      toast(result.requiresAdminApproval ? t("waitingApproval") : t("taskStarted"), "success");
      setInstallSelection((state) => ({ ...state, [server.id]: [] }));
      await load(true);
    } catch (error) {
      toast(getApiErrorMessage(error, t("taskError")), "error");
    } finally {
      setBusy(null);
    }
  };

  const fixFinding = async (serverId: string, findingId: string) => {
    setBusy(`${serverId}:fix:${findingId}`);
    try {
      await fixManagedServerFinding(serverId, findingId);
      toast(t("fixStarted"), "success");
      await load(true);
    } catch (error) {
      toast(getApiErrorMessage(error, t("taskError")), "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        title={t("title")}
        description={t("description")}
        breadcrumbs={[{ label: td("nav.dashboard"), href: "/dashboard" }, { label: t("title") }]}
        actions={
          <button
            type="button"
            onClick={() => setShowCreate((value) => !value)}
            className="apple-btn apple-btn-primary px-4 py-2.5 text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            {t("connectServer")}
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        {[
          { icon: "lock", title: t("trustEncrypted"), body: t("trustEncryptedBody") },
          { icon: "terminal", title: t("trustAllowlist"), body: t("trustAllowlistBody") },
          { icon: "verified_user", title: t("trustApproval"), body: t("trustApprovalBody") },
        ].map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4 shadow-sm"
          >
            <span className="material-symbols-outlined text-[22px] text-[var(--accent)]">
              {item.icon}
            </span>
            <h2 className="mt-3 text-sm font-semibold">{item.title}</h2>
            <p className="mt-1 text-xs leading-5 text-[var(--label-secondary)]">{item.body}</p>
          </article>
        ))}
      </section>

      {showCreate ? (
        <form
          onSubmit={submit}
          className="rounded-3xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5 shadow-sm sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{t("formTitle")}</h2>
              <p className="mt-1 text-sm text-[var(--label-secondary)]">{t("formDescription")}</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              {t("encryptedBadge")}
            </span>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t("serverName")}</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="apple-input h-11 w-full"
                placeholder={t("serverNamePlaceholder")}
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t("host")}</span>
              <input
                required
                value={form.host}
                onChange={(e) => setForm({ ...form, host: e.target.value })}
                className="apple-input h-11 w-full"
                placeholder="203.0.113.10"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t("port")}</span>
              <input
                required
                type="number"
                min={1}
                max={65535}
                value={form.sshPort}
                onChange={(e) => setForm({ ...form, sshPort: Number(e.target.value) })}
                className="apple-input h-11 w-full"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t("username")}</span>
              <input
                required
                autoComplete="username"
                value={form.sshUsername}
                onChange={(e) => setForm({ ...form, sshUsername: e.target.value })}
                className="apple-input h-11 w-full"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t("password")}</span>
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={form.sshPassword}
                onChange={(e) => setForm({ ...form, sshPassword: e.target.value })}
                className="apple-input h-11 w-full"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm font-medium">{t("package")}</span>
              <select
                value={form.packageCode}
                onChange={(e) => setForm({ ...form, packageCode: e.target.value })}
                className="apple-input h-11 w-full"
              >
                <option value="CUSTOM">{t("customPackage")}</option>
                {catalog?.packages.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-5">
            <p className="text-sm font-medium">{t("individualTools")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {catalog?.features.map((feature) => {
                const included = packageFeatures.includes(feature);
                const checked = included || form.selectedFeatures.includes(feature);
                return (
                  <label
                    key={feature}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                      checked
                        ? "bg-[var(--accent)]/8 border-[var(--accent)] text-[var(--accent)]"
                        : "border-[var(--separator)]",
                      included && "cursor-default opacity-75",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={included}
                      onChange={() =>
                        setForm({
                          ...form,
                          selectedFeatures: checked
                            ? form.selectedFeatures.filter((item) => item !== feature)
                            : [...form.selectedFeatures, feature],
                        })
                      }
                    />
                    {feature}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-2xl text-xs leading-5 text-[var(--label-secondary)]">
              {t("credentialNotice")}
            </p>
            <button
              disabled={busy === "create"}
              className="apple-btn apple-btn-primary px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {busy === "create" ? t("connecting") : t("saveAndCheck")}
            </button>
          </div>
        </form>
      ) : null}

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map((item) => (
            <div key={item} className="h-80 animate-pulse rounded-3xl bg-[var(--fill-secondary)]" />
          ))}
        </div>
      ) : servers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--separator)] py-16 text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--label-tertiary)]">
            dns
          </span>
          <h2 className="mt-4 font-semibold">{t("emptyTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--label-secondary)]">{t("emptyDescription")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {servers.map((server) => {
            const memory = percent(server.memoryUsedMb, server.memoryTotalMb);
            const disk = percent(server.diskUsedMb, server.diskTotalMb);
            const activeTask = server.tasks?.find((task) =>
              ["QUEUED", "RUNNING", "WAITING_APPROVAL"].includes(task.status),
            );
            const selected =
              installSelection[server.id] ??
              server.selectedFeatures.filter(
                (feature) => !server.installedFeatures.includes(feature),
              );
            return (
              <article
                key={server.id}
                className="overflow-hidden rounded-3xl border border-[var(--separator)] bg-[var(--bg-elevated)] shadow-sm"
              >
                <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--separator)] p-5 sm:p-6">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-1 h-2.5 w-2.5 rounded-full",
                        server.status === "ONLINE"
                          ? "bg-emerald-500"
                          : server.status === "DEGRADED"
                            ? "bg-amber-500"
                            : "bg-red-500",
                      )}
                    />
                    <div>
                      <h2 className="text-lg font-semibold">{server.name}</h2>
                      <p className="mt-1 font-mono text-xs text-[var(--label-secondary)]">
                        {server.sshUsername}@{server.host}:{server.sshPort}
                      </p>
                      <p className="mt-1 text-xs text-[var(--label-tertiary)]">
                        {server.osVersion ?? t("waitingForProbe")}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-[var(--fill-secondary)] px-3 py-1 text-xs font-semibold">
                      {server.packageCode}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold",
                        server.status === "ONLINE"
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                      )}
                    >
                      {server.status}
                    </span>
                  </div>
                </header>
                <div className="p-5 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Metric
                      icon="speed"
                      label="CPU"
                      value={`${server.cpuLoadPercent ?? 0}%`}
                      progress={server.cpuLoadPercent ?? 0}
                    />
                    <Metric
                      icon="memory"
                      label="RAM"
                      value={`${server.memoryUsedMb ?? 0} / ${server.memoryTotalMb ?? 0} MB`}
                      progress={memory}
                    />
                    <Metric
                      icon="hard_drive"
                      label="SSD"
                      value={`${Math.round((server.diskUsedMb ?? 0) / 1024)} / ${Math.round((server.diskTotalMb ?? 0) / 1024)} GB`}
                      progress={disk}
                    />
                    <Metric
                      icon="shield"
                      label={t("securityScore")}
                      value={server.securityScore == null ? "—" : `${server.securityScore}/100`}
                    />
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={Boolean(activeTask || busy)}
                      onClick={() => void runAction(server, "check")}
                      className="apple-btn apple-btn-secondary px-3 py-2 text-xs font-semibold"
                    >
                      <span className="material-symbols-outlined text-[16px]">monitor_heart</span>
                      {t("checkNow")}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(activeTask || busy)}
                      onClick={() => void runAction(server, "security-scan")}
                      className="apple-btn apple-btn-secondary px-3 py-2 text-xs font-semibold"
                    >
                      <span className="material-symbols-outlined text-[16px]">security</span>
                      {t("securityScan")}
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(activeTask || busy)}
                      onClick={() => void runAction(server, "optimization-scan")}
                      className="apple-btn apple-btn-secondary px-3 py-2 text-xs font-semibold"
                    >
                      <span className="material-symbols-outlined text-[16px]">tune</span>
                      {t("optimization")}
                    </button>
                  </div>
                  {activeTask ? (
                    <div className="bg-blue-500/8 mt-4 rounded-2xl border border-blue-500/20 p-4">
                      <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                        {t("activeTask", { type: activeTask.type, status: activeTask.status })}
                      </p>
                      {activeTask.log ? (
                        <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-[var(--label-secondary)]">
                          {activeTask.log}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
                    <section className="rounded-2xl border border-[var(--separator)] p-4">
                      <h3 className="text-sm font-semibold">{t("installTitle")}</h3>
                      <p className="mt-1 text-xs text-[var(--label-secondary)]">
                        {t("installDescription")}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {catalog?.features.map((feature) => {
                          const installed = server.installedFeatures.includes(feature);
                          const checked = selected.includes(feature);
                          return (
                            <label
                              key={feature}
                              className={cn(
                                "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs",
                                installed
                                  ? "bg-emerald-500/8 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                  : checked
                                    ? "bg-[var(--accent)]/8 border-[var(--accent)] text-[var(--accent)]"
                                    : "border-[var(--separator)]",
                              )}
                            >
                              <input
                                type="checkbox"
                                disabled={installed || Boolean(activeTask)}
                                checked={installed || checked}
                                onChange={() =>
                                  setInstallSelection((state) => ({
                                    ...state,
                                    [server.id]: checked
                                      ? selected.filter((item) => item !== feature)
                                      : [...selected, feature],
                                  }))
                                }
                              />
                              {feature}
                              {installed ? ` · ${t("installed")}` : ""}
                            </label>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        disabled={!selected.length || Boolean(activeTask || busy)}
                        onClick={() => void install(server)}
                        className="apple-btn apple-btn-primary mt-4 px-4 py-2 text-xs font-semibold disabled:opacity-50"
                      >
                        {t("installSelected")}
                      </button>
                      <p className="mt-2 text-[11px] leading-4 text-[var(--label-tertiary)]">
                        {t("pleskApproval")}
                      </p>
                    </section>
                    <section className="rounded-2xl border border-[var(--separator)] p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">{t("findingsTitle")}</h3>
                        <span className="rounded-full bg-[var(--fill-secondary)] px-2.5 py-1 text-xs font-semibold">
                          {server.findings?.filter((finding) => finding.status === "OPEN").length ??
                            0}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        {server.findings?.filter((finding) => finding.status === "OPEN").length ? (
                          server.findings
                            .filter((finding) => finding.status === "OPEN")
                            .map((finding) => (
                              <div
                                key={finding.id}
                                className="rounded-xl bg-[var(--bg-secondary)] p-3"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-xs font-semibold">{finding.title}</p>
                                    <p className="mt-1 text-[11px] leading-4 text-[var(--label-secondary)]">
                                      {finding.description}
                                    </p>
                                  </div>
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[10px] font-bold",
                                      ["CRITICAL", "HIGH"].includes(finding.severity)
                                        ? "bg-red-500/10 text-red-700 dark:text-red-300"
                                        : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                                    )}
                                  >
                                    {finding.severity}
                                  </span>
                                </div>
                                {finding.autoFixAvailable ? (
                                  <button
                                    type="button"
                                    disabled={Boolean(activeTask || busy)}
                                    onClick={() => void fixFinding(server.id, finding.id)}
                                    className="mt-2 text-xs font-semibold text-[var(--accent)]"
                                  >
                                    {t("applySafeFix")}
                                  </button>
                                ) : (
                                  <p className="mt-2 text-[10px] text-[var(--label-tertiary)]">
                                    {t("manualReview")}
                                  </p>
                                )}
                              </div>
                            ))
                        ) : (
                          <p className="py-7 text-center text-xs text-[var(--label-tertiary)]">
                            {t("noFindings")}
                          </p>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
