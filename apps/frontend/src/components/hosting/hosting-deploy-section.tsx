"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { MaterialIcon } from "@/components/landing/material-icon";
import { StatusBadge } from "@/components/ui";
import { LoadingSkeleton } from "@/components/ui/loading-skeleton";
import {
  disconnectGitHub,
  getGitHubConnectUrl,
  getGitHubDeployStatus,
  listGitHubRepos,
  type GitHubRepoSummary,
} from "@/features/hosting/services/github-deploy.service";
import {
  createDeployment,
  checkDeploymentHealth,
  formatEnvVars,
  getDeployment,
  listDeployments,
  redeployApplication,
  updateDeploymentEnv,
  type DeployDomainMode,
  type DeployHealthResult,
  type DeployHealthCheckItem,
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

function healthCheckLabel(id: DeployHealthCheckItem["id"], t: (key: string) => string): string {
  const key = `healthCheck_${id}`;
  try {
    return t(key as "healthCheck_container");
  } catch {
    return id;
  }
}

export function HostingDeploySection({
  accountId,
  primaryDomain,
  enabled,
  embedded = false,
}: {
  accountId: string;
  primaryDomain: string;
  enabled: boolean;
  embedded?: boolean;
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
  const [envEditId, setEnvEditId] = useState<string | null>(null);
  const [envEditText, setEnvEditText] = useState("");
  const [savingEnvId, setSavingEnvId] = useState<string | null>(null);
  const [healthById, setHealthById] = useState<Record<string, DeployHealthResult>>({});
  const [checkingHealthId, setCheckingHealthId] = useState<string | null>(null);
  const [activePanelById, setActivePanelById] = useState<
    Record<string, "logs" | "env" | "health" | null>
  >({});
  const logScrollRef = useRef<HTMLDivElement>(null);
  const stickLogToBottomRef = useRef(true);

  const [name, setName] = useState("");
  const [stack, setStack] = useState<DeployStack>("NEXTJS");
  const [domainMode, setDomainMode] = useState<DeployDomainMode>("SUBDOMAIN");
  const [subdomain, setSubdomain] = useState("app");
  const [repoUrl, setRepoUrl] = useState("");
  const [repoSource, setRepoSource] = useState<"github" | "manual">("github");
  const [selectedGithubRepo, setSelectedGithubRepo] = useState<GitHubRepoSummary | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubLogin, setGithubLogin] = useState<string | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepoSummary[]>([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubConnecting, setGithubConnecting] = useState(false);
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

  const loadGitHubStatus = useCallback(async () => {
    setGithubLoading(true);
    try {
      const status = await getGitHubDeployStatus();
      setGithubConnected(status.connected);
      setGithubLogin(status.githubLogin ?? null);
      if (status.connected) {
        const { repos } = await listGitHubRepos();
        setGithubRepos(repos);
      } else {
        setGithubRepos([]);
      }
    } catch {
      setGithubConnected(false);
      setGithubLogin(null);
      setGithubRepos([]);
    } finally {
      setGithubLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void loadGitHubStatus();
  }, [enabled, loadGitHubStatus]);

  useEffect(() => {
    if (!enabled || !showForm) return;
    if (!githubConnected) void loadGitHubStatus();
  }, [enabled, showForm, githubConnected, loadGitHubStatus]);

  useEffect(() => {
    if (!enabled) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("github") === "connected") {
      toast(t("githubConnected"), "success");
      params.delete("github");
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", next);
      setShowForm(true);
      void loadGitHubStatus();
    }
  }, [enabled, t, loadGitHubStatus]);

  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const data = await listDeployments(accountId);
        setItems(data);
        const running = data.find((i) => i.status === "RUNNING" || i.status === "PENDING");
        setExpandedId((prev) => {
          const focusId = prev ?? running?.id ?? null;
          if (!focusId) return prev;
          const row = data.find((i) => i.id === focusId);
          if (row?.latestRun?.log) setExpandedLog(row.latestRun.log);
          if (running && !prev) {
            setActivePanelById((panels) => ({ ...panels, [running.id]: "logs" }));
          }
          return focusId;
        });
      } catch {
        /* keep polling */
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), 1500);
    return () => window.clearInterval(timer);
  }, [enabled, accountId]);

  useEffect(() => {
    if (expandedId) stickLogToBottomRef.current = true;
  }, [expandedId]);

  useEffect(() => {
    const el = logScrollRef.current;
    if (!el || !stickLogToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [expandedLog]);

  const onLogScroll = () => {
    const el = logScrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickLogToBottomRef.current = distanceFromBottom < 48;
  };

  const onConnectGitHub = async () => {
    setGithubConnecting(true);
    try {
      const returnTo = window.location.href.split("?")[0];
      const url = await getGitHubConnectUrl(returnTo);
      window.location.href = url;
    } catch (err) {
      toast(getApiErrorMessage(err, t("githubConnectFailed")), "error");
      setGithubConnecting(false);
    }
  };

  const onDisconnectGitHub = async () => {
    try {
      await disconnectGitHub();
      setGithubConnected(false);
      setGithubLogin(null);
      setGithubRepos([]);
      setSelectedGithubRepo(null);
      toast(t("githubDisconnected"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, t("githubDisconnectFailed")), "error");
    }
  };

  const onSelectGithubRepo = (fullName: string) => {
    const repo = githubRepos.find((item) => item.fullName === fullName) ?? null;
    setSelectedGithubRepo(repo);
    if (repo) {
      setBranch(repo.defaultBranch);
      setRepoUrl(repo.cloneUrl);
    }
  };

  const parseEnvText = (text: string): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx <= 0) continue;
      result[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1);
    }
    return result;
  };

  const parseEnvVars = (): Record<string, string> => parseEnvText(envText);

  const onCreate = async () => {
    const hasGithubRepo = repoSource === "github" && selectedGithubRepo;
    const hasManualRepo = repoSource === "manual" && repoUrl.trim();
    if (!name.trim() || (!hasGithubRepo && !hasManualRepo)) {
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
        ...(hasGithubRepo
          ? { githubRepoFullName: selectedGithubRepo!.fullName }
          : { repoUrl: repoUrl.trim() }),
        branch: branch.trim() || "main",
        rootDirectory: rootDirectory.trim() || undefined,
        envVars: parseEnvVars(),
      });
      toast(t("created", { domain: created.deployDomain }), "success");
      setShowForm(false);
      setExpandedId(created.id);
      setExpandedLog("");
      await load();
    } catch (err) {
      toast(getApiErrorMessage(err, t("createFailed")), "error");
    } finally {
      setCreating(false);
    }
  };

  const onExpand = async (id: string, forceOpen?: boolean) => {
    const shouldClose = forceOpen === false || (forceOpen !== true && expandedId === id);
    if (shouldClose) {
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
    setExpandedId(id);
    setExpandedLog("");
    setActivePanelById((prev) => ({ ...prev, [id]: "logs" }));
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

  const onOpenEnv = async (id: string, forceOpen?: boolean) => {
    const shouldClose = forceOpen === false || (forceOpen !== true && envEditId === id);
    if (shouldClose) {
      setEnvEditId(null);
      return;
    }
    try {
      const detail = await getDeployment(accountId, id);
      setEnvEditText(formatEnvVars(detail.envVars ?? {}));
      setEnvEditId(id);
    } catch (err) {
      toast(getApiErrorMessage(err, t("loadFailed")), "error");
    }
  };

  const onSaveEnv = async (id: string, redeploy: boolean) => {
    setSavingEnvId(id);
    try {
      await updateDeploymentEnv(accountId, id, parseEnvText(envEditText), redeploy);
      toast(redeploy ? t("envSavedRedeploy") : t("envSavedRestart"), "success");
      setEnvEditId(null);
      if (redeploy) {
        setExpandedId(id);
        setExpandedLog("");
      }
      await load();
    } catch (err) {
      toast(getApiErrorMessage(err, t("envSaveFailed")), "error");
    } finally {
      setSavingEnvId(null);
    }
  };

  const onCheckHealth = async (id: string) => {
    setCheckingHealthId(id);
    try {
      const result = await checkDeploymentHealth(accountId, id);
      setHealthById((prev) => ({ ...prev, [id]: result }));
      toast(result.ok ? t("healthOk") : t("healthFailed"), result.ok ? "success" : "error");
    } catch (err) {
      toast(getApiErrorMessage(err, t("healthCheckFailed")), "error");
    } finally {
      setCheckingHealthId(null);
    }
  };

  const togglePanel = (id: string, panel: "logs" | "env" | "health") => {
    const isOpen = activePanelById[id] === panel;
    const next = isOpen ? null : panel;
    setActivePanelById((prev) => ({ ...prev, [id]: next }));

    if (next === "logs") {
      void onExpand(id, true);
      setEnvEditId((current) => (current === id ? null : current));
      return;
    }
    if (next === "env") {
      void onOpenEnv(id, true);
      setExpandedId((current) => (current === id ? null : current));
      return;
    }
    if (next === "health") {
      void onCheckHealth(id);
      setExpandedId((current) => (current === id ? null : current));
      setEnvEditId((current) => (current === id ? null : current));
      return;
    }

    setExpandedId((current) => (current === id ? null : current));
    setEnvEditId((current) => (current === id ? null : current));
  };

  if (!enabled) return null;

  const newDeployButton = (
    <button
      type="button"
      onClick={() => setShowForm((v) => !v)}
      className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white"
    >
      <MaterialIcon name={showForm ? "close" : "add"} className="text-[18px]" />
      {showForm ? t("cancel") : t("newDeploy")}
    </button>
  );

  const body = (
    <>
      {githubConnected ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[color-mix(in_srgb,var(--accent)_22%,var(--separator))] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <MaterialIcon name="link" className="text-[18px] text-[var(--accent)]" />
            <span className="text-[var(--label-primary)]">
              {t("githubConnectedAs", { login: githubLogin ?? "GitHub" })}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void onDisconnectGitHub()}
            className="text-xs font-medium text-[var(--danger)] hover:underline"
          >
            {t("githubDisconnect")}
          </button>
        </div>
      ) : null}

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

          <div className="space-y-3 rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-[var(--label-primary)]">
                {t("repoSource")}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRepoSource("github")}
                  className={cn(
                    "h-8 rounded-lg px-3 text-xs font-semibold",
                    repoSource === "github"
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--separator)]",
                  )}
                >
                  GitHub
                </button>
                <button
                  type="button"
                  onClick={() => setRepoSource("manual")}
                  className={cn(
                    "h-8 rounded-lg px-3 text-xs font-semibold",
                    repoSource === "manual"
                      ? "bg-[var(--accent)] text-white"
                      : "border border-[var(--separator)]",
                  )}
                >
                  {t("manualRepo")}
                </button>
              </div>
            </div>

            {repoSource === "github" ? (
              <div className="space-y-3">
                {githubLoading ? (
                  <p className="text-xs text-[var(--label-secondary)]">{t("githubLoading")}</p>
                ) : githubConnected ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-[var(--label-secondary)]">
                        {t("githubConnectedAs", { login: githubLogin ?? "GitHub" })}
                      </p>
                      <button
                        type="button"
                        onClick={() => void onDisconnectGitHub()}
                        className="text-xs text-[var(--danger)] hover:underline"
                      >
                        {t("githubDisconnect")}
                      </button>
                    </div>
                    <label className="block space-y-1.5 text-sm">
                      <span className="font-medium text-[var(--label-primary)]">
                        {t("selectRepo")}
                      </span>
                      <select
                        value={selectedGithubRepo?.fullName ?? ""}
                        onChange={(e) => onSelectGithubRepo(e.target.value)}
                        className="h-10 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-3 text-sm"
                      >
                        <option value="">{t("selectRepoPlaceholder")}</option>
                        {githubRepos.map((repo) => (
                          <option key={repo.id} value={repo.fullName}>
                            {repo.fullName}
                            {repo.private ? ` (${t("privateRepo")})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={githubConnecting}
                    onClick={() => void onConnectGitHub()}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--separator)] px-4 text-sm font-semibold disabled:opacity-60"
                  >
                    <MaterialIcon name="link" className="text-[18px]" />
                    {githubConnecting ? t("githubConnecting") : t("connectGitHub")}
                  </button>
                )}
              </div>
            ) : (
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium text-[var(--label-primary)]">{t("repoUrl")}</span>
                <input
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="h-10 w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-3 font-mono text-xs"
                />
              </label>
            )}
          </div>

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
            <p className="text-xs text-[var(--label-tertiary)]">{t("envEditHint")}</p>
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
          {items.map((item) => {
            const isRunning = item.status === "RUNNING" || item.status === "PENDING";
            const activePanel = activePanelById[item.id] ?? null;
            const showLogs = activePanel === "logs";
            const showEnv = activePanel === "env";
            const showHealth = activePanel === "health";
            return (
              <li
                key={item.id}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-[var(--bg-elevated)]",
                  isRunning ? "border-[var(--accent)]/40" : "border-[var(--separator)]",
                )}
              >
                <div className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-[var(--label-primary)]">{item.name}</p>
                        <StatusBadge status={item.status} />
                        <span className="rounded-md bg-[var(--bg-secondary)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--label-tertiary)]">
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
                        {isRunning ? (
                          <span className="ml-2 inline-flex items-center gap-1 text-[var(--accent)]">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent)]" />
                            {t("liveLogs")}
                          </span>
                        ) : null}
                      </p>
                      {item.lastError ? (
                        <p className="mt-2 rounded-lg bg-red-500/10 px-2 py-1.5 text-xs text-[var(--danger)]">
                          {item.lastError}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        disabled={isRunning || redeployingId === item.id}
                        onClick={() => void onRedeploy(item.id)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        <MaterialIcon
                          name="refresh"
                          className={cn("text-[16px]", redeployingId === item.id && "animate-spin")}
                        />
                        {t("redeploy")}
                      </button>
                      <div className="flex rounded-lg border border-[var(--separator)] p-0.5">
                        {item.status === "SUCCESS" ? (
                          <button
                            type="button"
                            disabled={checkingHealthId === item.id || isRunning}
                            onClick={() => togglePanel(item.id, "health")}
                            title={t("healthCheck")}
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-md",
                              showHealth
                                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                                : "text-[var(--label-secondary)] hover:bg-[var(--bg-secondary)]",
                            )}
                          >
                            <MaterialIcon
                              name="monitor_heart"
                              className={cn(
                                "text-[17px]",
                                checkingHealthId === item.id && "animate-pulse",
                              )}
                            />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => togglePanel(item.id, "env")}
                          title={t("editEnv")}
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-md",
                            showEnv
                              ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                              : "text-[var(--label-secondary)] hover:bg-[var(--bg-secondary)]",
                          )}
                        >
                          <MaterialIcon name="tune" className="text-[17px]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => togglePanel(item.id, "logs")}
                          title={showLogs ? t("hideLogs") : t("viewLogs")}
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-md",
                            showLogs
                              ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                              : "text-[var(--label-secondary)] hover:bg-[var(--bg-secondary)]",
                          )}
                        >
                          <MaterialIcon name="terminal" className="text-[17px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {showEnv ? (
                  <div className="border-t border-[var(--separator)] bg-[var(--bg-secondary)] p-4">
                    <div>
                      <p className="text-sm font-medium text-[var(--label-primary)]">
                        {t("envVars")}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--label-tertiary)]">
                        {t("envEditHint")}
                      </p>
                    </div>
                    <textarea
                      value={envEditText}
                      onChange={(e) => setEnvEditText(e.target.value)}
                      rows={5}
                      className="w-full rounded-xl border border-[var(--separator)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs"
                      placeholder={"NEXT_PUBLIC_API_URL=https://api.example.com/api/v1\nPORT=3000"}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={savingEnvId === item.id || isRunning}
                        onClick={() => void onSaveEnv(item.id, false)}
                        className="inline-flex h-9 items-center rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {savingEnvId === item.id ? t("envSaving") : t("envSaveRestart")}
                      </button>
                      <button
                        type="button"
                        disabled={savingEnvId === item.id || isRunning}
                        onClick={() => void onSaveEnv(item.id, true)}
                        className="inline-flex h-9 items-center rounded-lg border border-[var(--separator)] px-3 text-xs font-semibold disabled:opacity-50"
                      >
                        {t("envSaveRedeploy")}
                      </button>
                    </div>
                  </div>
                ) : null}

                {showHealth ? (
                  <div className="space-y-3 border-t border-[var(--separator)] bg-[var(--bg-secondary)] p-4">
                    {checkingHealthId === item.id && !healthById[item.id] ? (
                      <p className="text-sm text-[var(--label-secondary)]">{t("healthChecking")}</p>
                    ) : healthById[item.id] ? (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium text-[var(--label-primary)]">
                            {t("healthTitle")}
                          </p>
                          <span
                            className={cn(
                              "rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase",
                              healthById[item.id].ok
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-amber-500/15 text-amber-600",
                            )}
                          >
                            {healthById[item.id].ok ? t("healthPass") : t("healthWarn")}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] text-[var(--label-tertiary)]">
                          {t("healthPortInfo", {
                            hostPort: healthById[item.id].hostPort,
                            containerPort: healthById[item.id].containerPort,
                          })}
                        </p>
                        <ul className="space-y-2">
                          {healthById[item.id].checks.map((check) => (
                            <li
                              key={check.id}
                              className={cn(
                                "rounded-lg border px-3 py-2 text-xs",
                                check.ok
                                  ? "border-emerald-500/30 bg-emerald-500/5"
                                  : "border-amber-500/30 bg-amber-500/5",
                              )}
                            >
                              <div className="flex items-center gap-2 font-medium text-[var(--label-primary)]">
                                <MaterialIcon
                                  name={check.ok ? "check_circle" : "error"}
                                  className={cn(
                                    "text-[16px]",
                                    check.ok ? "text-emerald-500" : "text-amber-500",
                                  )}
                                />
                                {healthCheckLabel(check.id, t)}
                              </div>
                              <p className="mt-1 pl-6 text-[var(--label-secondary)]">
                                {check.detail}
                              </p>
                            </li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-[var(--label-tertiary)]">
                          {t("healthCheckedAt", {
                            date: formatDate(healthById[item.id].checkedAt, locale),
                          })}
                        </p>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {showLogs ? (
                  <div className="border-t border-[#27272a] bg-[#0f1117]">
                    <div className="flex items-center justify-between border-b border-[#27272a] px-3 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#a1a1aa]">
                        {t("deployLogs")}
                      </span>
                      {isRunning ? (
                        <span className="text-[10px] text-[var(--accent)]">
                          {stageLabel(item.stage, t)}
                        </span>
                      ) : null}
                    </div>
                    <div
                      ref={showLogs ? logScrollRef : undefined}
                      onScroll={showLogs ? onLogScroll : undefined}
                      className="max-h-64 overflow-auto p-3"
                    >
                      <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-[#d4d4d8]">
                        {expandedId === item.id ? expandedLog || t("logWaiting") : t("logWaiting")}
                      </pre>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  if (embedded) {
    return (
      <div className="dashboard-section-card space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-jakarta inline-flex flex-wrap items-center gap-2 text-lg font-bold text-[var(--label-primary)]">
              {t("title")}
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {t("betaBadge")}
              </span>
            </h2>
            <p className="mt-1 text-sm text-[var(--label-secondary)]">
              {t("subtitle", { domain: primaryDomain })}
            </p>
          </div>
          {newDeployButton}
        </div>
        {body}
      </div>
    );
  }

  return (
    <DashboardSectionCard
      title={
        <span className="inline-flex flex-wrap items-center gap-2">
          {t("title")}
          <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {t("betaBadge")}
          </span>
        </span>
      }
      description={t("subtitle", { domain: primaryDomain })}
      icon="rocket_launch"
      actions={newDeployButton}
    >
      {body}
    </DashboardSectionCard>
  );
}
