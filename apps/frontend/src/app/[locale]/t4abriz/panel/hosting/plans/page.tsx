"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { PlanServerAssign } from "@/components/admin/plan-server-assign";
import {
  DataTable,
  EditIconLink,
  EmptyState,
  PageHeader,
  StatusBadge,
  TableRowActions,
} from "@/components/ui";
import {
  deleteAdminHostingPlan,
  listAdminHostingPlans,
  listHostingServers,
  syncPleskPlansFromServer,
  type AdminHostingPlan,
  type HostingServer,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { Link } from "@/i18n/navigation";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminHostingPlansPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.hostingPlans");
  const tu = useTranslations("ui");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const accessToken = useAuthStore((s) => s.accessToken);
  const [plans, setPlans] = useState<AdminHostingPlan[]>([]);
  const [servers, setServers] = useState<HostingServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncServerId, setSyncServerId] = useState("");
  const [syncing, setSyncing] = useState(false);

  const pleskServers = useMemo(
    () => servers.filter((s) => s.panel === "PLESK" && s.isActive),
    [servers],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextPlans, nextServers] = await Promise.all([
        listAdminHostingPlans(),
        listHostingServers(),
      ]);
      setPlans(nextPlans);
      setServers(nextServers);
      setSyncServerId((prev) => {
        if (prev && nextServers.some((s) => s.id === prev && s.panel === "PLESK")) return prev;
        return nextServers.find((s) => s.panel === "PLESK" && s.isActive)?.id ?? "";
      });
    } catch (err) {
      toast(getApiErrorMessage(err, tp("loadFailed")), "error");
    } finally {
      setLoading(false);
    }
  }, [tp]);

  useEffect(() => {
    if (!isAdmin || !accessToken) return;
    void load();
  }, [isAdmin, accessToken, load]);

  const handlePlanUpdated = (updated: AdminHostingPlan) => {
    setPlans((prev) => prev.map((plan) => (plan.id === updated.id ? updated : plan)));
  };

  const handleSyncFromPlesk = async () => {
    if (!syncServerId) {
      toast(tp("selectPleskServer"), "error");
      return;
    }
    setSyncing(true);
    try {
      const result = await syncPleskPlansFromServer(syncServerId);
      toast(tp("syncSuccess", { created: result.created, updated: result.updated }), "success");
      await load();
    } catch (err) {
      toast(getApiErrorMessage(err, tp("syncFailed")), "error");
    } finally {
      setSyncing(false);
    }
  };

  if (!isAdmin) {
    return <p className="text-on-surface-variant">Only administrators can manage hosting plans.</p>;
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
          <div className="flex flex-wrap items-center gap-2">
            {pleskServers.length > 0 ? (
              <>
                <select
                  value={syncServerId}
                  onChange={(e) => setSyncServerId(e.target.value)}
                  className="border-outline-variant bg-surface h-10 rounded-xl border px-3 text-sm"
                  disabled={syncing}
                >
                  {pleskServers.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void handleSyncFromPlesk()}
                  disabled={syncing || !syncServerId}
                  className="border-outline-variant inline-flex h-10 items-center rounded-xl border px-4 text-sm font-semibold disabled:opacity-50"
                >
                  {syncing ? tp("syncing") : tp("syncFromPlesk")}
                </button>
              </>
            ) : null}
            <Link
              href="/t4abriz/panel/hosting/plans/new"
              className="bg-primary text-on-primary inline-flex h-10 items-center rounded-xl px-5 text-sm font-semibold"
            >
              {tp("add")}
            </Link>
          </div>
        }
      />

      {pleskServers.length === 0 && !loading ? (
        <p className="border-outline-variant/60 bg-surface-container-low text-on-surface-variant rounded-xl border px-4 py-3 text-sm">
          {tp("noPleskServersHint")}{" "}
          <Link
            href="/t4abriz/panel/hosting/servers/new"
            className="text-secondary font-medium hover:underline"
          >
            {tp("addServerLink")}
          </Link>
        </p>
      ) : null}

      <DataTable
        data={plans as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "name",
            header: "Plan",
            sortable: true,
            render: (row) => {
              const p = row as unknown as AdminHostingPlan;
              return <span className="text-on-surface font-medium">{p.name}</span>;
            },
          },
          { key: "slug", header: "Slug", sortable: true },
          { key: "panel", header: "Panel" },
          {
            key: "server",
            header: tp("assignServer"),
            render: (row) => {
              const p = row as unknown as AdminHostingPlan;
              return <PlanServerAssign plan={p} servers={servers} onUpdated={handlePlanUpdated} />;
            },
          },
          {
            key: "price",
            header: tu("table.amount"),
            render: (row) =>
              `${formatMoney((row as unknown as AdminHostingPlan).price, "USD", locale)}/mo`,
          },
          {
            key: "isActive",
            header: tu("table.status"),
            render: (row) => (
              <StatusBadge
                status={(row as unknown as AdminHostingPlan).isActive ? "ACTIVE" : "SUSPENDED"}
              />
            ),
          },
          { key: "accountCount", header: t("nav.hostingAccounts"), sortable: true },
          {
            key: "actions",
            header: "",
            render: (row) => {
              const p = row as unknown as AdminHostingPlan;
              return (
                <TableRowActions>
                  <EditIconLink href={`/t4abriz/panel/hosting/plans/${p.id}`} label={tu("edit")} />
                  <button
                    type="button"
                    className="text-error text-sm hover:underline"
                    onClick={async () => {
                      if (!confirm(`${t("actions.delete")} ${p.name}?`)) return;
                      try {
                        await deleteAdminHostingPlan(p.id);
                        toast("Plan deleted", "success");
                        load();
                      } catch {
                        toast("Cannot delete plan with accounts", "error");
                      }
                    }}
                  >
                    {t("actions.delete")}
                  </button>
                </TableRowActions>
              );
            },
          },
        ]}
      />

      {!loading && plans.length === 0 && (
        <EmptyState
          title={tp("empty")}
          actionLabel={tp("add")}
          actionHref="/t4abriz/panel/hosting/plans/new"
        />
      )}
    </div>
  );
}
