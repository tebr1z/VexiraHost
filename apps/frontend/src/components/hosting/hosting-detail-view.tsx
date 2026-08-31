"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

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
    <div className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--label-secondary)]">
            {label}
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-[var(--label-primary)]">
            {formatBytes(used, locale)}
            <span className="ml-1 text-sm font-normal text-[var(--label-secondary)]">
              / {limit != null && limit > 0 ? formatBytes(limit, locale) : "∞"}
            </span>
          </p>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            accentClass,
          )}
        >
          <MaterialIcon name={icon} className="text-[20px]" />
        </span>
      </div>
      {percent != null ? (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-secondary)]">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isHigh ? "bg-amber-500" : "bg-[var(--accent)]",
              )}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--label-tertiary)]">{percent}%</p>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({
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
    <div className="flex items-start justify-between gap-4 border-b border-[var(--separator)] py-3 first:pt-0 last:border-0 last:pb-0">
      <span className="shrink-0 text-sm text-[var(--label-secondary)]">{label}</span>
      <div className="flex min-w-0 items-center gap-2 text-right">
        <span
          className={cn(
            "truncate text-sm font-medium text-[var(--label-primary)]",
            mono && "font-mono text-[13px]",
          )}
        >
          {value}
        </span>
        {copyValue && onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--separator)] text-[var(--label-secondary)] transition hover:bg-[var(--bg-secondary)]"
            aria-label={label}
          >
            <MaterialIcon name={copied ? "check" : "content_copy"} className="text-[16px]" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CapacityPill({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-3 py-2.5">
      <MaterialIcon name={icon} className="text-[18px] text-[var(--accent)]" />
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--label-tertiary)]">
          {label}
        </p>
        <p className="text-sm font-bold text-[var(--label-primary)]">{value}</p>
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
  const ts = useTranslations("dashboard.pages.services");
  const tprov = useTranslations("dashboard.provision");

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);

  const plesk = account.pleskInfo;
  const isPleskManaged =
    account.panel === "PLESK" &&
    account.status === "ACTIVE" &&
    account.server &&
    account.managementMode !== "MANUAL";

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

  const scrollToMail = () => {
    document.getElementById("hosting-mail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-6">
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
        />
      )}

      {account.status === "SUSPENDED" && (
        <div className="from-amber-500/12 overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br to-amber-500/5 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-700">
              <MaterialIcon name="pause_circle" className="text-[24px]" />
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
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-amber-700 px-4 text-sm font-semibold text-white"
              >
                <MaterialIcon name="receipt_long" className="text-[18px]" />
                {tc("payInvoice")}
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--separator)] bg-[var(--bg-elevated)] shadow-sm">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,color-mix(in_srgb,var(--accent)_14%,transparent),transparent_55%)]" />
        <div className="relative p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={account.status} />
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide",
                    isPlesk
                      ? "bg-sky-500/12 text-sky-700 dark:text-sky-300"
                      : "bg-orange-500/12 text-orange-700 dark:text-orange-300",
                  )}
                >
                  <MaterialIcon name={isPlesk ? "dashboard" : "tune"} className="text-[14px]" />
                  {account.panel}
                </span>
                {pleskStatusLabel ? (
                  <span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-[11px] font-semibold text-[var(--label-secondary)]">
                    {pleskStatusLabel}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <CapacityPill
                  icon="language"
                  label={tp("detailDomains")}
                  value={account.plan.maxDomains}
                />
                <CapacityPill
                  icon="mail"
                  label={tp("detailMailboxes")}
                  value={account.plan.maxEmails}
                />
                <CapacityPill
                  icon="storage"
                  label={tp("detailStorage")}
                  value={`${account.plan.diskGb} GB`}
                />
                <CapacityPill
                  icon="swap_vert"
                  label={tp("detailBandwidth")}
                  value={`${account.plan.bandwidthGb} GB`}
                />
              </div>
            </div>

            {account.status === "ACTIVE" ? (
              <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[220px]">
                <button
                  type="button"
                  disabled={panelLoading}
                  onClick={onPanelLogin}
                  className="bg-primary text-on-primary inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold shadow-md disabled:opacity-60"
                >
                  <MaterialIcon name="login" className="text-[20px]" />
                  {panelLoading ? tc("opening") : tc("panelLogin")}
                </button>
                {isPleskManaged ? (
                  <>
                    <button
                      type="button"
                      disabled={syncLoading}
                      onClick={onSyncPlesk}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--separator)] bg-[var(--bg-secondary)] px-4 text-sm font-medium disabled:opacity-60"
                    >
                      <MaterialIcon
                        name="sync"
                        className={cn("text-[18px]", syncLoading && "animate-spin")}
                      />
                      {syncLoading ? tp("pleskSyncing") : tp("pleskSync")}
                    </button>
                    <button
                      type="button"
                      onClick={scrollToMail}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--accent)_25%,var(--separator))] bg-[color-mix(in_srgb,var(--accent)_6%,transparent)] px-4 text-sm font-semibold text-[var(--accent)]"
                    >
                      <MaterialIcon name="alternate_email" className="text-[18px]" />
                      {tp("detailManageMail")}
                    </button>
                  </>
                ) : null}
              </div>
            ) : account.status === "FAILED" ? (
              <button
                type="button"
                disabled={retryLoading}
                onClick={onRetry}
                className="bg-primary text-on-primary inline-flex h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold disabled:opacity-60"
              >
                <MaterialIcon name="refresh" className="text-[20px]" />
                {retryLoading ? tprov("retrying") : tprov("retry")}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {/* Usage + account grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {plesk ? (
            <DashboardSectionCard
              title={tp("detailUsageTitle")}
              description={tp("detailUsageDesc")}
              icon="monitoring"
            >
              <div className="grid gap-4 sm:grid-cols-2">
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
              {plesk.maxDomains != null || plesk.maxMailboxes != null ? (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <CapacityPill
                    icon="language"
                    label={tp("detailDomains")}
                    value={plesk.maxDomains ?? "—"}
                  />
                  <CapacityPill
                    icon="mail"
                    label={tp("detailMailboxes")}
                    value={plesk.maxMailboxes ?? "—"}
                  />
                  <CapacityPill
                    icon="database"
                    label={tp("detailDatabases")}
                    value={plesk.maxDatabases ?? "—"}
                  />
                </div>
              ) : null}
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
        </div>

        <div className="space-y-6 lg:col-span-2">
          <DashboardSectionCard title={tp("detailAccountTitle")} icon="badge">
            <DetailRow
              label={tc("username")}
              value={username}
              mono
              copyValue={username}
              copied={copiedField === "username"}
              onCopy={() => void copyText("username", username)}
            />
            <DetailRow label={tc("panel")} value={account.panel} />
            <DetailRow
              label={tc("server")}
              value={account.server?.name ?? account.server?.ipAddress ?? "—"}
            />
            {plesk?.ipAddress ? (
              <DetailRow
                label={tp("pleskIp")}
                value={plesk.ipAddress}
                mono
                copyValue={plesk.ipAddress}
                copied={copiedField === "ip"}
                onCopy={() => void copyText("ip", plesk.ipAddress!)}
              />
            ) : null}
            <DetailRow label={tc("created")} value={formatDate(account.createdAt, locale)} />
            <DetailRow
              label={tc("provisionedAt")}
              value={account.provisionedAt ? formatDate(account.provisionedAt, locale) : "—"}
            />
            {account.expiresAt ? (
              <DetailRow label={ts("expires")} value={formatDate(account.expiresAt, locale)} />
            ) : null}
            {account.status === "PROVISIONING" ? (
              <p className="mt-3 text-xs text-[var(--label-tertiary)]">{tc("autoRefreshing")}</p>
            ) : null}
          </DashboardSectionCard>

          {account.panelUrl && account.status === "ACTIVE" ? (
            <DashboardSectionCard title={tc("directPanelUrl")} icon="link">
              <a
                href={account.panelUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 break-all text-sm font-medium text-[var(--accent)] hover:underline"
              >
                <MaterialIcon name="open_in_new" className="shrink-0 text-[16px]" />
                {account.panelUrl}
              </a>
            </DashboardSectionCard>
          ) : null}

          {plesk && isPleskManaged ? (
            <DashboardSectionCard
              title={tp("detailTechnicalTitle")}
              icon="code"
              actions={
                <button
                  type="button"
                  onClick={() => setShowTechnical((v) => !v)}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--separator)] px-3 text-xs font-medium"
                >
                  <MaterialIcon
                    name={showTechnical ? "expand_less" : "expand_more"}
                    className="text-[18px]"
                  />
                  {showTechnical ? tp("detailHideTechnical") : tp("detailShowTechnical")}
                </button>
              }
            >
              {showTechnical ? (
                <>
                  <DetailRow
                    label={tp("pleskSubscriptionId")}
                    value={plesk.subscriptionId ?? "—"}
                    mono
                  />
                  <DetailRow label={tp("pleskFtpLogin")} value={plesk.ftpLogin ?? username} mono />
                  <DetailRow label={tp("pleskHostingType")} value={plesk.hostingType ?? "—"} />
                  {plesk.syncedAt ? (
                    <DetailRow
                      label={tp("detailLastSync")}
                      value={formatDate(plesk.syncedAt, locale)}
                    />
                  ) : null}
                </>
              ) : (
                <p className="text-sm text-[var(--label-secondary)]">{tp("detailTechnicalHint")}</p>
              )}
            </DashboardSectionCard>
          ) : null}
        </div>
      </div>

      {isPleskManaged && account.status === "ACTIVE" && account.plan.autoDeployEnabled ? (
        <div id="hosting-deploy">
          <HostingDeploySection
            accountId={account.id}
            primaryDomain={account.primaryDomain}
            enabled
          />
        </div>
      ) : null}

      {isPleskManaged ? (
        <div id="hosting-mail">
          <HostingMailSection accountId={account.id} domain={account.primaryDomain} enabled />
        </div>
      ) : null}
    </div>
  );
}
