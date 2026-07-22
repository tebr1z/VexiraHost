"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import { deleteAdminServerPlan, listAdminServerPlans, type AdminServerPlan } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminServerPlansPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.serverPlans");
  const tu = useTranslations("ui");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [plans, setPlans] = useState<AdminServerPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => listAdminServerPlans().then(setPlans).finally(() => setLoading(false));

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!isAdmin) return <p className="text-on-surface-variant">Only administrators can manage server plans.</p>;

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
            href="/t4abriz/panel/servers/plans/new"
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
            render: (row) => {
              const p = row as unknown as AdminServerPlan;
              return (
                <Link
                  href={`/t4abriz/panel/servers/plans/${p.id}`}
                  className="font-medium text-secondary hover:underline"
                >
                  {p.name}
                </Link>
              );
            },
          },
          { key: "type", header: "Type" },
          {
            key: "specs",
            header: "Specs",
            render: (row) => {
              const p = row as unknown as AdminServerPlan;
              return `${p.cpuCores} vCPU · ${p.ramGb}GB · ${p.diskGb}GB`;
            },
          },
          {
            key: "price",
            header: tu("table.amount"),
            render: (row) => `${formatMoney((row as unknown as AdminServerPlan).price, "USD", locale)}/mo`,
          },
          {
            key: "isActive",
            header: tu("table.status"),
            render: (row) => (
              <StatusBadge status={(row as unknown as AdminServerPlan).isActive ? "ACTIVE" : "SUSPENDED"} />
            ),
          },
          {
            key: "actions",
            header: "",
            render: (row) => {
              const p = row as unknown as AdminServerPlan;
              return (
                <button
                  type="button"
                  className="text-sm text-error hover:underline"
                  onClick={async () => {
                    if (!confirm(`${t("actions.delete")} ${p.name}?`)) return;
                    try {
                      await deleteAdminServerPlan(p.id);
                      toast("Plan deleted", "success");
                      load();
                    } catch {
                      toast("Cannot delete plan with servers", "error");
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
    </div>
  );
}
