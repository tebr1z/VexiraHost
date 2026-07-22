"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { PlanServerAssign } from "@/components/admin/plan-server-assign";
import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import {
  deleteAdminHostingPlan,
  listAdminHostingPlans,
  listHostingServers,
  type AdminHostingPlan,
  type HostingServer,
} from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatMoney } from "@/lib/i18n/format";
import { getApiErrorMessage } from "@/lib/api-error";
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextPlans, nextServers] = await Promise.all([
        listAdminHostingPlans(),
        listHostingServers(),
      ]);
      setPlans(nextPlans);
      setServers(nextServers);
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
          <Link
            href="/t4abriz/panel/hosting/plans/new"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
          >
            {tp("add")}
          </Link>
        }
      />

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
              return (
                <Link
                  href={`/t4abriz/panel/hosting/plans/${p.id}`}
                  className="font-medium text-secondary hover:underline"
                >
                  {p.name}
                </Link>
              );
            },
          },
          { key: "slug", header: "Slug", sortable: true },
          { key: "panel", header: "Panel" },
          {
            key: "server",
            header: tp("assignServer"),
            render: (row) => {
              const p = row as unknown as AdminHostingPlan;
              return (
                <PlanServerAssign plan={p} servers={servers} onUpdated={handlePlanUpdated} />
              );
            },
          },
          {
            key: "price",
            header: tu("table.amount"),
            render: (row) => `${formatMoney((row as unknown as AdminHostingPlan).price, "USD", locale)}/mo`,
          },
          {
            key: "isActive",
            header: tu("table.status"),
            render: (row) => (
              <StatusBadge status={(row as unknown as AdminHostingPlan).isActive ? "ACTIVE" : "SUSPENDED"} />
            ),
          },
          { key: "accountCount", header: t("nav.hostingAccounts"), sortable: true },
          {
            key: "actions",
            header: "",
            render: (row) => {
              const p = row as unknown as AdminHostingPlan;
              return (
                <button
                  type="button"
                  className="text-sm text-error hover:underline"
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
              );
            },
          },
        ]}
      />

      {!loading && plans.length === 0 && (
        <EmptyState title={tp("empty")} actionLabel={tp("add")} actionHref="/t4abriz/panel/hosting/plans/new" />
      )}
    </div>
  );
}
