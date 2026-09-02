"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { DashboardSectionCard } from "@/components/dashboard/dashboard-section-card";
import { HostingDeploySection } from "@/components/hosting/hosting-deploy-section";
import { HostingMailSection } from "@/components/hosting/hosting-mail-section";
import { ProvisionProgress } from "@/components/hosting/provision-progress";
import { MaterialIcon } from "@/components/landing/material-icon";
import { PageHeader, StatusBadge } from "@/components/ui";
import type { HostingAccount } from "@/features/hosting";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/i18n/format";
import { toast } from "@/stores/toast-store";

type HostingTab = "overview" | "deploy" | "mail";

function formatBytes(bytes: number | null | undefined, locale: string): string {
  if (bytes == null || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })} ${units[unit]}`;
}

function usagePercent(used: number | null, limit: number | null): number | null {
  if (used == null || limit == null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

function UsageMeter({
  label,
  used,
  limit,
  locale,
  icon,
  accentClass,
}: {
  label: string;
  used: number | null;
  limit: number | null;
  locale: string;
  icon: string;
  accentClass: string;
}) {
  const percent = usagePercent(used, limit);
  const isHigh = percent != null && percent > 85;

  return (
    <div className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--label-secondary)]">{label}</p>
          <p className="mt-1 text-base font-bold tabular-nums text-[var(--label-primary)]">
            {formatBytes(used, locale)}
            <span className="ml-1 text-sm font-normal text-[var(--label-tertiary)]">
              / {limit != null && limit > 0 ? formatBytes(limit, locale) : "∞"}
            </span>
          </p>
        </div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            accentClass,
          )}
        >
          <MaterialIcon name={icon} className="text-[18px]" />
        </span>
      </div>
      {percent != null ? (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isHigh ? "bg-amber-500" : "bg-[var(--accent)]",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCell({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-3 py-3 text-center">
      <MaterialIcon name={icon} className="mx-auto text-[20px] text-[var(--accent)]" />
      <p className="mt-1.5 text-lg font-bold tabular-nums text-[var(--label-primary)]">{value}</p>
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--label-tertiary)]">
        {label}
      </p>
    </div>
  );
}

function InfoItem({
  label,
  value,
  mono,
  copyValue,
  onCopy,
  copied,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  copyValue?: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--label-tertiary)]">
        {label}
      </p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p
          className={cn(
            "min-w-0 truncate text-sm font-medium text-[var(--label-primary)]",
            mono && "font-mono text-[13px]",
          )}
        >
          {value}
        </p>
        {copyValue && onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--label-secondary)] hover:bg-[var(--bg-elevated)]"
            aria-label={label}
          >
            <MaterialIcon name={copied ? "check" : "content_copy"} className="text-[15px]" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function HostingDetailView({
  account,
  panelLoading,
  syncLoading,
  retryLoading,
  onPanelLogin,
  onSyncPlesk,
  onRetry,
}: {
  account: HostingAccount;
  panelLoading: boolean;
  syncLoading: boolean;
  retryLoading: boolean;
  onPanelLogin: () => void;
  onSyncPlesk: () => void;
  onRetry: () => void;
}): React.ReactElement {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.hosting");
  const td = useTranslations("dashboard.pages.hosting.deploy");
  const ts = useTranslations("dashboard.pages.services");
  const tprov = useTranslations("dashboard.provision");

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const [activeTab, setActiveTab] = useState<HostingTab>("overview");

  const plesk = account.pleskInfo;
  const isPleskManaged =
    account.panel === "PLESK" &&
    account.status === "ACTIVE" &&
    account.server &&
    account.managementMode !== "MANUAL";

  const showDeployTab = account.panel === "PLESK";
  const showMailTab = Boolean(isPleskManaged);

  const tabs = useMemo(() => {
    const items: { id: HostingTab; label: string; icon: string; badge?: string }[] = [
      { id: "overview", label: tp("tabOverview"), icon: "dashboard" },
    ];
    if (showDeployTab) {
      items.push({ id: "deploy", label: tp("tabDeploy"), icon: "rocket_launch", badge: "Beta" });
    }
    if (showMailTab) {
      items.push({ id: "mail", label: tp("tabMail"), icon: "mail" });
    }
    return items;
  }, [showDeployTab, showMailTab, tp]);

  const pleskStatusLabel =
    plesk?.status === "active"
      ? tp("pleskStatusActive")
      : plesk?.status === "suspended"
        ? tp("pleskStatusSuspended")
        : plesk
          ? tp("pleskStatusUnknown")
          : null;

  const username = account.panelUsername ?? account.username;
  const isPlesk = account.panel === "PLESK";

  const copyText = async (field: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast(tp("detailCopied"), "success");
      window.setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast(tp("detailCopyFailed"), "error");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={account.primaryDomain}
        description={[account.plan.name, account.server?.name].filter(Boolean).join(" · ")}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.hosting"), href: "/dashboard/hosting" },
          { label: account.primaryDomain },
        ]}
      />

      {(account.status === "PROVISIONING" || account.status === "FAILED") && (
        <ProvisionProgress
          stage={account.provisionStage}
          error={account.provisionError}
          status={account.status}
          onRetry={account.status === "FAILED" ? onRetry : undefined}
          retryLoading={retryLoading}
        />
      )}

      {account.status === "SUSPENDED" && (
        <div className="from-amber-500/12 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br to-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700">
              <MaterialIcon name="pause_circle" className="text-[22px]" />
            </span>
            <div>
              <p className="font-semibold text-amber-950 dark:text-amber-100">
                {tc("suspendedTitle")}
              </p>
              <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-50/90">
                {tc("suspendedBody")}
              </p>
              {account.graceEndsAt ? (
                <p className="mt-2 text-xs font-medium text-amber-950 dark:text-amber-100">
                  {tc("graceUntil")}: {formatDate(account.graceEndsAt, locale)}
                </p>
              ) : null}
              <Link
                href={
                  account.renewalInvoiceId
                    ? `/dashboard/invoices/${account.renewalInvoiceId}`
                    : "/dashboard/invoices"
                }
                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white"
              >
                <MaterialIcon name="receipt_long" className="text-[18px]" />
                {tc("payInvoice")}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Compact status bar */}
      <section className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={account.status} />
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                isPlesk
                  ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
                  : "bg-orange-500/12 text-orange-700 dark:text-orange-300",
              )}
            >
              <MaterialIcon name={isPlesk ? "dashboard" : "tune"} className="text-[13px]" />
              {account.panel}
            </span>
            {pleskStatusLabel ? (
              <span className="rounded-full bg-[var(--bg-secondary)] px-2.5 py-0.5 text-[10px] font-semibold text-[var(--label-secondary)]">
                {pleskStatusLabel}
              </span>
            ) : null}
            <a
              href={`https://${account.primaryDomain}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--accent)] hover:underline"
            >
              {account.primaryDomain}
              <MaterialIcon name="open_in_new" className="text-[14px]" />
            </a>
          </div>

          {account.status === "ACTIVE" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={panelLoading}
                onClick={onPanelLogin}
                className="bg-primary text-on-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
              >
                <MaterialIcon name="login" className="text-[18px]" />
                {panelLoading ? tc("opening") : tc("panelLogin")}
              </button>
              {isPleskManaged ? (
                <button
                  type="button"
                  disabled={syncLoading}
                  onClick={onSyncPlesk}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--separator)] px-4 text-sm font-medium disabled:opacity-60"
                >
                  <MaterialIcon
                    name="sync"
                    className={cn("text-[18px]", syncLoading && "animate-spin")}
                  />
                  {syncLoading ? tp("pleskSyncing") : tp("pleskSync")}
                </button>
              ) : null}
            </div>
          ) : account.status === "FAILED" ? (
            <button
              type="button"
              disabled={retryLoading}
              onClick={onRetry}
              className="bg-primary text-on-primary inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
            >
              <MaterialIcon name="refresh" className="text-[18px]" />
              {retryLoading ? tprov("retrying") : tprov("retry")}
            </button>
          ) : null}
        </div>
      </section>

      {/* Tabs */}
      {tabs.length > 1 ? (
        <nav
          className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] p-1"
          aria-label="Hosting sections"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-5",
                activeTab === tab.id
                  ? "bg-[var(--bg-elevated)] text-[var(--label-primary)] shadow-sm"
                  : "text-[var(--label-secondary)] hover:text-[var(--label-primary)]",
              )}
            >
              <MaterialIcon name={tab.icon} className="text-[18px]" />
              <span className="truncate">{tab.label}</span>
              {tab.badge ? (
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      ) : null}

      {/* Overview */}
      {activeTab === "overview" ? (
        <div className="space-y-5">
          <DashboardSectionCard title={tp("planLimitsTitle")} icon="inventory_2">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCell
                icon="language"
                label={tp("detailDomains")}
                value={account.plan.maxDomains}
              />
              <StatCell icon="mail" label={tp("detailMailboxes")} value={account.plan.maxEmails} />
              <StatCell
                icon="storage"
                label={tp("detailStorage")}
                value={`${account.plan.diskGb} GB`}
              />
              <StatCell
                icon="swap_vert"
                label={tp("detailBandwidth")}
                value={`${account.plan.bandwidthGb} GB`}
              />
            </div>
          </DashboardSectionCard>

          {plesk ? (
            <DashboardSectionCard
              title={tp("detailUsageTitle")}
              description={tp("detailUsageDesc")}
              icon="monitoring"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <UsageMeter
                  label={tp("pleskDisk")}
                  used={plesk.diskUsedBytes}
                  limit={plesk.diskLimitBytes}
                  locale={locale}
                  icon="hard_drive"
                  accentClass="bg-violet-500/10 text-violet-600"
                />
                <UsageMeter
                  label={tp("pleskTraffic")}
                  used={plesk.trafficUsedBytes}
                  limit={plesk.trafficLimitBytes}
                  locale={locale}
                  icon="swap_vert"
                  accentClass="bg-cyan-500/10 text-cyan-600"
                />
              </div>
            </DashboardSectionCard>
          ) : isPleskManaged ? (
            <DashboardSectionCard
              title={tp("pleskTitle")}
              description={tp("pleskUnavailable")}
              icon="cloud_off"
            >
              <button
                type="button"
                disabled={syncLoading}
                onClick={onSyncPlesk}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--separator)] px-4 text-sm font-medium disabled:opacity-60"
              >
                <MaterialIcon
                  name="sync"
                  className={cn("text-[18px]", syncLoading && "animate-spin")}
                />
                {syncLoading ? tp("pleskSyncing") : tp("pleskSync")}
              </button>
            </DashboardSectionCard>
          ) : null}

          <DashboardSectionCard title={tp("detailAccountTitle")} icon="badge">
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoItem
                label={tc("username")}
                value={username}
                mono
                copyValue={username}
                copied={copiedField === "username"}
                onCopy={() => void copyText("username", username)}
              />
              <InfoItem label={tc("panel")} value={account.panel} />
              <InfoItem
                label={tc("server")}
                value={account.server?.name ?? account.server?.ipAddress ?? "—"}
              />
              {plesk?.ipAddress ? (
                <InfoItem
                  label={tp("pleskIp")}
                  value={plesk.ipAddress}
                  mono
                  copyValue={plesk.ipAddress}
                  copied={copiedField === "ip"}
                  onCopy={() => void copyText("ip", plesk.ipAddress!)}
                />
              ) : null}
              <InfoItem label={tc("created")} value={formatDate(account.createdAt, locale)} />
              <InfoItem
                label={tc("provisionedAt")}
                value={account.provisionedAt ? formatDate(account.provisionedAt, locale) : "—"}
              />
              {account.expiresAt ? (
                <InfoItem label={ts("expires")} value={formatDate(account.expiresAt, locale)} />
              ) : null}
              {account.panelUrl && account.status === "ACTIVE" ? (
                <div className="rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-3 py-2.5 sm:col-span-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--label-tertiary)]">
                    {tc("directPanelUrl")}
                  </p>
                  <a
                    href={account.panelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 break-all text-sm font-medium text-[var(--accent)] hover:underline"
                  >
                    <MaterialIcon name="open_in_new" className="shrink-0 text-[15px]" />
                    {account.panelUrl}
                  </a>
                </div>
              ) : null}
            </div>

            {plesk && isPleskManaged ? (
              <div className="mt-4 border-t border-[var(--separator)] pt-4">
                <button
                  type="button"
                  onClick={() => setShowTechnical((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--label-secondary)] hover:text-[var(--label-primary)]"
                >
                  <MaterialIcon
                    name={showTechnical ? "expand_less" : "expand_more"}
                    className="text-[18px]"
                  />
                  {showTechnical ? tp("detailHideTechnical") : tp("detailShowTechnical")}
                </button>
                {showTechnical ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <InfoItem
                      label={tp("pleskSubscriptionId")}
                      value={plesk.subscriptionId ?? "—"}
                      mono
                    />
                    <InfoItem label={tp("pleskFtpLogin")} value={plesk.ftpLogin ?? username} mono />
                    <InfoItem label={tp("pleskHostingType")} value={plesk.hostingType ?? "—"} />
                    {plesk.syncedAt ? (
                      <InfoItem
                        label={tp("detailLastSync")}
                        value={formatDate(plesk.syncedAt, locale)}
                      />
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[var(--label-tertiary)]">
                    {tp("detailTechnicalHint")}
                  </p>
                )}
              </div>
            ) : null}

            {account.status === "PROVISIONING" ? (
              <p className="mt-4 text-xs text-[var(--label-tertiary)]">{tc("autoRefreshing")}</p>
            ) : null}
          </DashboardSectionCard>
        </div>
      ) : null}

      {/* Deploy */}
      {activeTab === "deploy" && showDeployTab ? (
        <div id="hosting-deploy">
          {isPleskManaged && account.status === "ACTIVE" && account.plan.autoDeployEnabled ? (
            <HostingDeploySection
              accountId={account.id}
              primaryDomain={account.primaryDomain}
              enabled
              embedded
            />
          ) : (
            <DashboardSectionCard title={td("title")} icon="rocket_launch">
              <p className="text-sm text-[var(--label-secondary)]">
                {account.status === "FAILED"
                  ? td("unavailableFailed")
                  : account.status === "PROVISIONING"
                    ? td("unavailableProvisioning")
                    : !account.plan.autoDeployEnabled
                      ? td("unavailablePlan")
                      : account.status !== "ACTIVE"
                        ? td("unavailableInactive")
                        : td("unavailableProvisioning")}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-[var(--label-tertiary)]">
                <li className="flex items-center gap-2">
                  <MaterialIcon name="check_circle" className="text-[14px] text-[var(--accent)]" />
                  {td("featureGitHub")}
                </li>
                <li className="flex items-center gap-2">
                  <MaterialIcon name="check_circle" className="text-[14px] text-[var(--accent)]" />
                  {td("featureEnv")}
                </li>
                <li className="flex items-center gap-2">
                  <MaterialIcon name="check_circle" className="text-[14px] text-[var(--accent)]" />
                  {td("featureDocker")}
                </li>
              </ul>
            </DashboardSectionCard>
          )}
        </div>
      ) : null}

      {/* Mail */}
      {activeTab === "mail" && showMailTab ? (
        <div id="hosting-mail">
          <HostingMailSection
            accountId={account.id}
            domain={account.primaryDomain}
            enabled
            compact
          />
        </div>
      ) : null}
    </div>
  );
}
