"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { MaterialIcon } from "@/components/landing/material-icon";
import { StatusBadge } from "@/components/ui";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  createDeployment,
  getDeployment,
  listDeployments,
  redeployApplication,
  type DeployDomainMode,
  type DeployStack,
  type DeploymentSummary,
} from "@/features/hosting/services/hosting-deploy.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/i18n/format";
import { toast } from "@/stores/toast-store";

const STACK_OPTIONS: DeployStack[] = ["NEXTJS", "NESTJS"];

function stageLabel(stage: string | null | undefined, t: (key: string) => string): string {
  if (!stage) return t("stagePending");
  const key = `stage_${stage.replace(/[^a-z0-9_]/gi, "_")}`;
  try {
    return t(key as "stagePending");
  } catch {
    return stage;
  }
}

export function HostingDeploySection({
  accountId,
  primaryDomain,
  enabled,
}: {
  accountId: string;
  primaryDomain: string;
  enabled: boolean;
}): React.ReactElement | null {
  const locale = useLocale();
  const t = useTranslations("dashboard.pages.hosting.deploy");
  const [items, setItems] = useState<DeploymentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string>("");
  const [redeployingId, setRedeployingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [stack, setStack] = useState<DeployStack>("NEXTJS");
  const [domainMode, setDomainMode] = useState<DeployDomainMode>("SUBDOMAIN");
  const [subdomain, setSubdomain] = useState("app");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [rootDirectory, setRootDirectory] = useState("");
  const [envText, setEnvText] = useState("");

  const previewDomain = useMemo(() => {
    if (domainMode === "PRIMARY") return primaryDomain;
    const label = subdomain.trim().toLowerCase() || "app";
    return `${label}.${primaryDomain}`;
  }, [domainMode, subdomain, primaryDomain]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDeployments(accountId);
      setItems(data);
    } catch (err) {
      toast(getApiErrorMessage(err, t("loadFailed")), "error");
    } finally {
      setLoading(false);
    }
  }, [accountId, t]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;
    const active = items.some((item) => item.status === "RUNNING" || item.status === "PENDING");
    if (!active) return;
    const timer = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(timer);
  }, [enabled, items, load]);

  const parseEnvVars = (): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const line of envText.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1);
    }
    return result;
  };

  const onCreate = async () => {
    if (!name.trim() || !repoUrl.trim()) {
      toast(t("validationRequired"), "error");
      return;
    }
    setCreating(true);
    try {
      const created = await createDeployment(accountId, {
        name: name.trim().toLowerCase(),
        stack,
        domainMode,
        subdomain: domainMode === "SUBDOMAIN" ? subdomain.trim().toLowerCase() : undefined,
        repoUrl: repoUrl.trim(),
        branch: branch.trim() || "main",
        rootDirectory: rootDirectory.trim() || undefined,
        envVars: parseEnvVars(),
      });
      toast(t("created", { domain: created.deployDomain }), "success");
      setShowForm(false);
      await load();
    } catch (err) {
      toast(getApiErrorMessage(err, t("createFailed")), "error");
    } finally {
      setCreating(false);
    }
  };

  const onExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedLog("");
      return;
    }
    setExpandedId(id);
    try {
      const detail = await getDeployment(accountId, id);
      const latest = detail.runs[0];
      setExpandedLog(latest?.log ?? "");
    } catch (err) {
      toast(getApiErrorMessage(err, t("loadFailed")), "error");
    }
  };

  const onRedeploy = async (id: string) => {
    setRedeployingId(id);
    try {
      await redeployApplication(accountId, id);
      toast(t("redeployQueued"), "success");
      await load();
    } catch (err) {
      toast(getApiErrorMessage(err, t("redeployFailed")), "error");
    } finally {
      setRedeployingId(null);
    }
  };

  if (!enabled) return null;

  return (
    <DashboardSectionCard
      title={t("title")}
      description={t("subtitle", { domain: primaryDomain })}
      icon="rocket_launch"
      actions={
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white"
        >
          <MaterialIcon name={showForm ? "close" : "add"} className="text-[18px]" />
          {showForm ? t("cancel") : t("newDeploy")}
        </button>
      }
    >
      {showForm ? (
        <div className="mb-6 space-y-4 rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--label-primary)]">{t("projectName")}</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-app"
                className="h-10 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-3"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--label-primary)]">{t("stack")}</span>
              <select
                value={stack}
                onChange={(e) => setStack(e.target.value as DeployStack)}
                className="h-10 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-3"
              >
                {STACK_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`stack_${option}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--label-primary)]">{t("domainMode")}</span>
              <select
                value={domainMode}
                onChange={(e) => setDomainMode(e.target.value as DeployDomainMode)}
                className="h-10 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-3"
              >
                <option value="SUBDOMAIN">{t("domainSubdomain")}</option>
                <option value="PRIMARY">{t("domainPrimary")}</option>
              </select>
            </label>
            {domainMode === "SUBDOMAIN" ? (
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[var(--label-primary)]">{t("subdomain")}</span>
                <div className="flex h-10 overflow-hidden rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)]">
                  <input
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent px-3"
                  />
                  <span className="flex items-center border-l border-[var(--separator)] px-3 text-xs text-[var(--label-secondary)]">
                    .{primaryDomain}
                  </span>
                </div>
              </label>
            ) : (
              <div className="flex items-end text-sm text-[var(--label-secondary)]">
                {t("primaryDomainHint", { domain: primaryDomain })}
              </div>
            )}
          </div>

          <p className="text-xs text-[var(--label-tertiary)]">
            {t("deployUrlPreview")}:{" "}
            <span className="font-mono text-[var(--accent)]">https://{previewDomain}</span>
          </p>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--label-primary)]">{t("repoUrl")}</span>
            <input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              className="h-10 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-3 font-mono text-xs"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--label-primary)]">{t("branch")}</span>
              <input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="h-10 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-3"
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium text-[var(--label-primary)]">{t("rootDirectory")}</span>
              <input
                value={rootDirectory}
                onChange={(e) => setRootDirectory(e.target.value)}
                placeholder="apps/frontend"
                className="h-10 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-3 font-mono text-xs"
              />
            </label>
          </div>

          <label className="block space-y-1.5 text-sm">
            <span className="font-medium text-[var(--label-primary)]">{t("envVars")}</span>
            <textarea
              value={envText}
              onChange={(e) => setEnvText(e.target.value)}
              rows={4}
              placeholder={"DATABASE_URL=...\nAPI_KEY=..."}
              className="w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-3 py-2 font-mono text-xs"
            />
          </label>

          <button
            type="button"
            disabled={creating}
            onClick={() => void onCreate()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white disabled:opacity-60"
          >
            <MaterialIcon
              name="play_arrow"
              className={cn("text-[18px]", creating && "animate-pulse")}
            />
            {creating ? t("creating") : t("startDeploy")}
          </button>
        </div>
      ) : null}

      {loading && items.length === 0 ? (
        <LoadingSkeleton className="h-24 w-full rounded-2xl" />
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--label-secondary)]">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-[var(--label-primary)]">{item.name}</p>
                    <StatusBadge status={item.status} />
                    <span className="rounded-lg bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--label-secondary)]">
                      {t(`stack_${item.stack}`)}
                    </span>
                  </div>
                  <a
                    href={`https://${item.deployDomain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                  >
                    {item.deployDomain}
                    <MaterialIcon name="open_in_new" className="text-[14px]" />
                  </a>
                  <p className="mt-1 text-xs text-[var(--label-tertiary)]">
                    {stageLabel(item.stage, t)}
                    {item.lastDeployedAt
                      ? ` · ${t("lastDeployed", { date: formatDate(item.lastDeployedAt, locale) })}`
                      : null}
                  </p>
                  {item.lastError ? (
                    <p className="mt-2 text-xs text-[var(--danger)]">{item.lastError}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void onExpand(item.id)}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--separator)] px-3 text-xs font-medium"
                  >
                    <MaterialIcon name="terminal" className="text-[16px]" />
                    {expandedId === item.id ? t("hideLogs") : t("viewLogs")}
                  </button>
                  <button
                    type="button"
                    disabled={item.status === "RUNNING" || redeployingId === item.id}
                    onClick={() => void onRedeploy(item.id)}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--separator)] px-3 text-xs font-medium disabled:opacity-50"
                  >
                    <MaterialIcon
                      name="refresh"
                      className={cn("text-[16px]", redeployingId === item.id && "animate-spin")}
                    />
                    {t("redeploy")}
                  </button>
                </div>
              </div>
              {expandedId === item.id && expandedLog ? (
                <pre className="mt-3 max-h-64 overflow-auto rounded-xl bg-[#0f1117] p-3 text-[11px] leading-relaxed text-[#d4d4d8]">
                  {expandedLog}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </DashboardSectionCard>
  );
}
