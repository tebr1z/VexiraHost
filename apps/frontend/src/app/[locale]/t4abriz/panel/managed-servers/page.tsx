"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { PageHeader } from "@/components/ui";
import {
  approveManagedServerTask,
  listManagedServers,
  type ManagedServer,
} from "@/features/managed-servers/managed-servers.service";
import { getApiErrorMessage } from "@/lib/api-error";
import { cn } from "@/lib/cn";
import { toast } from "@/stores/toast-store";

export default function AdminManagedServersPage(): React.ReactElement {
  const t = useTranslations("managedServers");
  const ta = useTranslations("admin");
  const [servers, setServers] = useState<ManagedServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setServers(await listManagedServers(true));
    } catch (error) {
      toast(getApiErrorMessage(error, t("loadError")), "error");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async (taskId: string) => {
    setBusy(taskId);
    try {
      await approveManagedServerTask(taskId);
      toast(t("approved"), "success");
      await load();
    } catch (error) {
      toast(getApiErrorMessage(error, t("taskError")), "error");
    } finally {
      setBusy(null);
    }
  };

  const openFindings = servers.reduce(
    (sum, server) => sum + (server.findings?.filter((item) => item.status === "OPEN").length ?? 0),
    0,
  );
  const waiting = servers.reduce(
    (sum, server) =>
      sum + (server.tasks?.filter((item) => item.status === "WAITING_APPROVAL").length ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("adminTitle")}
        description={t("adminDescription")}
        breadcrumbs={[
          { label: ta("nav.overview"), href: "/t4abriz/panel" },
          { label: t("adminTitle") },
        ]}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: t("serverCount"), value: servers.length, icon: "dns" },
          {
            label: t("onlineCount"),
            value: servers.filter((item) => item.status === "ONLINE").length,
            icon: "monitor_heart",
          },
          { label: t("attentionCount"), value: openFindings + waiting, icon: "warning" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[var(--separator)] bg-[var(--bg-elevated)] p-5"
          >
            <span className="material-symbols-outlined text-[22px] text-[var(--accent)]">
              {stat.icon}
            </span>
            <p className="mt-3 text-2xl font-semibold">{stat.value}</p>
            <p className="mt-1 text-xs text-[var(--label-secondary)]">{stat.label}</p>
          </div>
        ))}
      </div>
      {loading ? (
        <div className="h-72 animate-pulse rounded-3xl bg-[var(--fill-secondary)]" />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-[var(--separator)] bg-[var(--bg-elevated)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[var(--separator)] bg-[var(--bg-secondary)] text-xs uppercase tracking-wide text-[var(--label-tertiary)]">
                <tr>
                  <th className="px-5 py-4">{t("customer")}</th>
                  <th className="px-5 py-4">{t("server")}</th>
                  <th className="px-5 py-4">{t("status")}</th>
                  <th className="px-5 py-4">CPU / RAM / SSD</th>
                  <th className="px-5 py-4">{t("scores")}</th>
                  <th className="px-5 py-4">{t("pendingTasks")}</th>
                </tr>
              </thead>
              <tbody>
                {servers.map((server) => {
                  const pending =
                    server.tasks?.filter((task) =>
                      ["WAITING_APPROVAL", "QUEUED", "RUNNING"].includes(task.status),
                    ) ?? [];
                  return (
                    <tr
                      key={server.id}
                      className="border-b border-[var(--separator)] last:border-0"
                    >
                      <td className="px-5 py-4">
                        <p className="font-medium">{server.user?.email ?? "—"}</p>
                        <p className="text-xs text-[var(--label-tertiary)]">
                          {[server.user?.firstName, server.user?.lastName]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{server.name}</p>
                        <p className="font-mono text-xs text-[var(--label-secondary)]">
                          {server.sshUsername}@{server.host}:{server.sshPort}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                            server.status === "ONLINE"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                          )}
                        >
                          {server.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <p>{server.cpuLoadPercent ?? 0}% CPU</p>
                        <p>
                          {server.memoryUsedMb ?? 0}/{server.memoryTotalMb ?? 0} MB
                        </p>
                        <p>
                          {Math.round((server.diskUsedMb ?? 0) / 1024)}/
                          {Math.round((server.diskTotalMb ?? 0) / 1024)} GB
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <p>
                          {t("securityScore")}: {server.securityScore ?? "—"}
                        </p>
                        <p>
                          {t("optimizationScore")}: {server.optimizationScore ?? "—"}
                        </p>
                        <p>
                          {t("findingsTitle")}:{" "}
                          {server.findings?.filter((item) => item.status === "OPEN").length ?? 0}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-2">
                          {pending.length ? (
                            pending.map((task) => (
                              <div
                                key={task.id}
                                className="rounded-xl bg-[var(--bg-secondary)] p-3"
                              >
                                <p className="text-xs font-semibold">
                                  {task.type} · {task.status}
                                </p>
                                {task.status === "WAITING_APPROVAL" ? (
                                  <button
                                    type="button"
                                    disabled={busy === task.id}
                                    onClick={() => void approve(task.id)}
                                    className="mt-2 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                                  >
                                    {t("approveInstall")}
                                  </button>
                                ) : null}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-[var(--label-tertiary)]">
                              {t("noPendingTasks")}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
