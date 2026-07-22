"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader, StatusBadge } from "@/components/ui";
import {
  deleteAdminHostingAccount,
  listAdminHostingAccounts,
  listHostingServers,
  migrateAdminHostingAccounts,
  updateAdminHostingAccountStatus,
  type AdminHostingAccount,
  type HostingServer,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminHostingAccountsPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.hostingAccounts");
  const tu = useTranslations("ui");
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [accounts, setAccounts] = useState<AdminHostingAccount[]>([]);
  const [servers, setServers] = useState<HostingServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetServerId, setTargetServerId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [migrating, setMigrating] = useState(false);

  const load = useCallback(async () => {
    const [accountList, serverList] = await Promise.all([
      listAdminHostingAccounts(),
      isAdmin ? listHostingServers() : Promise.resolve([] as HostingServer[]),
    ]);
    setAccounts(accountList);
    setServers(serverList);
  }, [isAdmin]);

  useEffect(() => {
    load()
      .catch((err) => toast(getApiErrorMessage(err, tp("loadFailed")), "error"))
      .finally(() => setLoading(false));
  }, [load, tp]);

  const activePleskTargets = useMemo(
    () => servers.filter((s) => s.isActive && s.panel === "PLESK"),
    [servers],
  );

  const selectedAccounts = useMemo(
    () => accounts.filter((a) => selected.has(a.id)),
    [accounts, selected],
  );

  const canMigrateSelection =
    selectedAccounts.length > 0 &&
    selectedAccounts.every((a) => a.panel === "PLESK") &&
    Boolean(targetServerId);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPlesk = () => {
    const pleskIds = accounts.filter((a) => a.panel === "PLESK").map((a) => a.id);
    const allSelected = pleskIds.every((id) => selected.has(id));
    setSelected(allSelected ? new Set() : new Set(pleskIds));
  };

  const handleStatus = async (account: AdminHostingAccount, status: "ACTIVE" | "SUSPENDED") => {
    setBusyId(account.id);
    try {
      const updated = await updateAdminHostingAccountStatus(account.id, status);
      setAccounts((prev) => prev.map((a) => (a.id === account.id ? updated : a)));
      toast(status === "SUSPENDED" ? tp("suspended") : tp("activated"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("statusFailed")), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (account: AdminHostingAccount) => {
    if (!confirm(tp("deleteConfirm", { domain: account.primaryDomain }))) return;
    setBusyId(account.id);
    try {
      await deleteAdminHostingAccount(account.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(account.id);
        return next;
      });
      toast(tp("deleted"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("deleteFailed")), "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleMigrate = async () => {
    if (!canMigrateSelection) return;
    if (!confirm(tp("migrateConfirm", { count: selectedAccounts.length }))) return;
    setMigrating(true);
    try {
      const result = await migrateAdminHostingAccounts([...selected], targetServerId);
      await load();
      setSelected(new Set());
      toast(
        tp("migrated", { migrated: result.migrated, failed: result.failed }),
        result.failed > 0 ? "error" : "success",
      );
    } catch (err) {
      toast(getApiErrorMessage(err, tp("migrateFailed")), "error");
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={tp("title")}
        description={tp("description")}
        breadcrumbs={[
          { label: t("breadcrumb.admin"), href: "/t4abriz/panel" },
          { label: tp("title") },
        ]}
      />

      {isAdmin && (
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-outline-variant/50 bg-surface-container-low p-4">
          <div className="min-w-[220px] flex-1">
            <label className="mb-1.5 block text-xs font-medium text-on-surface-variant">
              {tp("migrateTarget")}
            </label>
            <select
              value={targetServerId}
              onChange={(e) => setTargetServerId(e.target.value)}
              className="h-10 w-full rounded-xl border border-outline-variant bg-surface px-3 text-sm"
            >
              <option value="">{tp("migrateTargetPlaceholder")}</option>
              {activePleskTargets.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name} ({server.ipAddress})
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!canMigrateSelection || migrating}
            onClick={handleMigrate}
            className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50"
          >
            {migrating ? tp("migrating") : tp("migrateSelected")}
          </button>
          <p className="w-full text-xs text-on-surface-variant">{tp("migrateHint")}</p>
        </div>
      )}

      {loading ? (
        <p className="text-on-surface-variant">{tu("loading")}</p>
      ) : accounts.length === 0 ? (
        <p className="text-on-surface-variant">{tu("noRecords")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-outline-variant/50">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-container-low text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                {isAdmin && (
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      aria-label={tp("selectAllPlesk")}
                      checked={
                        accounts.some((a) => a.panel === "PLESK") &&
                        accounts.filter((a) => a.panel === "PLESK").every((a) => selected.has(a.id))
                      }
                      onChange={toggleAllPlesk}
                    />
                  </th>
                )}
                <th className="px-3 py-3">{tp("domain")}</th>
                <th className="px-3 py-3">{tp("plan")}</th>
                <th className="px-3 py-3">{t("nav.hostingServers")}</th>
                <th className="px-3 py-3">{tu("table.status")}</th>
                {isAdmin && <th className="px-3 py-3">{tp("actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const busy = busyId === account.id;
                return (
                  <tr key={account.id} className="border-t border-outline-variant/40">
                    {isAdmin && (
                      <td className="px-3 py-3">
                        {account.panel === "PLESK" ? (
                          <input
                            type="checkbox"
                            checked={selected.has(account.id)}
                            onChange={() => toggleSelected(account.id)}
                            aria-label={account.primaryDomain}
                          />
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <p className="font-medium">{account.primaryDomain}</p>
                      <p className="text-xs text-on-surface-variant">
                        {account.customer.email} · {account.panel}
                      </p>
                    </td>
                    <td className="px-3 py-3">{account.plan.name}</td>
                    <td className="px-3 py-3">{account.server?.name ?? "—"}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={account.status} />
                    </td>
                    {isAdmin && (
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {account.status === "SUSPENDED" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleStatus(account, "ACTIVE")}
                              className="rounded-lg bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary disabled:opacity-50"
                            >
                              {tp("activate")}
                            </button>
                          ) : account.status === "ACTIVE" || account.status === "PROVISIONING" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleStatus(account, "SUSPENDED")}
                              className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-700 disabled:opacity-50 dark:text-amber-300"
                            >
                              {tp("suspend")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => handleDelete(account)}
                            className="rounded-lg bg-error-container px-2.5 py-1 text-xs font-medium text-error disabled:opacity-50"
                          >
                            {tp("delete")}
                          </button>
                          {account.panelUrl && (
                            <a
                              href={account.panelUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-outline-variant px-2.5 py-1 text-xs font-medium hover:bg-surface-container-low"
                            >
                              {tp("panel")}
                            </a>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
