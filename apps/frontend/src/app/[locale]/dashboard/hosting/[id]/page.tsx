"use client";

import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { ProvisionProgress } from "@/components/hosting/provision-progress";
import { EmptyState, LoadingSkeletonList, PageHeader, StatusBadge } from "@/components/ui";
import { useRequireAuth } from "@/features/auth";
import {
  getHostingAccount,
  openHostingPanel,
  retryHostingProvision,
  syncHostingPanelInfo,
  type HostingAccount,
} from "@/features/hosting";
import { Link } from "@/i18n/navigation";
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

function formatUsage(used: number | null, limit: number | null, locale: string): string {
  if (used == null && limit == null) return "—";
  return `${formatBytes(used, locale)} / ${formatBytes(limit, locale)}`;
}

export default function HostingDetailPage(): React.ReactElement | null {
  useRequireAuth();
  const params = useParams<{ id: string }>();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tc = useTranslations("dashboard.common");
  const tp = useTranslations("dashboard.pages.hosting");
  const ts = useTranslations("dashboard.pages.services");
  const [account, setAccount] = useState<HostingAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [panelLoading, setPanelLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const tprov = useTranslations("dashboard.provision");
  const [retryLoading, setRetryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!params.id) return;
    try {
      const data = await getHostingAccount(params.id);
      setAccount(data);
      setError(null);
    } catch {
      setError(tp("notFound"));
    } finally {
      setLoading(false);
    }
  }, [params.id, tp]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!account || account.status !== "PROVISIONING") return;
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, [account, load]);

  const handlePanelLogin = async () => {
    if (!account) return;
    setPanelLoading(true);
    try {
      await openHostingPanel(account.id);
      toast(tc("openingPanel"), "success");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tc("panelLoginFailed");
      toast(msg ?? tc("panelLoginFailed"), "error");
    } finally {
      setPanelLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!account) return;
    setRetryLoading(true);
    try {
      const data = await retryHostingProvision(account.id);
      setAccount(data);
      toast(tprov("retry"), "success");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tprov("failedHint");
      toast(msg ?? tprov("failedHint"), "error");
    } finally {
      setRetryLoading(false);
    }
  };

  const handleSyncPlesk = async () => {
    if (!account) return;
    setSyncLoading(true);
    try {
      const data = await syncHostingPanelInfo(account.id);
      setAccount(data);
      toast(tp("pleskSync"), "success");
    } catch (err) {
      const msg =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tp("pleskUnavailable");
      toast(msg ?? tp("pleskUnavailable"), "error");
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) return <LoadingSkeletonList rows={2} />;
  if (error || !account) {
    return (
      <EmptyState
        title={tp("notFound")}
        description={error ?? tp("notFoundDesc")}
        actionLabel={tc("backToHosting")}
        actionHref="/dashboard/hosting"
      />
    );
  }

  const plesk = account.pleskInfo;
  const pleskStatusLabel =
    plesk?.status === "active"
      ? tp("pleskStatusActive")
      : plesk?.status === "suspended"
        ? tp("pleskStatusSuspended")
        : plesk
          ? tp("pleskStatusUnknown")
          : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={account.primaryDomain}
        description={`${account.plan.name} · ${account.panel}`}
        breadcrumbs={[
          { label: t("nav.dashboard"), href: "/dashboard" },
          { label: t("nav.hosting"), href: "/dashboard/hosting" },
          { label: account.primaryDomain },
        ]}
        actions={
          account.status === "ACTIVE" ? (
            <div className="flex flex-wrap gap-2">
              {account.panel === "PLESK" &&
                account.server &&
                account.managementMode !== "MANUAL" && (
                  <button
                    type="button"
                    disabled={syncLoading}
                    onClick={handleSyncPlesk}
                    className="text-primary inline-flex h-10 items-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium disabled:opacity-60"
                  >
                    {syncLoading ? tp("pleskSyncing") : tp("pleskSync")}
                  </button>
                )}
              <button
                type="button"
                disabled={panelLoading}
                onClick={handlePanelLogin}
                className="bg-primary text-on-primary inline-flex h-10 items-center rounded-md px-5 text-sm font-semibold disabled:opacity-60"
              >
                {panelLoading ? tc("opening") : tc("panelLogin")}
              </button>
            </div>
          ) : account.status === "FAILED" ? (
            <button
              type="button"
              disabled={retryLoading}
              onClick={handleRetry}
              className="bg-primary text-on-primary inline-flex h-10 items-center rounded-md px-5 text-sm font-semibold disabled:opacity-60"
            >
              {retryLoading ? tprov("retrying") : tprov("retry")}
            </button>
          ) : undefined
        }
      />

      {(account.status === "PROVISIONING" || account.status === "FAILED") && (
        <ProvisionProgress
          stage={account.provisionStage}
          error={account.provisionError}
          status={account.status}
        />
      )}

      {account.status === "SUSPENDED" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
            {tc("suspendedTitle")}
          </p>
          <p className="mt-1 text-sm text-amber-900/90 dark:text-amber-50/90">
            {tc("suspendedBody")}
          </p>
          {account.graceEndsAt && (
            <p className="mt-2 text-xs font-medium text-amber-950 dark:text-amber-100">
              {tc("graceUntil")}: {formatDate(account.graceEndsAt, locale)}
            </p>
          )}
          <Link
            href={
              account.renewalInvoiceId
                ? `/dashboard/invoices/${account.renewalInvoiceId}`
                : "/dashboard/invoices"
            }
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-amber-700 px-3 text-sm font-semibold text-white"
          >
            {tc("payInvoice")}
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoCard label={tc("status")}>
          <StatusBadge status={account.status} />
          {account.status === "PROVISIONING" && (
            <p className="text-on-surface-variant mt-2 text-xs">{tc("autoRefreshing")}</p>
          )}
        </InfoCard>
        <InfoCard label={tc("username")}>{account.panelUsername ?? account.username}</InfoCard>
        <InfoCard label={tc("panel")}>{account.panel}</InfoCard>
        <InfoCard label={tc("server")}>
          {account.server?.name ?? account.server?.ipAddress ?? "—"}
        </InfoCard>
        <InfoCard label={tc("created")}>{formatDate(account.createdAt, locale)}</InfoCard>
        <InfoCard label={tc("provisionedAt")}>
          {account.provisionedAt ? formatDate(account.provisionedAt, locale) : "—"}
        </InfoCard>
        {account.expiresAt && (
          <InfoCard label={ts("expires")}>{formatDate(account.expiresAt, locale)}</InfoCard>
        )}
      </div>

      {account.panel === "PLESK" &&
        account.status === "ACTIVE" &&
        account.server &&
        account.managementMode !== "MANUAL" && (
          <section className="panel-card rounded-lg p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-jakarta text-primary text-lg font-semibold">
                {tp("pleskTitle")}
              </h2>
              {pleskStatusLabel && (
                <span className="text-primary rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                  {pleskStatusLabel}
                </span>
              )}
            </div>

            {plesk ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <InfoCard label={tp("pleskSubscriptionId")}>{plesk.subscriptionId ?? "—"}</InfoCard>
                <InfoCard label={tp("pleskIp")}>{plesk.ipAddress ?? "—"}</InfoCard>
                <InfoCard label={tp("pleskDisk")}>
                  {formatUsage(plesk.diskUsedBytes, plesk.diskLimitBytes, locale)}
                </InfoCard>
                <InfoCard label={tp("pleskTraffic")}>
                  {formatUsage(plesk.trafficUsedBytes, plesk.trafficLimitBytes, locale)}
                </InfoCard>
                <InfoCard label={tp("pleskLimits")}>
                  {plesk.maxDomains ?? "—"} dom · {plesk.maxMailboxes ?? "—"} mail ·{" "}
                  {plesk.maxDatabases ?? "—"} db
                </InfoCard>
                <InfoCard label={tp("pleskFtpLogin")}>
                  {plesk.ftpLogin ?? account.panelUsername ?? "—"}
                </InfoCard>
                <InfoCard label={tp("pleskHostingType")}>{plesk.hostingType ?? "—"}</InfoCard>
              </div>
            ) : (
              <p className="text-on-surface-variant text-sm">{tp("pleskUnavailable")}</p>
            )}
          </section>
        )}

      {account.panelUrl && account.status === "ACTIVE" && (
        <div className="panel-card rounded-lg p-5">
          <p className="text-on-surface-variant text-sm">{tc("directPanelUrl")}</p>
          <a
            href={account.panelUrl}
            target="_blank"
            rel="noreferrer"
            className="text-primary mt-1 break-all hover:underline"
          >
            {account.panelUrl}
          </a>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-transparent">
      <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wide">{label}</p>
      <div className="text-primary mt-1 text-sm font-medium">{children}</div>
    </div>
  );
}
