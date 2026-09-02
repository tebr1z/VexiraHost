"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PageHeader, StatusBadge } from "@/components/ui";
import {
  deleteAdminHostingAccount,
  listAdminHostingAccounts,
  listHostingServers,
  migrateAdminHostingAccounts,
  reassignAdminHostingProvision,
  retryAdminHostingProvision,
  updateAdminHostingAccountStatus,
  type AdminHostingAccount,
  type HostingServer,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/cn";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminHostingAccountsPage(): React.ReactElement | null {
  useRequireAuth();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.hostingAccounts");
  const tStage = useTranslations("dashboard.provision.stages");
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
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);

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

  useEffect(() => {
    if (!accounts.some((a) => a.status === "PROVISIONING")) return;
    const timer = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [accounts, load]);

  const failedAccounts = useMemo(() => accounts.filter((a) => a.status === "FAILED"), [accounts]);

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

  const updateAccountInList = (updated: AdminHostingAccount) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleRetryProvision = async (account: AdminHostingAccount) => {
    setRetryingId(account.id);
    try {
      const updated = await retryAdminHostingProvision(account.id);
      updateAccountInList(updated);
      toast(tp("provisionRetried"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("provisionRetryFailed")), "error");
    } finally {
      setRetryingId(null);
    }
  };

  const handleReassignAndRetry = async (account: AdminHostingAccount) => {
    if (!targetServerId) {
      toast(tp("reassignNeedsServer"), "error");
      return;
    }
    if (targetServerId === account.server?.id) {
      toast(tp("reassignSameServer"), "error");
      return;
    }
    setReassigningId(account.id);
    try {
      const updated = await reassignAdminHostingProvision(account.id, targetServerId);
      updateAccountInList(updated);
      toast(tp("provisionReassigned"), "success");
    } catch (err) {
      toast(getApiErrorMessage(err, tp("reassignRetryFailed")), "error");
    } finally {
      setReassigningId(null);
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

      {isAdmin && failedAccounts.length > 0 && (
        <div className="rounded-2xl border border-red-300/60 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <h2 className="text-sm font-semibold text-red-900 dark:text-red-100">
            {tp("failedAccountsTitle", { count: failedAccounts.length })}
          </h2>
          <p className="mt-1 text-xs text-red-800 dark:text-red-200">{tp("failedAccountsHint")}</p>
          <ul className="mt-3 space-y-2">
            {failedAccounts.map((account) => (
              <li
                key={account.id}
                className="dark:bg-surface/60 rounded-xl border border-red-200/80 bg-white/80 px-3 py-2 dark:border-red-500/20"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-red-950 dark:text-red-50">
                      {account.primaryDomain}
                    </p>
                    <p className="text-xs text-red-800/80 dark:text-red-200/80">
                      {account.customer.email} · {account.server?.name ?? "—"}
                    </p>
                    {account.provisionStage && (
                      <p className="mt-1 text-xs text-red-800 dark:text-red-200">
                        {tp("provisionStage")}:{" "}
                        {[
                          "PAYMENT_CONFIRMED",
                          "CONNECTING_PANEL",
                          "CREATING_CUSTOMER",
                          "CREATING_WEBSPACE",
                          "FINALIZING",
                          "COMPLETED",
                        ].includes(account.provisionStage)
                          ? tStage(account.provisionStage)
                          : account.provisionStage}
                      </p>
                    )}
                    {account.provisionError && (
                      <p className="mt-1 break-words font-mono text-xs text-red-900 dark:text-red-100">
                        {account.provisionError}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={retryingId === account.id || reassigningId === account.id}
                      onClick={() => void handleRetryProvision(account)}
                      className="rounded-lg bg-red-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50 dark:bg-red-800"
                    >
                      {retryingId === account.id ? tp("retryingProvision") : tp("retryProvision")}
                    </button>
                    <button
                      type="button"
                      disabled={
                        !targetServerId ||
                        targetServerId === account.server?.id ||
                        retryingId === account.id ||
                        reassigningId === account.id
                      }
                      onClick={() => void handleReassignAndRetry(account)}
                      className="rounded-lg border border-red-400 px-2.5 py-1 text-xs font-semibold text-red-900 disabled:opacity-50 dark:border-red-400/40 dark:text-red-100"
                    >
                      {reassigningId === account.id
                        ? tp("reassigningProvision")
                        : tp("reassignAndRetry")}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAdmin && (
        <div className="border-outline-variant/50 bg-surface-container-low flex flex-wrap items-end gap-3 rounded-2xl border p-4">
          <div className="min-w-[220px] flex-1">
            <label className="text-on-surface-variant mb-1.5 block text-xs font-medium">
              {tp("migrateTarget")}
            </label>
            <select
              value={targetServerId}
              onChange={(e) => setTargetServerId(e.target.value)}
              className="border-outline-variant bg-surface h-10 w-full rounded-xl border px-3 text-sm"
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
            className="bg-primary text-on-primary h-10 rounded-xl px-4 text-sm font-semibold disabled:opacity-50"
          >
            {migrating ? tp("migrating") : tp("migrateSelected")}
          </button>
          <p className="text-on-surface-variant w-full text-xs">{tp("migrateHint")}</p>
        </div>
      )}

      {loading ? (
        <p className="text-on-surface-variant">{tu("loading")}</p>
      ) : accounts.length === 0 ? (
        <p className="text-on-surface-variant">{tu("noRecords")}</p>
      ) : (
        <div className="border-outline-variant/50 overflow-x-auto rounded-2xl border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant text-xs uppercase tracking-wide">
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
                <th className="px-3 py-3">{tp("provisionStage")}</th>
                {isAdmin && <th className="px-3 py-3">{tp("provisionError")}</th>}
                {isAdmin && <th className="px-3 py-3">{tp("actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => {
                const busy = busyId === account.id;
                const failed = account.status === "FAILED";
                const provisioning = account.status === "PROVISIONING";
                const rowRetrying = retryingId === account.id;
                const rowReassigning = reassigningId === account.id;
                return (
                  <tr
                    key={account.id}
                    className={cn(
                      "border-outline-variant/40 border-t",
                      failed && "bg-red-50/60 dark:bg-red-500/5",
                    )}
                  >
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
                      <p className="text-on-surface-variant text-xs">
                        {account.customer.email} · {account.panel}
                      </p>
                    </td>
                    <td className="px-3 py-3">{account.plan.name}</td>
                    <td className="px-3 py-3">{account.server?.name ?? "—"}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={account.status} />
                    </td>
                    <td className="text-on-surface-variant px-3 py-3 text-xs">
                      {account.provisionStage
                        ? [
                            "PAYMENT_CONFIRMED",
                            "CONNECTING_PANEL",
                            "CREATING_CUSTOMER",
                            "CREATING_WEBSPACE",
                            "FINALIZING",
                            "COMPLETED",
                          ].includes(account.provisionStage)
                          ? tStage(account.provisionStage)
                          : account.provisionStage
                        : failed || provisioning
                          ? "—"
                          : ""}
                    </td>
                    {isAdmin && (
                      <td className="max-w-xs px-3 py-3">
                        {account.provisionError ? (
                          <p
                            className="break-words font-mono text-xs text-red-800 dark:text-red-200"
                            title={account.provisionError}
                          >
                            {account.provisionError}
                          </p>
                        ) : (
                          <span className="text-on-surface-variant">—</span>
                        )}
                      </td>
                    )}
                    {isAdmin && (
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {failed && (
                            <>
                              <button
                                type="button"
                                disabled={rowRetrying || rowReassigning || busy}
                                onClick={() => void handleRetryProvision(account)}
                                className="rounded-lg bg-red-900 px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-50 dark:bg-red-800"
                              >
                                {rowRetrying ? tp("retryingProvision") : tp("retryProvision")}
                              </button>
                              <button
                                type="button"
                                disabled={
                                  !targetServerId ||
                                  targetServerId === account.server?.id ||
                                  rowRetrying ||
                                  rowReassigning ||
                                  busy
                                }
                                onClick={() => void handleReassignAndRetry(account)}
                                className="rounded-lg border border-red-400 px-2.5 py-1 text-xs font-semibold text-red-900 disabled:opacity-50 dark:border-red-400/40 dark:text-red-100"
                              >
                                {rowReassigning
                                  ? tp("reassigningProvision")
                                  : tp("reassignAndRetry")}
                              </button>
                            </>
                          )}
                          {account.status === "SUSPENDED" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleStatus(account, "ACTIVE")}
                              className="bg-secondary/15 text-secondary rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50"
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
                            className="bg-error-container text-error rounded-lg px-2.5 py-1 text-xs font-medium disabled:opacity-50"
                          >
                            {tp("delete")}
                          </button>
                          {account.panelUrl && (
                            <a
                              href={account.panelUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="border-outline-variant hover:bg-surface-container-low rounded-lg border px-2.5 py-1 text-xs font-medium"
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
