"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { PageHeader, StatusBadge } from "@/components/ui";
import {
  listHostingServerAccounts,
  listHostingServers,
  testHostingServer,
  type AdminHostingAccount,
  type HostingServer,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatDate } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminHostingServersPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.hostingServers");
  const tf = useTranslations("admin.forms");
  const tu = useTranslations("ui");
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [servers, setServers] = useState<HostingServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [accountsByServer, setAccountsByServer] = useState<Record<string, AdminHostingAccount[]>>({});
  const [accountsLoadingId, setAccountsLoadingId] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const loadServers = useCallback(() => {
    return listHostingServers().then(setServers);
  }, []);

  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    loadServers()
      .catch((err) => toast(getApiErrorMessage(err, tp("accountsLoadFailed")), "error"))
      .finally(() => setLoading(false));
  }, [isAdmin, accessToken, loadServers, tp]);

  const handleTest = async (server: HostingServer) => {
    setTestingId(server.id);
    try {
      const result = await testHostingServer(server.id);
      setServers((prev) =>
        prev.map((item) =>
          item.id === server.id
            ? {
                ...item,
                lastCheckedAt: result.lastCheckedAt,
                lastConnectionOk: result.lastConnectionOk,
              }
            : item,
        ),
      );
      toast(result.message, result.ok ? "success" : "error");
    } catch (err) {
      const message =
        err && typeof err === "object" && "error" in err
          ? (err as { error?: { message?: string } }).error?.message
          : tf("connectionTestFailed");
      toast(message ?? tf("connectionTestFailed"), "error");
    } finally {
      setTestingId(null);
    }
  };

  const toggleAccounts = async (serverId: string) => {
    if (expandedId === serverId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(serverId);

    if (accountsByServer[serverId]) return;

    setAccountsLoadingId(serverId);
    try {
      const accounts = await listHostingServerAccounts(serverId, true);
      setAccountsByServer((prev) => ({ ...prev, [serverId]: accounts }));
    } catch {
      toast(tp("accountsLoadFailed"), "error");
    } finally {
      setAccountsLoadingId(null);
    }
  };

  if (!isAdmin) {
    return <p className="text-on-surface-variant">{tf("hostingServersAdminOnly")}</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title") },
        ]}
        actions={
          <Link
            href="/t4abriz/panel/hosting/servers/new"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
          >
            {tp("add")}
          </Link>
        }
      />

      {loading ? (
        <p className="text-on-surface-variant">{tu("loading")}</p>
      ) : servers.length === 0 ? (
        <div className="card-3d rounded-2xl px-4 py-8 text-center text-sm text-on-surface-variant">
          {tp("empty")}
        </div>
      ) : (
        <div className="space-y-4">
          {servers.map((server) => {
            const expanded = expandedId === server.id;
            const accounts = accountsByServer[server.id] ?? [];

            return (
              <div key={server.id} className="card-3d overflow-hidden rounded-2xl border border-outline-variant/40">
                <div className="grid gap-4 p-5 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-jakarta text-lg font-semibold text-primary">{server.name}</h2>
                      {server.isDefault && (
                        <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-medium text-secondary">
                          {tp("defaultBadge")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      {server.hostname} · {server.ipAddress} · {server.panel}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                      {tp("connection")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <ConnectionBadge
                        ok={server.lastConnectionOk}
                        checkedAt={server.lastCheckedAt}
                        labels={{
                          ok: tp("connectionOk"),
                          failed: tp("connectionFailed"),
                          unknown: tp("connectionUnknown"),
                        }}
                      />
                      {server.lastCheckedAt && (
                        <span className="text-xs text-on-surface-variant">
                          {tp("lastChecked", { date: formatDate(server.lastCheckedAt, locale) })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                      {tp("activeAccounts")}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={server.isActive ? "ACTIVE" : "SUSPENDED"} />
                      <span className="text-sm text-on-surface">
                        {server.activeAccountCount}
                        {server.maxAccounts ? ` / ${server.maxAccounts}` : ""} {tp("accountsLabel")}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button
                      type="button"
                      disabled={testingId === server.id}
                      onClick={() => handleTest(server)}
                      className="h-9 rounded-xl border border-outline-variant px-4 text-sm font-semibold hover:bg-surface-container-low disabled:opacity-60"
                    >
                      {testingId === server.id ? tf("testing") : tf("testConnection")}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAccounts(server.id)}
                      className="h-9 rounded-xl border border-outline-variant px-4 text-sm font-semibold hover:bg-surface-container-low"
                    >
                      {expanded ? tp("hideAccounts") : tp("showAccounts")}
                    </button>
                    <Link
                      href={`/t4abriz/panel/hosting/servers/${server.id}`}
                      className="inline-flex h-9 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary"
                    >
                      {t("actions.edit")}
                    </Link>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-outline-variant/40 bg-surface-container-lowest/60 p-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-primary">{tp("activeAccountsList")}</h3>
                      <Link
                        href="/t4abriz/panel/hosting/accounts"
                        className="text-xs text-secondary hover:underline"
                      >
                        {tp("allAccounts")}
                      </Link>
                    </div>

                    {accountsLoadingId === server.id ? (
                      <p className="text-sm text-on-surface-variant">{tu("loading")}</p>
                    ) : accounts.length === 0 ? (
                      <p className="text-sm text-on-surface-variant">{tp("noActiveAccounts")}</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-outline-variant/30 text-left text-on-surface-variant">
                              <th className="px-3 py-2 font-medium">{tp("domain")}</th>
                              <th className="px-3 py-2 font-medium">{tp("customer")}</th>
                              <th className="px-3 py-2 font-medium">{tp("plan")}</th>
                              <th className="px-3 py-2 font-medium">{tu("table.status")}</th>
                              <th className="px-3 py-2 font-medium" />
                            </tr>
                          </thead>
                          <tbody>
                            {accounts.map((account) => (
                              <tr key={account.id} className="border-b border-outline-variant/20 last:border-0">
                                <td className="px-3 py-3">
                                  <p className="font-medium">{account.primaryDomain}</p>
                                  <p className="text-xs text-on-surface-variant">{account.username}</p>
                                </td>
                                <td className="px-3 py-3">{account.customer.email}</td>
                                <td className="px-3 py-3">{account.plan.name}</td>
                                <td className="px-3 py-3">
                                  <StatusBadge status={account.status} />
                                </td>
                                <td className="px-3 py-3 text-right">
                                  {account.panelUrl ? (
                                    <a
                                      href={account.panelUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-secondary hover:underline"
                                    >
                                      {tp("openPanel")}
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ConnectionBadge({
  ok,
  checkedAt,
  labels,
}: {
  ok: boolean | null;
  checkedAt: string | null;
  labels: { ok: string; failed: string; unknown: string };
}): React.ReactElement {
  if (ok === true) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success-container px-2.5 py-1 text-xs font-medium text-success">
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        {labels.ok}
      </span>
    );
  }

  if (ok === false && checkedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-error-container px-2.5 py-1 text-xs font-medium text-error">
        <span className="material-symbols-outlined text-[14px]">error</span>
        {labels.failed}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 text-xs font-medium text-on-surface-variant">
      <span className="material-symbols-outlined text-[14px]">help</span>
      {labels.unknown}
    </span>
  );
}
