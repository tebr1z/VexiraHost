"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { deleteAdminTld, listAdminTlds, type AdminTldPricing } from "@/features/admin";
import { useRequireAuth } from "@/features/auth";
import { formatMoney } from "@/lib/i18n/format";
import { useAuthStore } from "@/stores/auth-store";
import { toast } from "@/stores/toast-store";

export default function AdminTldsPage(): React.ReactElement | null {
  useRequireAuth();
  const locale = useLocale();
  const t = useTranslations("admin");
  const tp = useTranslations("admin.pages.tldPricing");
  const tu = useTranslations("ui");
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const [tlds, setTlds] = useState<AdminTldPricing[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    listAdminTlds()
      .then(setTlds)
      .finally(() => setLoading(false));

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  if (!isAdmin) return <p className="text-on-surface-variant">{tp("adminOnly")}</p>;

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
            href="/t4abriz/panel/domains/tlds/new"
            className="inline-flex h-10 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary"
          >
            {tp("add")}
          </Link>
        }
      />
      <DataTable
        data={tlds as unknown as Record<string, unknown>[]}
        loading={loading}
        emptyMessage={tu("noRecords")}
        getRowKey={(row) => String(row.id)}
        columns={[
          {
            key: "tld",
            header: "TLD",
            sortable: true,
            render: (row) => {
              const tld = row as unknown as AdminTldPricing;
              return (
                <Link
                  href={`/t4abriz/panel/domains/tlds/${tld.id}`}
                  className="font-medium text-secondary hover:underline"
                >
                  .{tld.tld}
                </Link>
              );
            },
          },
          {
            key: "registerPrice",
            header: "Register",
            render: (row) => formatMoney((row as unknown as AdminTldPricing).registerPrice, "USD", locale),
          },
          {
            key: "renewPrice",
            header: "Renew",
            render: (row) => formatMoney((row as unknown as AdminTldPricing).renewPrice, "USD", locale),
          },
          {
            key: "transferPrice",
            header: "Transfer",
            render: (row) => formatMoney((row as unknown as AdminTldPricing).transferPrice, "USD", locale),
          },
          {
            key: "isActive",
            header: tu("table.status"),
            render: (row) => (
              <StatusBadge status={(row as unknown as AdminTldPricing).isActive ? "ACTIVE" : "SUSPENDED"} />
            ),
          },
          {
            key: "actions",
            header: "",
            render: (row) => {
              const tld = row as unknown as AdminTldPricing;
              return (
                <button
                  type="button"
                  className="text-sm text-error hover:underline"
                  onClick={async () => {
                    if (!confirm(`${t("actions.delete")} .${tld.tld}?`)) return;
                    try {
                      await deleteAdminTld(tld.id);
                      toast("TLD deleted", "success");
                      load();
                    } catch {
                      toast("Could not delete TLD", "error");
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
      {!loading && tlds.length === 0 && (
        <EmptyState title={tp("empty")} actionLabel={tp("add")} actionHref="/t4abriz/panel/domains/tlds/new" />
      )}
    </div>
  );
}
